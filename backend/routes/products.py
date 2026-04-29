# Products routes - Public API for browsing products
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from datetime import datetime, timezone

from core.database import db
from models.schemas import UserRole

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("")
async def get_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    condition: Optional[str] = None,
    location: Optional[str] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    page: int = 1,
    limit: int = 20,
    featured: Optional[bool] = None
):
    """Get list of approved products with filtering and pagination"""
    query = {"status": "approved"}
    if category:
        query["category_slug"] = category
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    if condition:
        query["condition"] = condition
    if location:
        query["location"] = location
    if min_price:
        query.setdefault("price_fcfa", {})["$gte"] = min_price
    if max_price:
        query.setdefault("price_fcfa", {})["$lte"] = max_price
    if featured is not None:
        query["is_featured"] = featured
    
    skip = (page - 1) * limit
    total = await db.products.count_documents(query)
    products = await db.products.find(query, {"_id": 0}).sort(
        sort_by, -1 if sort_order == "desc" else 1
    ).skip(skip).limit(limit).to_list(limit)
    
    return {
        "products": products,
        "total": total,
        "page": page,
        "total_pages": (total + limit - 1) // limit
    }


@router.get("/featured")
async def get_featured_products_public(limit: int = 12):
    """Get featured products for homepage animations"""
    # Get manually featured products
    manual_featured = await db.products.find(
        {"is_featured": True, "status": "approved"},
        {"_id": 0}
    ).sort([("featured_at", -1), ("created_at", -1)]).limit(limit).to_list(limit)
    
    # If not enough, get products from premium vendors
    remaining = limit - len(manual_featured)
    if remaining > 0:
        premium_vendors = await db.users.find(
            {
                "role": UserRole.VENDOR,
                "subscription_plan": {"$in": ["entreprise", "commercant", "artisan"]},
                "is_active": True
            },
            {"_id": 0, "id": 1, "subscription_plan": 1}
        ).to_list(100)
        
        plan_order = {"entreprise": 0, "commercant": 1, "artisan": 2}
        premium_vendors.sort(key=lambda v: plan_order.get(v.get("subscription_plan"), 3))
        vendor_ids = [v["id"] for v in premium_vendors]
        
        if vendor_ids:
            featured_ids = [p["id"] for p in manual_featured]
            auto_featured = await db.products.find(
                {
                    "seller_id": {"$in": vendor_ids},
                    "status": "approved",
                    "id": {"$nin": featured_ids}
                },
                {"_id": 0}
            ).limit(remaining).to_list(remaining)
            manual_featured.extend(auto_featured)
    
    # Enrich with seller info
    for product in manual_featured:
        seller = await db.users.find_one(
            {"id": product.get("seller_id")},
            {"_id": 0, "password": 0}
        )
        product["seller"] = seller
    
    return manual_featured


@router.get("/{product_id}")
async def get_product(product_id: str):
    """Get a single product by ID or slug"""
    p = await db.products.find_one(
        {"$or": [{"id": product_id}, {"slug": product_id}], "status": "approved"},
        {"_id": 0}
    )
    if not p:
        raise HTTPException(status_code=404, detail="Non trouvé")
    return p


@router.get("/{product_id}/similar")
async def get_similar_products(product_id: str, limit: int = 6):
    """Get similar products from the same category"""
    p = await db.products.find_one(
        {"$or": [{"id": product_id}, {"slug": product_id}]},
        {"_id": 0}
    )
    if not p:
        raise HTTPException(status_code=404, detail="Non trouvé")
    
    return await db.products.find(
        {"category_slug": p["category_slug"], "id": {"$ne": p["id"]}, "status": "approved"},
        {"_id": 0}
    ).limit(limit).to_list(limit)


@router.get("/{product_id}/also-bought")
async def get_also_bought(product_id: str, limit: int = 6):
    """Get products that are often bought together"""
    p = await db.products.find_one(
        {"$or": [{"id": product_id}, {"slug": product_id}]},
        {"_id": 0}
    )
    if not p:
        return []
    
    # Return products from similar price range
    price = p.get("price_fcfa", 10000)
    min_price = int(price * 0.5)
    max_price = int(price * 2)
    
    return await db.products.find(
        {
            "id": {"$ne": p["id"]},
            "status": "approved",
            "price_fcfa": {"$gte": min_price, "$lte": max_price}
        },
        {"_id": 0}
    ).limit(limit).to_list(limit)
