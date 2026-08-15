"""Delivery security: PIN codes, verification."""
import random
import uuid
import hashlib
import hmac
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from core.auth import get_current_user, require_driver
from core.database import db
from core.audit_log import log_audit

router = APIRouter(prefix="/security", tags=["Security"])


def _utc():
    return datetime.now(timezone.utc).isoformat()


@router.post("/delivery-pin/generate/{order_id}")
async def generate_delivery_pin(order_id: str, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    if user["id"] != order.get("customer_id") and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Non autorisé")

    pin = f"{random.randint(0, 999999):06d}"
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "delivery_pin_hash": hashlib.sha256(pin.encode()).hexdigest(),
            "delivery_pin_created_at": _utc(),
            "delivery_pin_verified": False,
            "delivery_proof_required": True,
        }},
    )
    await log_audit("delivery_pin_generated", user["id"], "order", order_id)
    return {"ok": True, "pin": pin, "message": "Communiquez ce PIN au livreur à la livraison"}


@router.post("/delivery-pin/verify")
async def verify_delivery_pin(payload: dict, user: dict = Depends(require_driver)):
    order_id = payload.get("order_id")
    pin = payload.get("pin")
    order = await db.orders.find_one({"id": order_id, "driver_id": user["id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    pin_hash = order.get("delivery_pin_hash")
    # Supports existing orders created before PIN hashing was introduced.
    if not pin_hash and order.get("delivery_pin"):
        pin_hash = hashlib.sha256(str(order["delivery_pin"]).encode()).hexdigest()
    if not pin_hash:
        return {"ok": True, "verified": True, "message": "Aucun PIN requis"}
    candidate = hashlib.sha256(str(pin or "").encode()).hexdigest()
    if not hmac.compare_digest(candidate, pin_hash):
        await log_audit("delivery_pin_failed", user["id"], "order", order_id)
        raise HTTPException(status_code=400, detail="PIN incorrect")
    await db.orders.update_one({"id": order_id}, {"$set": {"delivery_pin_verified": True, "delivery_pin_verified_at": _utc()}})
    await log_audit("delivery_pin_verified", user["id"], "order", order_id)
    return {"ok": True, "verified": True}


@router.get("/audit-logs")
async def get_audit_logs(user: dict = Depends(get_current_user), limit: int = 50):
    if user.get("role") != "admin":
        query = {"user_id": user["id"]}
    else:
        query = {}
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"logs": logs}
