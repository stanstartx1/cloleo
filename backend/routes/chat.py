# Chat/Messaging routes
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.security import HTTPAuthorizationCredentials
from datetime import datetime, timezone
import uuid
import os
from pathlib import Path
from bson import ObjectId

from core.database import db
from core.auth import (
    get_current_user,
    require_vendor,
    require_dropshipper,
    require_revendeur,
    require_driver,
    decode_token,
    security
)
from models.schemas import ConversationCreate, MessageCreate, MessageMediaCreate

router = APIRouter(prefix="/conversations", tags=["Chat"])

# Import manager from main server (will be set by server.py)
manager = None


def set_manager(mgr):
    """Set the WebSocket manager - called from server.py"""
    global manager
    manager = mgr


def convert_objectid_to_str(data):
    """Convert MongoDB ObjectId to string recursively"""
    if isinstance(data, dict):
        return {k: convert_objectid_to_str(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [convert_objectid_to_str(item) for item in data]
    elif isinstance(data, ObjectId):
        return str(data)
    else:
        return data


def _message_not_deleted_filter():
    return {"$or": [{"deleted_at": None}, {"deleted_at": {"$exists": False}}]}


async def _refresh_conversation_last_message(conversation_id: str):
    """Update conversation preview from latest non-deleted message."""
    last = await db.messages.find_one(
        {"conversation_id": conversation_id, **_message_not_deleted_filter()},
        {"_id": 0},
        sort=[("created_at", -1)],
    )
    if last:
        preview = (last.get("content") or last.get("text") or "")[:100]
        await db.conversations.update_one(
            {"id": conversation_id},
            {
                "$set": {
                    "last_message": preview,
                    "last_message_at": last.get("created_at"),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            },
        )
    else:
        await db.conversations.update_one(
            {"id": conversation_id},
            {
                "$set": {
                    "last_message": None,
                    "last_message_at": None,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            },
        )


@router.post("/start")
async def start_conversation(
    data: ConversationCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Start a new conversation about a product"""
    user = None
    if credentials:
        try:
            payload = decode_token(credentials.credentials)
            user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        except:
            pass
    
    if not user:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    seller_id = None
    seller_type = None
    product_name = None
    product_image = None
    product_price_fcfa = None
    product_promo_price_fcfa = None
    
    # Determine who to chat with based on product type
    if data.dropshipped_product_id:
        # Dropshipped product - chat with ORIGINAL VENDOR (not dropshipper)
        dp = await db.dropshipped_products.find_one({"id": data.dropshipped_product_id}, {"_id": 0})
        if not dp:
            raise HTTPException(status_code=404, detail="Produit non trouvé")
        
        # Chat with the original vendor, not the dropshipper
        seller_id = dp.get("original_vendor_id")
        if not seller_id:
            # Fallback to dropshipper if original_vendor_id not set (for backward compatibility)
            seller_id = dp["dropshipper_id"]
            seller_type = "dropshipper"
        else:
            seller_type = "vendor"
        
        product_name = dp.get("original_name")
        product_image = dp.get("original_images", [None])[0]
        product_price_fcfa = dp.get("original_price_fcfa")
        product_promo_price_fcfa = dp.get("original_promo_price_fcfa") or dp.get("selling_price_fcfa")
        product_id = data.dropshipped_product_id
        
    elif data.product_id:
        # Original product - chat with vendor
        product = await db.products.find_one({"id": data.product_id}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail="Produit non trouvé")
        seller_id = product["seller_id"]
        seller_type = "vendor"
        product_name = product["name"]
        product_image = product.get("images", [None])[0]
        product_price_fcfa = product.get("price_fcfa")
        product_promo_price_fcfa = product.get("promo_price_fcfa")
        product_id = data.product_id
    else:
        raise HTTPException(status_code=400, detail="product_id ou dropshipped_product_id requis")
    
    # Check if conversation already exists
    existing = await db.conversations.find_one({
        "customer_id": user["id"],
        "seller_id": seller_id,
        "product_id": product_id
    }, {"_id": 0})
    
    if existing:
        return existing
    
    # Get seller info
    seller = await db.users.find_one({"id": seller_id}, {"_id": 0, "password": 0})
    
    conversation = {
        "id": str(uuid.uuid4()),
        "product_id": product_id,
        "product_name": product_name,
        "product_image": product_image,
        "product_price_fcfa": product_price_fcfa,
        "product_promo_price_fcfa": product_promo_price_fcfa,
        "customer_id": user["id"],
        "customer_name": user.get("name"),
        "customer_email": user.get("email"),
        "seller_id": seller_id,
        "seller_name": seller.get("shop_name") or seller.get("name") if seller else "Vendeur",
        "seller_shop_slug": seller.get("shop_slug") if seller else None,
        "seller_type": seller_type,
        "last_message": None,
        "last_message_at": None,
        "unread_customer": 0,
        "unread_seller": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.conversations.insert_one(conversation)
    conversation.pop("_id", None)
    return conversation


@router.post("/direct/{recipient_id}")
async def start_direct_conversation(recipient_id: str, user: dict = Depends(get_current_user)):
    """Start or reopen a private conversation between two forum members.

    Direct forum discussions are deliberately separate from product questions.
    The canonical participant key prevents duplicate conversations when either
    member initiates the chat.
    """
    if recipient_id == user["id"]:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas vous écrire à vous-même")

    recipient = await db.users.find_one(
        {"id": recipient_id},
        {"_id": 0, "id": 1, "name": 1, "shop_name": 1, "shop_slug": 1, "role": 1, "profile_photo": 1},
    )
    if not recipient:
        raise HTTPException(status_code=404, detail="Membre introuvable")

    allowed_roles = {"vendor", "enterprise", "admin"}
    if user.get("role") not in allowed_roles or recipient.get("role") not in allowed_roles:
        raise HTTPException(status_code=403, detail="Le chat direct du forum est réservé aux membres professionnels")

    participant_ids = sorted([user["id"], recipient_id])
    direct_key = f"forum-direct:{participant_ids[0]}:{participant_ids[1]}"
    existing = await db.conversations.find_one({"direct_key": direct_key}, {"_id": 0})
    if existing:
        return existing

    now = datetime.now(timezone.utc).isoformat()
    conversation = {
        "id": str(uuid.uuid4()),
        "kind": "forum_direct",
        "direct_key": direct_key,
        "product_id": direct_key,
        "product_name": "Discussion privée du forum",
        "product_image": None,
        "customer_id": user["id"],
        "customer_name": user.get("shop_name") or user.get("name") or "Membre",
        "customer_email": user.get("email"),
        "seller_id": recipient_id,
        "seller_name": recipient.get("shop_name") or recipient.get("name") or "Membre",
        "seller_avatar": recipient.get("profile_photo"),
        "seller_shop_slug": recipient.get("shop_slug"),
        "seller_type": recipient.get("role", "vendor"),
        "last_message": None,
        "last_message_at": None,
        "unread_customer": 0,
        "unread_seller": 0,
        "created_at": now,
        "updated_at": now,
    }
    await db.conversations.insert_one(conversation)
    return conversation


@router.get("")
async def get_my_conversations(user: dict = Depends(get_current_user)):
    """Get all conversations for current user"""
    query = {"$or": [
        {"customer_id": user["id"]},
        {"seller_id": user["id"]}
    ]}
    
    conversations = await db.conversations.find(query, {"_id": 0}).sort("updated_at", -1).to_list(100)
    
    for conv in conversations:
        conv["is_seller"] = conv["seller_id"] == user["id"]
        conv["other_party_name"] = conv["seller_name"] if conv["customer_id"] == user["id"] else conv["customer_name"]
        conv["unread_count"] = conv["unread_seller"] if conv["seller_id"] == user["id"] else conv["unread_customer"]
        conv["other_participant"] = {
            "name": conv["other_party_name"],
            "id": conv["seller_id"] if conv["customer_id"] == user["id"] else conv["customer_id"],
            "role": conv.get("seller_type", "vendor") if conv["customer_id"] == user["id"] else "customer"
        }
        # Add seller avatar if not present
        if "seller_avatar" not in conv and conv.get("seller_id"):
            seller = await db.users.find_one({"id": conv["seller_id"]}, {"_id": 0, "profile_photo": 1})
            if seller:
                conv["seller_avatar"] = seller.get("profile_photo")
    
    return {"conversations": conversations}


@router.get("/{conversation_id}")
async def get_conversation(conversation_id: str, user: dict = Depends(get_current_user)):
    """Get a specific conversation with messages"""
    conversation = await db.conversations.find_one({"id": conversation_id}, {"_id": 0})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation non trouvée")
    
    if conversation["customer_id"] != user["id"] and conversation["seller_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    messages = await db.messages.find(
        {"conversation_id": conversation_id, **_message_not_deleted_filter()},
        {"_id": 0},
    ).sort("created_at", 1).to_list(500)
    
    # Mark messages as read
    is_seller = conversation["seller_id"] == user["id"]
    if is_seller:
        await db.conversations.update_one({"id": conversation_id}, {"$set": {"unread_seller": 0}})
        await db.messages.update_many(
            {"conversation_id": conversation_id, "sender_id": {"$ne": user["id"]}, "is_read": False},
            {"$set": {"is_read": True}}
        )
    else:
        await db.conversations.update_one({"id": conversation_id}, {"$set": {"unread_customer": 0}})
        await db.messages.update_many(
            {"conversation_id": conversation_id, "sender_id": {"$ne": user["id"]}, "is_read": False},
            {"$set": {"is_read": True}}
        )
    
    return {"conversation": conversation, "messages": messages}


@router.post("/{conversation_id}/messages")
async def send_message(conversation_id: str, data: MessageCreate, user: dict = Depends(get_current_user)):
    """Send a message in a conversation"""
    conversation = await db.conversations.find_one({"id": conversation_id}, {"_id": 0})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation non trouvée")
    
    if conversation["customer_id"] != user["id"] and conversation["seller_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    is_seller = conversation["seller_id"] == user["id"]
    
    message = {
        "id": str(uuid.uuid4()),
        "conversation_id": conversation_id,
        "sender_id": user["id"],
        "sender_name": user.get("shop_name") or user.get("name"),
        "sender_type": "seller" if is_seller else "customer",
        "content": data.content,
        "text": data.content,
        "type": "text",
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.messages.insert_one(message)
    
    update_data = {
        "last_message": data.content[:100],
        "last_message_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if is_seller:
        await db.conversations.update_one(
            {"id": conversation_id},
            {"$set": update_data, "$inc": {"unread_customer": 1}}
        )
    else:
        await db.conversations.update_one(
            {"id": conversation_id},
            {"$set": update_data, "$inc": {"unread_seller": 1}}
        )
    
    # Broadcast via WebSocket if manager is available
    if manager:
        await manager.broadcast_to_room(f"chat_{conversation_id}", {
            "type": "new_message",
            "message": {k: v for k, v in message.items() if k != "_id"}
        })
    
    return {k: v for k, v in message.items() if k != "_id"}


@router.delete("/{conversation_id}/messages/{message_id}")
async def delete_message(
    conversation_id: str,
    message_id: str,
    user: dict = Depends(get_current_user),
):
    """Soft-delete a message (author only, conversation participant)."""
    conversation = await db.conversations.find_one({"id": conversation_id}, {"_id": 0})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation non trouvée")

    if conversation["customer_id"] != user["id"] and conversation["seller_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    message = await db.messages.find_one(
        {"id": message_id, "conversation_id": conversation_id},
        {"_id": 0},
    )
    if not message:
        raise HTTPException(status_code=404, detail="Message non trouvé")

    if message.get("deleted_at"):
        return {"ok": True, "message_id": message_id}

    if message.get("sender_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Vous ne pouvez supprimer que vos propres messages")

    deleted_at = datetime.now(timezone.utc).isoformat()
    await db.messages.update_one(
        {"id": message_id, "conversation_id": conversation_id},
        {"$set": {"deleted_at": deleted_at}},
    )

    await _refresh_conversation_last_message(conversation_id)

    if manager:
        await manager.broadcast_to_room(
            f"chat_{conversation_id}",
            {"type": "message_deleted", "message_id": message_id, "conversation_id": conversation_id},
        )

    return {"ok": True, "message_id": message_id, "deleted_at": deleted_at}


# Chat media upload endpoints
UPLOAD_DIR = Path(__file__).parent.parent / "uploads" / "chat"

def ensure_upload_dirs():
    """Ensure all upload directories exist"""
    dirs = [
        UPLOAD_DIR / "images",
        UPLOAD_DIR / "documents", 
        UPLOAD_DIR / "audio"
    ]
    for dir_path in dirs:
        try:
            dir_path.mkdir(parents=True, exist_ok=True)
            print(f"Upload directory ensured: {dir_path}")
        except Exception as e:
            print(f"Error creating directory {dir_path}: {e}")

# Ensure directories exist when module loads
ensure_upload_dirs()


@router.post("/{conversation_id}/upload-image")
async def upload_chat_image(
    conversation_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Upload an image in chat"""
    try:
        print(f"Starting image upload for conversation {conversation_id}")
        
        conversation = await db.conversations.find_one({"id": conversation_id}, {"_id": 0})
        if not conversation:
            print(f"Conversation {conversation_id} not found")
            raise HTTPException(status_code=404, detail="Conversation non trouvée")
        
        if conversation["customer_id"] != user["id"] and conversation["seller_id"] != user["id"]:
            print(f"User {user['id']} not authorized for conversation {conversation_id}")
            raise HTTPException(status_code=403, detail="Accès non autorisé")
        
        # Validate file type
        if file.content_type and not file.content_type.startswith("image/"):
            print(f"Invalid file type: {file.content_type}")
            raise HTTPException(status_code=400, detail="Seules les images sont acceptées")
        
        # Ensure upload directory exists
        images_dir = UPLOAD_DIR / "images"
        try:
            images_dir.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            print(f"Error creating images directory: {e}")
            raise HTTPException(status_code=500, detail="Erreur de configuration du serveur")
        
        # Generate unique filename
        file_extension = file.filename.split(".")[-1] if "." in file.filename else "jpg"
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        file_path = images_dir / unique_filename
        
        # Save file
        try:
            content = await file.read()
            with open(file_path, "wb") as buffer:
                buffer.write(content)
            print(f"Image saved successfully: {file_path}")
        except Exception as e:
            print(f"Error saving file: {e}")
            raise HTTPException(status_code=500, detail=f"Erreur lors de la sauvegarde: {str(e)}")
        
        file_url = f"/uploads/chat/images/{unique_filename}"
        
        # Create message with image
        message = {
            "id": str(uuid.uuid4()),
            "conversation_id": conversation_id,
            "sender_id": user["id"],
            "sender_type": "customer" if conversation["customer_id"] == user["id"] else "seller",
            "media_type": "image",
            "file_url": file_url,
            "file_name": file.filename,
            "is_read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.messages.insert_one(message)
        await _refresh_conversation_last_message(conversation_id)
        
        # Notify via WebSocket
        if manager:
            try:
                await manager.broadcast_to_room(f"chat_{conversation_id}", {
                    "type": "new_message",
                    "message": message
                })
            except Exception as ws_error:
                print(f"WebSocket notification error: {ws_error}")
        
        print(f"Image upload successful: {message['id']}")
        
        # Convert ObjectId to string before returning
        message = convert_objectid_to_str(message)
        
        # Convert ObjectId to string before returning
        message = convert_objectid_to_str(message)
        
        return {"ok": True, "message": message}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error uploading chat image: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'upload: {str(e)}")


@router.post("/{conversation_id}/upload-document")
async def upload_chat_document(
    conversation_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Upload a document in chat"""
    try:
        conversation = await db.conversations.find_one({"id": conversation_id}, {"_id": 0})
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation non trouvée")
        
        if conversation["customer_id"] != user["id"] and conversation["seller_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Accès non autorisé")
        
        # Validate file type (PDF, DOC, DOCX, etc.)
        allowed_types = [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain"
        ]
        
        if not file.content_type or file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Type de fichier non supporté")
        
        # Generate unique filename
        file_extension = file.filename.split(".")[-1] if "." in file.filename else "pdf"
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        file_path = UPLOAD_DIR / "documents" / unique_filename
        (UPLOAD_DIR / "documents").mkdir(parents=True, exist_ok=True)
        
        # Save file
        content = await file.read()
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        
        file_url = f"/uploads/chat/documents/{unique_filename}"
        
        # Create message with document
        message = {
            "id": str(uuid.uuid4()),
            "conversation_id": conversation_id,
            "sender_id": user["id"],
            "sender_type": "customer" if conversation["customer_id"] == user["id"] else "seller",
            "media_type": "document",
            "file_url": file_url,
            "file_name": file.filename,
            "file_size": len(content),
            "is_read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.messages.insert_one(message)
        await _refresh_conversation_last_message(conversation_id)
        
        # Notify via WebSocket
        if manager:
            await manager.broadcast_to_room(f"chat_{conversation_id}", {
                "type": "new_message",
                "message": message
            })
        
        # Convert ObjectId to string before returning
        message = convert_objectid_to_str(message)
        
        return {"ok": True, "message": message}
    except Exception as e:
        print(f"Error uploading chat document: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'upload: {str(e)}")


@router.post("/{conversation_id}/upload-audio")
async def upload_chat_audio(
    conversation_id: str,
    file: UploadFile = File(...),
    duration: int = 0,
    user: dict = Depends(get_current_user)
):
    """Upload an audio file in chat"""
    try:
        print(f"Starting audio upload for conversation {conversation_id}")
        
        conversation = await db.conversations.find_one({"id": conversation_id}, {"_id": 0})
        if not conversation:
            print(f"Conversation {conversation_id} not found")
            raise HTTPException(status_code=404, detail="Conversation non trouvée")
        
        if conversation["customer_id"] != user["id"] and conversation["seller_id"] != user["id"]:
            print(f"User {user['id']} not authorized for conversation {conversation_id}")
            raise HTTPException(status_code=403, detail="Accès non autorisé")
        
        # Validate file type - be more permissive with audio types
        if file.content_type and not file.content_type.startswith("audio/"):
            print(f"Invalid file type: {file.content_type}")
            raise HTTPException(status_code=400, detail="Seuls les fichiers audio sont acceptés")
        
        # Ensure upload directory exists
        audio_dir = UPLOAD_DIR / "audio"
        try:
            audio_dir.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            print(f"Error creating audio directory: {e}")
            raise HTTPException(status_code=500, detail="Erreur de configuration du serveur")
        
        # Generate unique filename
        file_extension = file.filename.split(".")[-1] if "." in file.filename else "mp3"
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        file_path = audio_dir / unique_filename
        
        # Save file
        try:
            content = await file.read()
            with open(file_path, "wb") as buffer:
                buffer.write(content)
            print(f"Audio saved successfully: {file_path}")
        except Exception as e:
            print(f"Error saving file: {e}")
            raise HTTPException(status_code=500, detail=f"Erreur lors de la sauvegarde: {str(e)}")
        
        file_url = f"/uploads/chat/audio/{unique_filename}"
        
        # Create message with audio
        message = {
            "id": str(uuid.uuid4()),
            "conversation_id": conversation_id,
            "sender_id": user["id"],
            "sender_type": "customer" if conversation["customer_id"] == user["id"] else "seller",
            "media_type": "audio",
            "file_url": file_url,
            "file_name": file.filename,
            "file_size": len(content),
            "duration": duration,
            "is_read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.messages.insert_one(message)
        await _refresh_conversation_last_message(conversation_id)
        
        # Notify via WebSocket
        if manager:
            try:
                await manager.broadcast_to_room(f"chat_{conversation_id}", {
                    "type": "new_message",
                    "message": message
                })
            except Exception as ws_error:
                print(f"WebSocket notification error: {ws_error}")
        
        print(f"Audio upload successful: {message['id']}")
        
        # Convert ObjectId to string before returning
        message = convert_objectid_to_str(message)
        
        # Convert ObjectId to string before returning
        message = convert_objectid_to_str(message)
        
        return {"ok": True, "message": message}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error uploading chat audio: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'upload: {str(e)}")


# ==================== TYPING & VOICE RECORDING INDICATORS ====================

@router.post("/{conversation_id}/typing")
async def set_typing_status(
    conversation_id: str,
    is_typing: bool = True,
    user: dict = Depends(get_current_user)
):
    """Set typing status for the current user in a conversation"""
    if manager:
        try:
            manager.set_typing(conversation_id, user["id"], is_typing)
            await manager.broadcast_typing_status(conversation_id, user["id"], is_typing)
            return {"ok": True, "is_typing": is_typing}
        except Exception as e:
            print(f"Error setting typing status: {e}")
            raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")
    return {"ok": True, "is_typing": is_typing}


@router.get("/{conversation_id}/typing-users")
async def get_typing_users(
    conversation_id: str,
    user: dict = Depends(get_current_user)
):
    """Get list of users currently typing in a conversation"""
    if manager:
        try:
            typing_users = manager.get_typing_users(conversation_id)
            # Filter out the current user
            typing_users = [uid for uid in typing_users if uid != user["id"]]
            
            # Get user details for typing users
            typing_users_details = []
            for uid in typing_users:
                user_detail = await db.users.find_one({"id": uid}, {"_id": 0, "name": 1, "profile_photo": 1})
                if user_detail:
                    typing_users_details.append(user_detail)
            
            return {"ok": True, "typing_users": typing_users_details}
        except Exception as e:
            print(f"Error getting typing users: {e}")
            raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")
    return {"ok": True, "typing_users": []}


@router.post("/{conversation_id}/voice-recording")
async def set_voice_recording_status(
    conversation_id: str,
    is_recording: bool = True,
    user: dict = Depends(get_current_user)
):
    """Set voice recording status for the current user in a conversation"""
    if manager:
        try:
            manager.set_voice_recording(conversation_id, user["id"], is_recording)
            await manager.broadcast_voice_recording_status(conversation_id, user["id"], is_recording)
            return {"ok": True, "is_recording": is_recording}
        except Exception as e:
            print(f"Error setting voice recording status: {e}")
            raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")
    return {"ok": True, "is_recording": is_recording}


@router.get("/{conversation_id}/voice-recording-users")
async def get_voice_recording_users(
    conversation_id: str,
    user: dict = Depends(get_current_user)
):
    """Get list of users currently recording voice in a conversation"""
    if manager:
        try:
            recording_users = manager.get_voice_recording_users(conversation_id)
            # Filter out the current user
            recording_users = [uid for uid in recording_users if uid != user["id"]]
            
            # Get user details for recording users
            recording_users_details = []
            for uid in recording_users:
                user_detail = await db.users.find_one({"id": uid}, {"_id": 0, "name": 1, "profile_photo": 1})
                if user_detail:
                    recording_users_details.append(user_detail)
            
            return {"ok": True, "recording_users": recording_users_details}
        except Exception as e:
            print(f"Error getting voice recording users: {e}")
            raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")
    return {"ok": True, "recording_users": []}


# Vendor-specific routes
vendor_chat_router = APIRouter(prefix="/vendor/conversations", tags=["Vendor Chat"])


@vendor_chat_router.get("")
async def vendor_get_conversations(user: dict = Depends(require_vendor)):
    """Get all conversations for vendor"""
    conversations = await db.conversations.find(
        {"seller_id": user["id"], "seller_type": "vendor"}, {"_id": 0}
    ).sort("updated_at", -1).to_list(100)
    
    for conv in conversations:
        conv["unread_count"] = conv.get("unread_seller", 0)
        # Add seller avatar if not present
        if "seller_avatar" not in conv and conv.get("seller_id"):
            seller = await db.users.find_one({"id": conv["seller_id"]}, {"_id": 0, "profile_photo": 1})
            if seller:
                conv["seller_avatar"] = seller.get("profile_photo")
    
    return conversations


# Dropshipper-specific routes
dropshipper_chat_router = APIRouter(prefix="/dropshipper/conversations", tags=["Dropshipper Chat"])


@dropshipper_chat_router.get("")
async def dropshipper_get_conversations(user: dict = Depends(require_dropshipper)):
    """Get all conversations for dropshipper"""
    conversations = await db.conversations.find(
        {"seller_id": user["id"], "seller_type": "dropshipper"}, {"_id": 0}
    ).sort("updated_at", -1).to_list(100)
    
    for conv in conversations:
        conv["unread_count"] = conv.get("unread_seller", 0)
        # Add seller avatar if not present
        if "seller_avatar" not in conv and conv.get("seller_id"):
            seller = await db.users.find_one({"id": conv["seller_id"]}, {"_id": 0, "profile_photo": 1})
            if seller:
                conv["seller_avatar"] = seller.get("profile_photo")
    
    return conversations


# Revendeur-specific routes
revendeur_chat_router = APIRouter(prefix="/revendeur/conversations", tags=["Revendeur Chat"])


@revendeur_chat_router.get("")
async def revendeur_get_conversations(user: dict = Depends(require_revendeur)):
    """Get all conversations for revendeur"""
    # Support both "revendeur" and "dropshipper" seller_type for backwards compatibility
    conversations = await db.conversations.find(
        {"seller_id": user["id"], "seller_type": {"$in": ["revendeur", "dropshipper"]}}, {"_id": 0}
    ).sort("updated_at", -1).to_list(100)
    
    for conv in conversations:
        conv["unread_count"] = conv.get("unread_seller", 0)
        # Add seller avatar if not present
        if "seller_avatar" not in conv and conv.get("seller_id"):
            seller = await db.users.find_one({"id": conv["seller_id"]}, {"_id": 0, "profile_photo": 1})
            if seller:
                conv["seller_avatar"] = seller.get("profile_photo")
    
    return conversations


# Driver-specific routes
driver_chat_router = APIRouter(prefix="/driver/conversations", tags=["Driver Chat"])


@driver_chat_router.get("")
async def driver_get_conversations(user: dict = Depends(require_driver)):
    """Get all conversations for driver"""
    conversations = await db.conversations.find(
        {"seller_id": user["id"], "seller_type": "driver"}, {"_id": 0}
    ).sort("updated_at", -1).to_list(100)
    
    for conv in conversations:
        conv["unread_count"] = conv.get("unread_seller", 0)
        # Add seller avatar if not present
        if "seller_avatar" not in conv and conv.get("seller_id"):
            seller = await db.users.find_one({"id": conv["seller_id"]}, {"_id": 0, "profile_photo": 1})
            if seller:
                conv["seller_avatar"] = seller.get("profile_photo")
    
    return conversations
