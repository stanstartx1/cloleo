"""Order-based tripartite chat: client ↔ vendor ↔ driver."""
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from core.auth import get_current_user
from core.database import db
from core.audit_log import log_audit

router = APIRouter(prefix="/chat", tags=["Delivery Chat"])

_manager = None


def set_manager(mgr):
    global _manager
    _manager = mgr


def _utc():
    return datetime.now(timezone.utc).isoformat()


async def _get_order_participants(order_id: str) -> dict:
    order = await db.orders.find_one({"id": order_id, "is_deleted": {"$ne": True}}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
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


async def _ensure_order_conversation(order_id: str, participants: dict) -> dict:
    conv = await db.delivery_conversations.find_one({"order_id": order_id}, {"_id": 0})
    if conv:
        return conv
    conv = {
        "id": str(uuid.uuid4()),
        "order_id": order_id,
        "customer_id": participants.get("customer_id"),
        "seller_id": participants.get("seller_id"),
        "driver_id": participants.get("driver_id"),
        "participants": [p for p in [
            participants.get("customer_id"),
            participants.get("seller_id"),
            participants.get("driver_id"),
        ] if p],
        "created_at": _utc(),
        "updated_at": _utc(),
    }
    await db.delivery_conversations.insert_one(conv)
    return conv


@router.get("/conversation/{order_id}")
async def get_order_conversation(order_id: str, user: dict = Depends(get_current_user)):
    participants = await _get_order_participants(order_id)
    if not _can_access(user, participants):
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    conv = await _ensure_order_conversation(order_id, participants)
    messages = await db.delivery_messages.find(
        {"order_id": order_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    return {"conversation": conv, "messages": messages, "order_id": order_id}


@router.post("/send")
async def send_order_message(payload: dict, user: dict = Depends(get_current_user)):
    order_id = payload.get("order_id")
    if not order_id:
        raise HTTPException(status_code=400, detail="order_id requis")
    participants = await _get_order_participants(order_id)
    if not _can_access(user, participants):
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    message_type = payload.get("message_type", "text")
    content = payload.get("content", "")
    attachment = payload.get("attachment")
    location = payload.get("location")

    msg = {
        "id": str(uuid.uuid4()),
        "order_id": order_id,
        "conversation_id": (await _ensure_order_conversation(order_id, participants))["id"],
        "sender_id": user["id"],
        "sender_name": user.get("name", "Utilisateur"),
        "sender_role": user.get("role"),
        "recipient_id": payload.get("recipient_id"),
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
        for pid in participants.get("order", {}).get("customer_id"), participants.get("seller_id"), participants.get("driver_id"):
            if pid and pid != user["id"]:
                await _manager.send_to_user(pid, {"type": "chat_notification", "message": clean, "order_id": order_id})

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

    ext = Path(file.filename or "").suffix or ".jpg"
    filename = f"order_chat_{order_id}_{uuid.uuid4().hex[:8]}{ext}"
    upload_dir = Path("uploads/chat/orders")
    upload_dir.mkdir(parents=True, exist_ok=True)
    dest = upload_dir / filename
    dest.write_bytes(await file.read())
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
    if not location.get("latitude") or not location.get("longitude"):
        raise HTTPException(status_code=400, detail="Coordonnées GPS requises")
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
