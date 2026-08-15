"""Multi-channel notifications: in-app, web push, SMS, email."""
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


def set_ws_manager(mgr):
    global _manager
    _manager = mgr


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
        await _manager.send_to_user(user_id, {"type": "notification", "notification": {k: v for k, v in notif.items() if k != "_id"}})
    return notif


async def send_web_push(user_id: str, title: str, body: str, data: Optional[Dict] = None):
    vapid_private = os.environ.get("VAPID_PRIVATE_KEY")
    vapid_claims = {"sub": os.environ.get("VAPID_SUBJECT", "mailto:admin@cloleo.com")}
    if not vapid_private:
        return 0
    try:
        from pywebpush import webpush, WebPushException
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
    await create_in_app_notification(user_id, title, body, notification_type, data)
    await send_web_push(user_id, title, body, data)
    if sms and phone:
        await send_sms(phone, f"{title}: {body}", urgency="high" if notification_type in ("delay", "urgent") else "normal")
    if email and email_address:
        await send_email(email_address, title, f"<p>{body}</p>")
