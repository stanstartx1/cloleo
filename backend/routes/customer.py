from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId

from core.database import db
from core.auth import get_current_user

router = APIRouter()

def _utc():
    return datetime.now(timezone.utc).isoformat()

@router.get("/dashboard")
async def get_customer_dashboard(user: dict = Depends(get_current_user)):
    """
    Get customer dashboard data including stats, recent orders, and notifications
    """
    if user.get("role") != "customer":
        raise HTTPException(status_code=403, detail="Accès réservé aux clients")
    
    customer_id = user["id"]
    
    try:
        # Get total orders
        total_orders = await db.orders.count_documents({
            "customer_id": customer_id,
            "is_deleted": {"$ne": True}
        })
        
        # Get orders this month
        current_month = datetime.now(timezone.utc).strftime("%Y-%m")
        orders_this_month = await db.orders.count_documents({
            "customer_id": customer_id,
            "is_deleted": {"$ne": True},
            "created_at": {"$regex": f"^{current_month}"}
        })
        
        # Calculate total spent
        orders_pipeline = [
            {"$match": {"customer_id": customer_id, "is_deleted": {"$ne": True}}},
            {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
        ]
        spent_result = await db.orders.aggregate(orders_pipeline).to_list(1)
        total_spent = spent_result[0]["total"] if spent_result else 0
        
        # Calculate spent this month
        spent_month_pipeline = [
            {"$match": {
                "customer_id": customer_id,
                "is_deleted": {"$ne": True},
                "created_at": {"$regex": f"^{current_month}"}
            }},
            {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
        ]
        spent_month_result = await db.orders.aggregate(spent_month_pipeline).to_list(1)
        spent_this_month = spent_month_result[0]["total"] if spent_month_result else 0
        
        # Get active orders (not delivered or cancelled)
        active_orders = await db.orders.count_documents({
            "customer_id": customer_id,
            "is_deleted": {"$ne": True},
            "status": {"$nin": ["delivered", "cancelled"]}
        })
        
        # Get pending orders
        pending_orders = await db.orders.count_documents({
            "customer_id": customer_id,
            "is_deleted": {"$ne": True},
            "status": "pending"
        })
        
        # Get loyalty points (if implemented)
        loyalty_points = 0
        loyalty_level = "Bronze"
        customer_data = await db.users.find_one({"id": customer_id}, {"_id": 0})
        if customer_data:
            loyalty_points = customer_data.get("loyalty_points", 0)
            if loyalty_points >= 1000:
                loyalty_level = "Or"
            elif loyalty_points >= 500:
                loyalty_level = "Argent"
            else:
                loyalty_level = "Bronze"
        
        # Get recent orders (last 5)
        recent_orders = await db.orders.find({
            "customer_id": customer_id,
            "is_deleted": {"$ne": True}
        }).sort("created_at", -1).limit(5).to_list(length=5)
        
        # Get recent notifications (last 10)
        notifications = await db.notifications.find({
            "user_id": customer_id
        }).sort("created_at", -1).limit(10).to_list(length=10)
        
        return {
            "stats": {
                "total_orders": total_orders,
                "orders_this_month": orders_this_month,
                "total_spent": total_spent,
                "spent_this_month": spent_this_month,
                "active_orders": active_orders,
                "pending_orders": pending_orders,
                "loyalty_points": loyalty_points,
                "loyalty_level": loyalty_level
            },
            "recent_orders": recent_orders,
            "notifications": notifications
        }
        
    except Exception as e:
        print(f"Error fetching customer dashboard: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors du chargement du tableau de bord")
