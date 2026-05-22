# Chat/Messaging routes
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPAuthorizationCredentials
from datetime import datetime, timezone
import uuid

from core.database import db
from core.auth import (
    get_current_user,
    require_vendor,
    require_dropshipper,
    decode_token,
    security
)
from models.schemas import ConversationCreate, MessageCreate

router = APIRouter(prefix="/conversations", tags=["Chat"])

# Import manager from main server (will be set by server.py)
manager = None


def set_manager(mgr):
    """Set the WebSocket manager - called from server.py"""
    global manager
    manager = mgr


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
        # Dropshipped product - chat with dropshipper
        dp = await db.dropshipped_products.find_one({"id": data.dropshipped_product_id}, {"_id": 0})
        if not dp:
            raise HTTPException(status_code=404, detail="Produit non trouvé")
        seller_id = dp["dropshipper_id"]
        seller_type = "dropshipper"
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
        {"conversation_id": conversation_id}, {"_id": 0}
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
async def delete_message(conversation_id: str, message_id: str, user: dict = Depends(get_current_user)):
    """Delete a message from a conversation"""
    conversation = await db.conversations.find_one({"id": conversation_id}, {"_id": 0})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation non trouvée")

    if conversation["customer_id"] != user["id"] and conversation["seller_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    message = await db.messages.find_one({"id": message_id, "conversation_id": conversation_id}, {"_id": 0})
    if not message:
        raise HTTPException(status_code=404, detail="Message non trouvé")

    await db.messages.delete_one({"id": message_id})

    last_msg = await db.messages.find(
        {"conversation_id": conversation_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(1)

    if last_msg:
        await db.conversations.update_one(
            {"id": conversation_id},
            {"$set": {
                "last_message": last_msg[0].get("content", "")[:100],
                "last_message_at": last_msg[0].get("created_at"),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    else:
        await db.conversations.update_one(
            {"id": conversation_id},
            {"$set": {
                "last_message": None,
                "last_message_at": None,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )

    if manager:
        await manager.broadcast_to_room(f"chat_{conversation_id}", {
            "type": "message_deleted",
            "message_id": message_id
        })

    return {"detail": "Message supprimé"}


@router.delete("/{conversation_id}")
async def delete_conversation(conversation_id: str, user: dict = Depends(get_current_user)):
    """Delete a conversation and all its messages"""
    conversation = await db.conversations.find_one({"id": conversation_id}, {"_id": 0})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation non trouvée")

    if conversation["customer_id"] != user["id"] and conversation["seller_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    await db.messages.delete_many({"conversation_id": conversation_id})
    await db.conversations.delete_one({"id": conversation_id})

    return {"detail": "Conversation supprimée"}


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
    
    return conversations
