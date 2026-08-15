"""RGPD-compliant audit logging."""
from datetime import datetime, timezone
from typing import Any, Dict, Optional
import uuid

from core.database import db


async def log_audit(
    action: str,
    user_id: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
):
    entry = {
        "id": str(uuid.uuid4()),
        "action": action,
        "user_id": user_id,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "details": details or {},
        "ip_address": ip_address,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.audit_logs.insert_one(entry)
    return entry
