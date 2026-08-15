"""Push notifications, in-app notifications, preferences."""
from datetime import datetime, timezone
from typing import Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.auth import get_current_user, require_admin
from core.database import db
from core.notification_channels import send_email

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class PushSubscribe(BaseModel):
    subscription: dict
    user_agent: Optional[str] = None


class ExpoPushSubscribe(BaseModel):
    token: str
    device_id: Optional[str] = None


def _utc():
    return datetime.now(timezone.utc).isoformat()


@router.post("/subscribe")
async def subscribe_push(data: PushSubscribe, user: dict = Depends(get_current_user)):
    sub_id = str(uuid.uuid4())
    doc = {
        "id": sub_id,
        "user_id": user["id"],
        "subscription": data.subscription,
        "user_agent": data.user_agent,
        "created_at": _utc(),
    }
    await db.push_subscriptions.delete_many({"user_id": user["id"], "subscription.endpoint": data.subscription.get("endpoint")})
    await db.push_subscriptions.insert_one(doc)
    return {"ok": True, "id": sub_id}


@router.post("/unsubscribe")
async def unsubscribe_push(payload: Optional[dict] = None, user: dict = Depends(get_current_user)):
    """Remove one browser subscription, or all only when explicitly requested."""
    endpoint = (payload or {}).get("endpoint")
    query = {"user_id": user["id"]}
    if endpoint:
        query["subscription.endpoint"] = endpoint
    await db.push_subscriptions.delete_many(query)
    return {"ok": True}


@router.post("/expo/subscribe")
async def subscribe_expo_push(data: ExpoPushSubscribe, user: dict = Depends(get_current_user)):
    """Register an Expo token for the native client or driver application."""
    if not data.token.startswith("ExponentPushToken[") and not data.token.startswith("ExpoPushToken["):
        raise HTTPException(status_code=400, detail="Token Expo invalide")
    await db.expo_push_tokens.update_one(
        {"user_id": user["id"], "token": data.token},
        {"$set": {"device_id": data.device_id, "updated_at": _utc()},
         "$setOnInsert": {"id": str(uuid.uuid4()), "user_id": user["id"], "token": data.token, "created_at": _utc()}},
        upsert=True,
    )
    return {"ok": True}


@router.post("/expo/unsubscribe")
async def unsubscribe_expo_push(payload: dict, user: dict = Depends(get_current_user)):
    token = payload.get("token")
    if not token:
        raise HTTPException(status_code=400, detail="token requis")
    await db.expo_push_tokens.delete_one({"user_id": user["id"], "token": token})
    return {"ok": True}


@router.get("")
async def list_notifications(user: dict = Depends(get_current_user), limit: int = 50, unread_only: bool = False):
    query = {"user_id": user["id"]}
    if unread_only:
        query["read"] = False
    notifications = await db.notifications.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    unread = await db.notifications.count_documents({"user_id": user["id"], "read": False})
    return {"notifications": notifications, "unread_count": unread}


@router.post("/{notification_id}/read")
async def mark_read(notification_id: str, user: dict = Depends(get_current_user)):
    result = await db.notifications.update_one(
        {"id": notification_id, "user_id": user["id"]},
        {"$set": {"read": True, "read_at": _utc()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification non trouvée")
    return {"ok": True}


@router.post("/read-all")
async def mark_all_read(user: dict = Depends(get_current_user)):
    result = await db.notifications.update_many(
        {"user_id": user["id"], "read": False},
        {"$set": {"read": True, "read_at": _utc()}},
    )
    return {"ok": True, "count": result.modified_count}


@router.get("/preferences")
async def get_preferences(user: dict = Depends(get_current_user)):
    prefs = await db.notification_preferences.find_one({"user_id": user["id"]}, {"_id": 0})
    if not prefs:
        prefs = {
            "user_id": user["id"],
            "web_push": True,
            "sms_urgent": True,
            "email_digest": True,
            "order_updates": True,
            "chat_messages": True,
        }
    return prefs


@router.put("/preferences")
async def update_preferences(payload: dict, user: dict = Depends(get_current_user)):
    payload["user_id"] = user["id"]
    payload["updated_at"] = _utc()
    await db.notification_preferences.update_one(
        {"user_id": user["id"]},
        {"$set": payload},
        upsert=True,
    )
    return {"ok": True}


@router.post("/admin/send-digest")
async def send_daily_digest(user: dict = Depends(require_admin)):
    """Email récapitulatif pour les utilisateurs actifs."""
    users = await db.users.find({"is_active": True}, {"_id": 0, "id": 1, "email": 1, "name": 1}).to_list(500)
    sent = 0
    for u in users:
        if not u.get("email"):
            continue
        prefs = await db.notification_preferences.find_one({"user_id": u["id"]}, {"_id": 0})
        if prefs and not prefs.get("email_digest", True):
            continue
        orders_count = await db.orders.count_documents({"customer_id": u["id"], "created_at": {"$gte": _utc()[:10]}})
        if orders_count == 0:
            continue
        ok = await send_email(
            u["email"],
            "Récapitulatif Cloléo",
            f"<p>Bonjour {u.get('name', '')},</p><p>Vous avez {orders_count} commande(s) aujourd'hui sur Cloléo.</p>",
        )
        if ok:
            sent += 1
    return {"ok": True, "emails_sent": sent}
