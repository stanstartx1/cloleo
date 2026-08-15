"""Multi-channel notifications: in-app, web push, SMS, email, Expo."""
import json
import logging
import os
import smtplib
import uuid
from datetime import datetime, timezone
from email.mime.text import MIMEText
from typing import Any, Dict, List, Optional

from core.database import db

logger = logging.getLogger(__name__)

_manager = None

DEFAULT_PREFS = {
    "web_push": True,
    "sms_urgent": True,
    "email_digest": True,
    "order_updates": True,
    "chat_messages": True,
}


def set_ws_manager(mgr):
    global _manager
    _manager = mgr


async def get_user_preferences(user_id: str) -> dict:
    prefs = await db.notification_preferences.find_one({"user_id": user_id}, {"_id": 0})
    if not prefs:
        return {**DEFAULT_PREFS, "user_id": user_id}
    return {**DEFAULT_PREFS, **prefs}


async def _get_user_contact(user_id: str) -> dict:
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "phone": 1, "email": 1, "name": 1})
    return user or {}


async def create_in_app_notification(
    user_id: str,
    title: str,
    body: str,
    notification_type: str = "general",
    data: Optional[Dict] = None,
    priority: str = "normal",
):
    notif = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "title": title,
        "body": body,
        "type": notification_type,
        "data": data or {},
        "priority": priority,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.notifications.insert_one(notif)
    if _manager:
        await _manager.send_to_user(
            user_id,
            {"type": "notification", "notification": {k: v for k, v in notif.items() if k != "_id"}},
        )
    return notif


async def send_web_push(user_id: str, title: str, body: str, data: Optional[Dict] = None):
    vapid_private = os.environ.get("VAPID_PRIVATE_KEY")
    vapid_claims = {"sub": os.environ.get("VAPID_SUBJECT", "mailto:admin@cloleo.com")}
    if not vapid_private:
        return 0
    try:
        from pywebpush import webpush
    except ImportError:
        logger.warning("pywebpush not installed")
        return 0

    subs = await db.push_subscriptions.find({"user_id": user_id}, {"_id": 0}).to_list(50)
    sent = 0
    payload = json.dumps({"title": title, "body": body, "data": data or {}})
    for sub in subs:
        try:
            webpush(
                subscription_info=sub["subscription"],
                data=payload,
                vapid_private_key=vapid_private,
                vapid_claims=vapid_claims,
            )
            sent += 1
        except Exception as e:
            logger.error("Web push failed for %s: %s", user_id, e)
            if "410" in str(e) or "404" in str(e):
                await db.push_subscriptions.delete_one({"id": sub.get("id")})
    return sent


async def send_expo_push(user_id: str, title: str, body: str, data: Optional[Dict] = None) -> int:
    tokens = await db.expo_push_tokens.find({"user_id": user_id}, {"_id": 0, "token": 1}).to_list(20)
    if not tokens:
        return 0
    messages = [
        {
            "to": t["token"],
            "title": title,
            "body": body,
            "data": data or {},
            "sound": "default",
        }
        for t in tokens
    ]
    try:
        import httpx
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post("https://exp.host/--/api/v2/push/send", json=messages)
            if resp.status_code == 200:
                return len(messages)
    except Exception as e:
        logger.error("Expo push failed for %s: %s", user_id, e)
    return 0


async def send_sms(phone: str, message: str, urgency: str = "normal") -> bool:
    if not phone:
        return False
    account_sid = os.environ.get("TWILIO_ACCOUNT_SID")
    auth_token = os.environ.get("TWILIO_AUTH_TOKEN")
    from_number = os.environ.get("TWILIO_FROM_NUMBER")
    if account_sid and auth_token and from_number:
        try:
            from twilio.rest import Client
            Client(account_sid, auth_token).messages.create(body=message, from_=from_number, to=phone)
            await db.sms_logs.insert_one({
                "phone": phone, "message": message, "urgency": urgency,
                "status": "sent", "created_at": datetime.now(timezone.utc).isoformat(),
            })
            return True
        except Exception as e:
            logger.error("Twilio SMS failed: %s", e)
    await db.sms_logs.insert_one({
        "phone": phone, "message": message, "urgency": urgency,
        "status": "queued_mock", "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return False


async def send_email(to_email: str, subject: str, html_body: str) -> bool:
    if not to_email:
        return False
    host = os.environ.get("SMTP_HOST")
    port = int(os.environ.get("SMTP_PORT", "587"))
    user = os.environ.get("SMTP_USER")
    password = os.environ.get("SMTP_PASSWORD")
    from_addr = os.environ.get("SMTP_FROM", "noreply@cloleo.com")
    if not all([host, user, password]):
        await db.email_logs.insert_one({
            "to": to_email, "subject": subject, "status": "queued_mock",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        return False
    try:
        msg = MIMEText(html_body, "html")
        msg["Subject"] = subject
        msg["From"] = from_addr
        msg["To"] = to_email
        with smtplib.SMTP(host, port) as server:
            server.starttls()
            server.login(user, password)
            server.sendmail(from_addr, [to_email], msg.as_string())
        await db.email_logs.insert_one({
            "to": to_email, "subject": subject, "status": "sent",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        return True
    except Exception as e:
        logger.error("Email failed: %s", e)
        return False


async def notify_user_all_channels(
    user_id: str,
    title: str,
    body: str,
    notification_type: str = "general",
    data: Optional[Dict] = None,
    sms: bool = False,
    email: bool = False,
    phone: Optional[str] = None,
    email_address: Optional[str] = None,
):
    prefs = await get_user_preferences(user_id)
    contact = await _get_user_contact(user_id)

    if notification_type == "chat_message" and not prefs.get("chat_messages", True):
        return
    if notification_type.startswith("order") and not prefs.get("order_updates", True):
        return

    await create_in_app_notification(user_id, title, body, notification_type, data)

    if prefs.get("web_push", True):
        await send_web_push(user_id, title, body, data)
        await send_expo_push(user_id, title, body, data)

    resolved_phone = phone or contact.get("phone")
    if sms and prefs.get("sms_urgent", True) and resolved_phone:
        await send_sms(
            resolved_phone,
            f"{title}: {body}",
            urgency="high" if notification_type in ("delay", "urgent", "driver_arriving") else "normal",
        )

    resolved_email = email_address or contact.get("email")
    if email and prefs.get("email_digest", True) and resolved_email:
        await send_email(resolved_email, title, f"<p>{body}</p>")


async def notify_order_parties(
    order: dict,
    title: str,
    body: str,
    notification_type: str = "order_update",
    data: Optional[Dict] = None,
    include: Optional[List[str]] = None,
    sms_urgent: bool = False,
):
    """Notify customer, seller, driver via all channels."""
    targets = include or ["customer", "seller", "driver"]
    order_id = order.get("id")
    payload = {**(data or {}), "order_id": order_id}

    mapping = {
        "customer": order.get("customer_id"),
        "seller": order.get("seller_id"),
        "driver": order.get("driver_id"),
    }
    for role, uid in mapping.items():
        if role in targets and uid:
            await notify_user_all_channels(
                uid,
                title,
                body,
                notification_type,
                payload,
                sms=sms_urgent and role == "customer",
                phone=order.get("customer_phone") if role == "customer" else None,
            )
