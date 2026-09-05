"""Order-based tripartite chat: client ↔ vendor ↔ driver."""
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
import uuid
import logging
import sys

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from core.auth import get_current_user
from core.database import db
from core.audit_log import log_audit
from core.notification_channels import notify_user_all_channels

router = APIRouter(prefix="/chat", tags=["Delivery Chat"])

_manager = None

# Set up logging for this module
logger = logging.getLogger(__name__)

# Ensure logger outputs to stdout
if not logger.handlers:
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.INFO)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

# Cloleo system user ID for automated messages
CLOLEO_SYSTEM_USER_ID = "cloleo-system-00000000-0000-0000-0000-000000000000"
CLOLEO_SYSTEM_NAME = "Cloleo"


def set_manager(mgr):
    global _manager
    _manager = mgr


def _utc():
    return datetime.now(timezone.utc).isoformat()


async def _get_order_participants(order_id: str) -> dict:
    logger.info(f"🔍 [PARTICIPANTS] Getting participants for order {order_id}")
    order = await db.orders.find_one({"id": order_id, "is_deleted": {"$ne": True}}, {"_id": 0})
    if not order:
        logger.error(f"❌ [PARTICIPANTS] Order {order_id} not found")
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    logger.info(f"✅ [PARTICIPANTS] Order found: customer_id={order.get('customer_id')}, seller_id={order.get('seller_id')}, driver_id={order.get('driver_id')}")
    return {
        "order": order,
        "customer_id": order.get("customer_id"),
        "seller_id": order.get("seller_id"),
        "driver_id": order.get("driver_id"),
    }


def _can_access(user: dict, participants: dict, recipient_type: Optional[str] = None) -> bool:
    uid = user["id"]
    role = user.get("role")
    if role == "admin":
        return True
    if uid == participants.get("customer_id"):
        return True
    if uid == participants.get("seller_id") and role in ("vendor", "enterprise"):
        return True
    if uid == participants.get("driver_id") and role == "driver":
        return True
    if participants.get("order", {}).get("dropshipper_id") == uid:
        return True
    return False


def _recipient_ids(participants: dict, sender_id: str, requested_id: Optional[str]) -> list[str]:
    """Return only valid recipients for an order conversation.

    A client, seller or driver may address one of the other order participants.
    When no recipient is specified, the message is delivered to the other
    participants (the group-conversation behaviour used by the existing UI).
    """
    participant_ids = set(participants.get("order", {}).get("participants") or [])
    participant_ids.update(
        p for p in (participants.get("customer_id"), participants.get("seller_id"), participants.get("driver_id")) if p
    )
    participant_ids.discard(sender_id)
    if requested_id:
        if requested_id not in participant_ids:
            raise HTTPException(status_code=400, detail="Destinataire invalide pour cette commande")
        return [requested_id]
    return list(participant_ids)


def _validate_location(location: dict) -> dict:
    try:
        latitude = float(location.get("latitude"))
        longitude = float(location.get("longitude"))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Coordonnées GPS requises")
    if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
        raise HTTPException(status_code=400, detail="Coordonnées GPS invalides")
    result = {"latitude": latitude, "longitude": longitude}
    if location.get("accuracy") is not None:
        try:
            result["accuracy"] = max(0, float(location["accuracy"]))
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="Précision GPS invalide")
    return result


async def _ensure_order_conversation(order_id: str, participants: dict) -> dict:
    logger.info(f"🔍 [CONV DEBUG] Ensuring conversation for order {order_id}")
    conv = await db.delivery_conversations.find_one({"order_id": order_id}, {"_id": 0})
    if conv:
        logger.info(f"✅ [CONV DEBUG] Conversation exists: {conv['id']}")
        return conv
    logger.warning(f"⚠️  [CONV DEBUG] Creating new conversation for order {order_id}")

    # Build participants list safely - include all available participants
    participant_list = []
    customer_id = participants.get("customer_id")
    seller_id = participants.get("seller_id")
    driver_id = participants.get("driver_id")

    if customer_id:
        participant_list.append(customer_id)
    if seller_id:
        participant_list.append(seller_id)
    if driver_id:
        participant_list.append(driver_id)

    logger.info(f"📝 [CONV DEBUG] Building conversation with participants: {participant_list}")

    conv = {
        "id": str(uuid.uuid4()),
        "order_id": order_id,
        "customer_id": customer_id,
        "seller_id": seller_id,
        "driver_id": driver_id,
        "participants": participant_list,
        "created_at": _utc(),
        "updated_at": _utc(),
    }
    logger.info(f"📝 [CONV DEBUG] Conversation data: customer_id={conv['customer_id']}, seller_id={conv['seller_id']}, driver_id={conv['driver_id']}, participants={participant_list}")
    await db.delivery_conversations.insert_one(conv)
    logger.info(f"✅ [CONV DEBUG] Conversation created: {conv['id']}")
    return conv


@router.get("/conversation/{order_id}")
async def get_order_conversation(order_id: str, user: dict = Depends(get_current_user)):
    logger.error(f"🚨🚨🚨 [NEW CODE DEPLOYED] get_order_conversation called - NEW VERSION ACTIVE 🚨🚨🚨")
    try:
        logger.info(f"🔍 [CONV GET] Getting conversation for order {order_id}, user {user['id']}")
        participants = await _get_order_participants(order_id)
        logger.info(f"🔍 [CONV GET] Participants: {participants}")
        if not _can_access(user, participants):
            logger.warning(f"⚠️  [CONV GET] User {user['id']} cannot access order {order_id}")
            raise HTTPException(status_code=403, detail="Accès non autorisé")
        conv = await _ensure_order_conversation(order_id, participants)
        logger.info(f"✅ [CONV GET] Conversation retrieved: {conv['id']}")
        messages = await db.delivery_messages.find(
            {"order_id": order_id}, {"_id": 0}
        ).sort("created_at", 1).to_list(500)
        logger.info(f"✅ [CONV GET] Messages retrieved: {len(messages)}")
        # Convert ObjectId to string to avoid JSON serialization error
        from bson import ObjectId
        def convert_objid(obj):
            if isinstance(obj, ObjectId):
                return str(obj)
            elif isinstance(obj, dict):
                return {k: convert_objid(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_objid(item) for item in obj]
            return obj
        conv_clean = convert_objid(conv)
        messages_clean = convert_objid(messages)
        return {"conversation": conv_clean, "messages": messages_clean, "order_id": order_id}
    except Exception as e:
        logger.error(f"❌ [CONV GET] Error getting conversation: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération de la conversation: {str(e)}")


@router.post("/send")
async def send_order_message(payload: dict, user: dict = Depends(get_current_user)):
    order_id = payload.get("order_id")
    if not order_id:
        raise HTTPException(status_code=400, detail="order_id requis")
    participants = await _get_order_participants(order_id)
    if not _can_access(user, participants):
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    message_type = payload.get("message_type", "text")
    if message_type not in {"text", "image", "location"}:
        raise HTTPException(status_code=400, detail="Type de message non pris en charge")
    content = str(payload.get("content", "")).strip()
    if message_type == "text" and not content:
        raise HTTPException(status_code=400, detail="Le message ne peut pas être vide")
    if len(content) > 4000:
        raise HTTPException(status_code=400, detail="Message trop long")
    attachment = payload.get("attachment")
    location = payload.get("location")
    recipients = _recipient_ids(participants, user["id"], payload.get("recipient_id"))
    if location is not None:
        location = _validate_location(location)

    msg = {
        "id": str(uuid.uuid4()),
        "order_id": order_id,
        "conversation_id": (await _ensure_order_conversation(order_id, participants))["id"],
        "sender_id": user["id"],
        "sender_name": user.get("name", "Utilisateur"),
        "sender_role": user.get("role"),
        "recipient_id": recipients[0] if len(recipients) == 1 else None,
        "recipient_type": payload.get("recipient_type"),
        "message_type": message_type,
        "content": content,
        "attachment": attachment,
        "location": location,
        "read": False,
        "created_at": _utc(),
    }
    await db.delivery_messages.insert_one(msg)
    await db.delivery_conversations.update_one(
        {"order_id": order_id},
        {"$set": {"last_message": content[:100], "updated_at": _utc()}},
    )

    clean = {k: v for k, v in msg.items() if k != "_id"}
    if _manager:
        await _manager.broadcast_to_room(f"order_chat_{order_id}", {
            "type": "new_message",
            "message": clean,
        })
        for pid in recipients:
            await _manager.send_to_user(pid, {"type": "chat_notification", "message": clean, "order_id": order_id})

    # Persist a notification even if the recipient has no open WebSocket.
    for pid in recipients:
        await notify_user_all_channels(
            pid,
            "Nouveau message",
            f"{user.get('name', 'Un utilisateur')}: {content[:120] or 'a partagé une pièce jointe'}",
            "chat_message",
            {"order_id": order_id, "message_id": msg["id"]},
        )

    return {"ok": True, "message": clean}


@router.post("/conversation/{order_id}/upload")
async def upload_chat_media(
    order_id: str,
    file: UploadFile = File(...),
    message_type: str = "image",
    user: dict = Depends(get_current_user),
):
    participants = await _get_order_participants(order_id)
    if not _can_access(user, participants):
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    allowed_types = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Seules les images JPEG, PNG et WebP sont acceptées")
    content = await file.read()
    if not content or len(content) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image vide ou supérieure à 8 Mo")
    ext = allowed_types[file.content_type]
    filename = f"order_chat_{order_id}_{uuid.uuid4().hex[:8]}{ext}"
    upload_dir = Path(__file__).resolve().parents[1] / "uploads" / "chat" / "orders"
    upload_dir.mkdir(parents=True, exist_ok=True)
    dest = upload_dir / filename
    dest.write_bytes(content)
    url = f"/uploads/chat/orders/{filename}"

    payload = {
        "order_id": order_id,
        "message_type": message_type,
        "content": "Photo du colis" if message_type == "image" else file.filename,
        "attachment": url,
    }
    return await send_order_message(payload, user)


@router.post("/conversation/{order_id}/location")
async def share_location(order_id: str, payload: dict, user: dict = Depends(get_current_user)):
    participants = await _get_order_participants(order_id)
    if not _can_access(user, participants):
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    location = payload.get("location") or {
        "latitude": payload.get("latitude"),
        "longitude": payload.get("longitude"),
        "accuracy": payload.get("accuracy"),
    }
    location = _validate_location(location)
    msg_payload = {
        "order_id": order_id,
        "message_type": "location",
        "content": "Position partagée",
        "location": location,
        "recipient_id": payload.get("recipient_id"),
        "recipient_type": payload.get("recipient_type"),
    }
    return await send_order_message(msg_payload, user)


@router.put("/conversation/{order_id}/read")
async def mark_messages_read(order_id: str, user: dict = Depends(get_current_user)):
    participants = await _get_order_participants(order_id)
    if not _can_access(user, participants):
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    await db.delivery_messages.update_many(
        {"order_id": order_id, "sender_id": {"$ne": user["id"]}, "read": False},
        {"$set": {"read": True, "read_at": _utc()}},
    )
    return {"ok": True}


async def send_system_delivery_pin_message(order_id: str, delivery_pin: str, order_number: str = None):
    """
    Send automated system message with delivery PIN to customer from Cloleo.
    This is called automatically when an order is assigned to a driver.
    """
    try:
        logger.info(f"🔍 [PIN DEBUG] Starting PIN message send for order {order_id}")
        logger.info(f"🔍 [PIN DEBUG] PIN to send: {delivery_pin}")
        
        order = await db.orders.find_one({"id": order_id, "is_deleted": {"$ne": True}}, {"_id": 0})
        if not order:
            logger.error(f"❌ [PIN DEBUG] Order {order_id} not found for PIN message")
            return {"ok": False, "error": "Order not found"}
        
        logger.info(f"✅ [PIN DEBUG] Order found: {order.get('order_number')}, status: {order.get('status')}")
        logger.info(f"✅ [PIN DEBUG] Order stored PIN: {order.get('delivery_pin')}")
        
        # Verify PIN consistency
        if order.get("delivery_pin") != delivery_pin:
            logger.error(f"❌ [PIN DEBUG] PIN MISMATCH! Order has {order.get('delivery_pin')} but trying to send {delivery_pin}")
            # Use the PIN from the order to ensure consistency
            delivery_pin = order.get("delivery_pin")
            logger.info(f"🔄 [PIN DEBUG] Using order PIN instead: {delivery_pin}")
        
        customer_id = order.get("customer_id")
        if not customer_id:
            logger.error(f"❌ [PIN DEBUG] No customer_id found for order {order_id}")
            return {"ok": False, "error": "No customer_id"}
        
        logger.info(f"✅ [PIN DEBUG] Customer ID: {customer_id}")
        
        # Ensure conversation exists
        participants = {
            "customer_id": customer_id,
            "seller_id": order.get("seller_id"),
            "driver_id": order.get("driver_id"),
            "order": order
        }
        conv = await _ensure_order_conversation(order_id, participants)
        logger.info(f"✅ [PIN DEBUG] Conversation ensured: {conv['id']}")
        
        # Create system message with delivery PIN
        system_message = {
            "id": str(uuid.uuid4()),
            "order_id": order_id,
            "conversation_id": conv["id"],
            "sender_id": CLOLEO_SYSTEM_USER_ID,
            "sender_name": CLOLEO_SYSTEM_NAME,
            "sender_role": "system",
            "recipient_id": customer_id,
            "recipient_type": "customer",
            "message_type": "text",
            "content": f"📦 Commande #{order_number or order_id}\n\nVotre code de livraison est : {delivery_pin}\n\nCommuniquez ce code au livreur pour confirmer la livraison.\n\n— Cloleo",
            "attachment": None,
            "location": None,
            "read": False,
            "is_system_message": True,
            "created_at": _utc(),
        }
        
        logger.info(f"✅ [PIN DEBUG] System message created: {system_message['id']}")
        
        # Insert message
        result = await db.delivery_messages.insert_one(system_message)
        logger.info(f"✅ [PIN DEBUG] Message inserted in DB, result: {result}")
        
        # Update conversation
        await db.delivery_conversations.update_one(
            {"order_id": order_id},
            {"$set": {"last_message": system_message["content"][:100], "updated_at": _utc()}},
        )
        logger.info(f"✅ [PIN DEBUG] Conversation updated")
        
        # Broadcast via WebSocket
        if _manager:
            clean_message = {k: v for k, v in system_message.items() if k != "_id"}
            logger.info(f"📡 [PIN DEBUG] Broadcasting to room order_chat_{order_id}")
            await _manager.broadcast_to_room(f"order_chat_{order_id}", {
                "type": "new_message",
                "message": clean_message,
            })
            logger.info(f"📡 [PIN DEBUG] Sending to user {customer_id}")
            await _manager.send_to_user(customer_id, {
                "type": "chat_notification", 
                "message": clean_message, 
                "order_id": order_id
            })
            # Also broadcast to customer's user room
            await _manager.broadcast_to_room(f"user_{customer_id}", {
                "type": "chat_notification",
                "message": clean_message,
                "order_id": order_id
            })
        else:
            logger.warning(f"⚠️  [PIN DEBUG] No WebSocket manager available")
        
        # Send notification
        logger.info(f"🔔 [PIN DEBUG] Sending notification to user {customer_id}")
        await notify_user_all_channels(
            customer_id,
            "Code de livraison",
            f"Votre code de livraison est : {delivery_pin}",
            "delivery_pin",
            {"order_id": order_id, "message_id": system_message["id"]},
        )
        
        # Fallback: Also store the PIN in the order document for direct retrieval
        # This ensures customer can get PIN even if chat message fails
        await db.orders.update_one(
            {"id": order_id},
            {"$set": {"delivery_pin_sent_via_chat": True, "delivery_pin_sent_at": _utc()}}
        )
        logger.info(f"✅ [PIN DEBUG] Marked PIN as sent in order document")
        
        logger.info(f"✅ [PIN DEBUG] Delivery PIN message sent successfully to customer {customer_id} for order {order_id}")
        return {"ok": True, "message": clean_message}
        
    except Exception as e:
        logger.error(f"❌ [PIN DEBUG] Error sending system PIN message: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return {"ok": False, "error": str(e)}
