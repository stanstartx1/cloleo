"""Analytics for vendors, drivers, customers."""
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends

from core.auth import get_current_user, require_vendor, require_driver, require_admin
from core.database import db

router = APIRouter(prefix="/analytics", tags=["Analytics"])


def _days_ago(days: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()


@router.get("/vendor")
async def vendor_analytics(user: dict = Depends(require_vendor)):
    seller_id = user["id"]
    since = _days_ago(30)
    orders = await db.orders.find(
        {"seller_id": seller_id, "created_at": {"$gte": since}, "is_deleted": {"$ne": True}},
        {"_id": 0},
    ).to_list(1000)

    delivered = [o for o in orders if o.get("status") == "delivered"]
    prep_times = []
    for o in delivered:
        history = o.get("status_history") or []
        confirmed = next((h for h in history if h.get("status") == "confirmed"), None)
        picked = next((h for h in history if h.get("status") == "picked_up"), None)
        if confirmed and picked:
            try:
                t1 = datetime.fromisoformat(confirmed["timestamp"].replace("Z", "+00:00"))
                t2 = datetime.fromisoformat(picked["timestamp"].replace("Z", "+00:00"))
                prep_times.append((t2 - t1).total_seconds() / 60)
            except Exception:
                pass

    ratings = await db.delivery_ratings.find({"recipient_id": seller_id}, {"_id": 0, "rating": 1}).to_list(500)
    avg_satisfaction = round(sum(r["rating"] for r in ratings) / len(ratings), 1) if ratings else 0

    product_counts = {}
    for o in orders:
        for item in o.get("items") or []:
            name = item.get("product_name", "unknown")
            product_counts[name] = product_counts.get(name, 0) + item.get("quantity", 1)

    return {
        "orders_per_day": round(len(orders) / 30, 1),
        "total_orders_30d": len(orders),
        "avg_prep_minutes": round(sum(prep_times) / len(prep_times), 1) if prep_times else 0,
        "satisfaction_rate": avg_satisfaction,
        "popular_products": sorted(product_counts.items(), key=lambda x: -x[1])[:10],
        "delivered_count": len(delivered),
    }


@router.get("/driver")
async def driver_analytics(user: dict = Depends(require_driver)):
    since = _days_ago(30)
    orders = await db.orders.find(
        {"driver_id": user["id"], "created_at": {"$gte": since}},
        {"_id": 0},
    ).to_list(1000)
    delivered = [o for o in orders if o.get("status") == "delivered"]

    delivery_times = []
    total_distance = 0
    for o in delivered:
        history = o.get("status_history") or []
        picked = next((h for h in history if h.get("status") == "picked_up"), None)
        done = next((h for h in history if h.get("status") == "delivered"), None)
        if picked and done:
            try:
                t1 = datetime.fromisoformat(picked["timestamp"].replace("Z", "+00:00"))
                t2 = datetime.fromisoformat(done["timestamp"].replace("Z", "+00:00"))
                delivery_times.append((t2 - t1).total_seconds() / 60)
            except Exception:
                pass
        total_distance += o.get("distance_km") or 0

    earnings = sum(o.get("delivery_fee_fcfa") or 1500 for o in delivered)
    all_drivers = await db.orders.count_documents({"status": "delivered", "created_at": {"$gte": since}})
    avg_platform = all_drivers / max(1, await db.users.count_documents({"role": "driver", "is_active": True}))

    positions = await db.driver_position_history.count_documents({"driver_id": user["id"], "timestamp": {"$gte": since}})

    return {
        "deliveries_30d": len(delivered),
        "deliveries_per_day": round(len(delivered) / 30, 1),
        "avg_delivery_minutes": round(sum(delivery_times) / len(delivery_times), 1) if delivery_times else 0,
        "distance_km_30d": round(total_distance, 1),
        "earnings_fcfa_30d": earnings,
        "performance_vs_avg": round(len(delivered) / max(avg_platform, 1) * 100, 1),
        "gps_points_recorded": positions,
    }


@router.get("/customer")
async def customer_analytics(user: dict = Depends(get_current_user)):
    since = _days_ago(365)
    orders = await db.orders.find(
        {"customer_id": user["id"], "created_at": {"$gte": since}, "is_deleted": {"$ne": True}},
        {"_id": 0},
    ).to_list(500)

    totals = [o.get("total_fcfa") or 0 for o in orders]
    product_freq = {}
    for o in orders:
        for item in o.get("items") or []:
            pid = item.get("product_id")
            product_freq[pid] = product_freq.get(pid, 0) + 1

    favorite_ids = sorted(product_freq, key=product_freq.get, reverse=True)[:5]
    favorites = []
    for pid in favorite_ids:
        p = await db.products.find_one({"id": pid}, {"_id": 0, "name": 1, "images": 1})
        if p:
            favorites.append({**p, "order_count": product_freq[pid]})

    return {
        "purchase_frequency": round(len(orders) / 12, 1),
        "total_orders": len(orders),
        "avg_basket_fcfa": round(sum(totals) / len(totals)) if totals else 0,
        "ltv_fcfa": sum(totals),
        "favorite_products": favorites,
        "last_order_at": orders[0].get("created_at") if orders else None,
    }


@router.get("/admin/demand-prediction")
async def demand_prediction(user: dict = Depends(require_admin)):
    """Simple demand prediction based on last 7 days."""
    days_data = []
    for i in range(7, 0, -1):
        start = _days_ago(i)
        end = _days_ago(i - 1)
        count = await db.orders.count_documents({"created_at": {"$gte": start, "$lt": end}})
        days_data.append(count)
    avg = sum(days_data) / len(days_data) if days_data else 0
    peak_day = max(range(len(days_data)), key=lambda i: days_data[i]) if days_data else 0
    return {
        "daily_orders_last_7d": days_data,
        "predicted_tomorrow": round(avg * 1.05),
        "peak_day_index": peak_day,
        "trend": "up" if days_data[-1] > days_data[0] else "stable",
    }
