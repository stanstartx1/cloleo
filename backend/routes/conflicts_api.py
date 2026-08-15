"""Conflict management, delays, compensations."""
from datetime import datetime, timezone, timedelta
import uuid

from fastapi import APIRouter, Depends, HTTPException

from core.auth import get_current_user, require_admin
from core.database import db
from core.notification_channels import notify_user_all_channels
from core.audit_log import log_audit

router = APIRouter(prefix="/conflicts", tags=["Conflicts"])

_manager = None


def set_manager(mgr):
    global _manager
    _manager = mgr


def _utc():
    return datetime.now(timezone.utc).isoformat()


@router.post("/report")
async def report_conflict(payload: dict, user: dict = Depends(get_current_user)):
    order_id = payload.get("order_id")
    if not order_id:
        raise HTTPException(status_code=400, detail="order_id requis")
    order = await db.orders.find_one({"id": order_id}, {"_id": 0, "customer_id": 1, "seller_id": 1, "driver_id": 1, "dropshipper_id": 1})
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    participants = {order.get("customer_id"), order.get("seller_id"), order.get("driver_id"), order.get("dropshipper_id")}
    if user.get("role") != "admin" and user["id"] not in participants:
        raise HTTPException(status_code=403, detail="Vous ne participez pas à cette commande")
    conflict = {
        "id": str(uuid.uuid4()),
        "order_id": order_id,
        "reporter_id": user["id"],
        "conflict_type": payload.get("conflict_type", "general"),
        "description": str(payload.get("description") or "")[:2_000],
        "status": "open",
        "priority": payload.get("priority", "normal"),
        "created_at": _utc(),
    }
    await db.conflicts.insert_one(conflict)
    await log_audit("conflict_reported", user["id"], "conflict", conflict["id"], {"type": conflict["conflict_type"]})

    admins = await db.users.find({"role": "admin"}, {"_id": 0, "id": 1}).to_list(20)
    for admin in admins:
        await notify_user_all_channels(
            admin["id"], "Alerte conflit", f"Nouveau conflit: {conflict['conflict_type']}",
            "conflict_alert", {"conflict_id": conflict["id"]},
        )
    return {"ok": True, "conflict": conflict}


@router.get("")
async def list_conflicts(status: str = "open", user: dict = Depends(require_admin)):
    conflicts = await db.conflicts.find({"status": status}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"conflicts": conflicts}


@router.put("/{conflict_id}/resolve")
async def resolve_conflict(conflict_id: str, payload: dict, user: dict = Depends(require_admin)):
    compensation_fcfa = payload.get("compensation_fcfa", 0)
    resolution = payload.get("resolution", "")
    await db.conflicts.update_one(
        {"id": conflict_id},
        {"$set": {
            "status": "resolved",
            "resolution": resolution,
            "compensation_fcfa": compensation_fcfa,
            "resolved_by": user["id"],
            "resolved_at": _utc(),
        }},
    )
    conflict = await db.conflicts.find_one({"id": conflict_id}, {"_id": 0})
    if conflict and compensation_fcfa > 0 and conflict.get("order_id"):
        order = await db.orders.find_one({"id": conflict["order_id"]}, {"_id": 0})
        if order:
            await db.compensations.insert_one({
                "id": str(uuid.uuid4()),
                "order_id": conflict["order_id"],
                "customer_id": order.get("customer_id"),
                "amount_fcfa": compensation_fcfa,
                "reason": resolution,
                "created_at": _utc(),
            })
            if order.get("customer_id"):
                await notify_user_all_channels(
                    order["customer_id"],
                    "Compensation reçue",
                    f"Vous avez reçu {compensation_fcfa} FCFA de compensation.",
                    "compensation",
                    {"amount": compensation_fcfa},
                )
    return {"ok": True}


@router.post("/check-delays")
async def check_delivery_delays(user: dict = Depends(require_admin)):
    """Detect delayed deliveries and notify automatically."""
    threshold = datetime.now(timezone.utc) - timedelta(minutes=45)
    delayed = await db.orders.find({
        "status": "in_transit",
        "in_transit_at": {"$lt": threshold.isoformat()},
        "delay_notified": {"$ne": True},
    }, {"_id": 0}).to_list(50)

    notified = 0
    for order in delayed:
        customer_id = order.get("customer_id")
        if customer_id:
            await notify_user_all_channels(
                customer_id,
                "Retard de livraison",
                "Votre livraison prend plus de temps que prévu. Nous nous excusons.",
                "delay",
                {"order_id": order["id"]},
                sms=True,
                phone=order.get("customer_phone") or order.get("delivery_address", {}).get("phone"),
            )
        seller_id = order.get("seller_id")
        if seller_id:
            await notify_user_all_channels(
                seller_id,
                "Retard livraison",
                f"Commande {order.get('order_number')} en retard.",
                "delay",
            )
        await db.orders.update_one({"id": order["id"]}, {"$set": {"delay_notified": True}})
        notified += 1
    return {"ok": True, "delayed_orders_notified": notified}
