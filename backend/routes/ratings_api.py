"""Multi-party delivery ratings: client, vendor, driver."""
from datetime import datetime, timezone
from typing import List, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from core.auth import get_current_user
from core.database import db
from core.gamification_delivery import add_delivery_points

router = APIRouter(prefix="/ratings", tags=["Delivery Ratings"])


class RatingSubmit(BaseModel):
    order_id: str
    recipient_id: str
    recipient_role: str
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None
    tags: List[str] = []


def _utc():
    return datetime.now(timezone.utc).isoformat()


@router.post("/submit")
async def submit_rating(data: RatingSubmit, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": data.order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    if order.get("status") != "delivered":
        raise HTTPException(status_code=400, detail="La commande doit être livrée pour noter")

    existing = await db.delivery_ratings.find_one({
        "order_id": data.order_id,
        "reviewer_id": user["id"],
        "recipient_id": data.recipient_id,
    })
    if existing:
        raise HTTPException(status_code=400, detail="Vous avez déjà noté cette personne pour cette commande")

    rating_doc = {
        "id": str(uuid.uuid4()),
        "order_id": data.order_id,
        "reviewer_id": user["id"],
        "reviewer_name": user.get("name"),
        "reviewer_role": user.get("role"),
        "recipient_id": data.recipient_id,
        "recipient_role": data.recipient_role,
        "rating": data.rating,
        "comment": data.comment,
        "tags": data.tags,
        "created_at": _utc(),
    }
    await db.delivery_ratings.insert_one(rating_doc)

    await _update_recipient_rating(data.recipient_id, data.recipient_role)
    if data.rating >= 4:
        await add_delivery_points(data.recipient_id, "positive_rating", 10)

    return {"ok": True, "rating": {k: v for k, v in rating_doc.items() if k != "_id"}}


@router.get("/check/{order_id}")
async def check_rating(order_id: str, recipient_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"order_id": order_id, "reviewer_id": user["id"]}
    if recipient_id:
        query["recipient_id"] = recipient_id
    existing = await db.delivery_ratings.find_one(query, {"_id": 0})
    return {
        "has_rated": bool(existing),
        "rating": existing,
    }


@router.get("/user/{user_id}")
async def get_user_ratings(user_id: str, role: Optional[str] = None, limit: int = 20):
    query = {"recipient_id": user_id}
    if role:
        query["recipient_role"] = role
    ratings = await db.delivery_ratings.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "delivery_rating": 1, "delivery_rating_count": 1})
    return {
        "ratings": ratings,
        "average_rating": user.get("delivery_rating", 0) if user else 0,
        "count": user.get("delivery_rating_count", 0) if user else 0,
    }


@router.post("/report")
async def report_issue(payload: dict, user: dict = Depends(get_current_user)):
    report = {
        "id": str(uuid.uuid4()),
        "order_id": payload.get("order_id"),
        "reporter_id": user["id"],
        "reported_id": payload.get("reported_id"),
        "issue_type": payload.get("issue_type", "general"),
        "description": payload.get("description"),
        "status": "open",
        "created_at": _utc(),
    }
    await db.delivery_reports.insert_one(report)
    return {"ok": True, "report_id": report["id"]}


async def _update_recipient_rating(user_id: str, role: str):
    pipeline = [
        {"$match": {"recipient_id": user_id}},
        {"$group": {"_id": None, "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}},
    ]
    result = await db.delivery_ratings.aggregate(pipeline).to_list(1)
    avg = round(result[0]["avg"], 1) if result else 0
    count = result[0]["count"] if result else 0
    field_prefix = "delivery" if role == "driver" else role
    await db.users.update_one(
        {"id": user_id},
        {"$set": {f"{field_prefix}_rating": avg, f"{field_prefix}_rating_count": count}},
    )
