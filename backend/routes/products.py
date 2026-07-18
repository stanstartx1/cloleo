# Products routes - Public API for browsing products
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from datetime import datetime, timezone

from core.database import db
from models.schemas import UserRole

router = APIRouter(prefix="/products", tags=["Products"])


async def _inject_seller_profile_photo(products):
    seller_ids = list({p.get("seller_id") for p in products if p.get("seller_id")})
    if not seller_ids:
        return

    users = await db.users.find(
        {"id": {"$in": seller_ids}},
        {"_id": 0, "id": 1, "profile_photo": 1}
    ).to_list(len(seller_ids) + 10)
    photo_by_id = {u.get("id"): u.get("profile_photo") for u in users}

    for p in products:
        p["seller_profile_photo"] = photo_by_id.get(p.get("seller_id"))


@router.get("")
async def get_products(
    category: Optional[str] = None,
    category_slug: Optional[str] = None,
    subcategory_slug: Optional[str] = None,
    search: Optional[str] = None,
    condition: Optional[str] = None,
    location: Optional[str] = None,
    origin_country: Optional[str] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    seller_id: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    page: int = 1,
    limit: int = 20,
    featured: Optional[bool] = None
):
    """Get list of approved products with filtering and pagination"""
    query = {"status": "approved"}
    # Support both category and category_slug parameters for flexibility
    if subcategory_slug:
        query["subcategory_slug"] = subcategory_slug
    elif category_slug:
        # First try to get subcategories of this category
        from core.database import db
        category = await db.categories.find_one({"slug": category_slug}, {"_id": 0})
        if category:
            # Get all subcategories of this category
            subcategories = await db.categories.find({"parent_slug": category_slug}, {"_id": 0, "slug": 1}).to_list(100)
            subcategory_slugs = [s["slug"] for s in subcategories]
            
            # Search in both the category itself and all its subcategories
            if subcategory_slugs:
                query["$or"] = [
                    {"category_slug": category_slug},
                    {"subcategory_slug": {"$in": subcategory_slugs}}
                ]
            else:
                # No subcategories, search in both fields
                query["$or"] = [
                    {"category_slug": category_slug},
                    {"subcategory_slug": category_slug}
                ]
        else:
            # Category not found, search in both fields as fallback
            query["$or"] = [
                {"category_slug": category_slug},
                {"subcategory_slug": category_slug}
            ]
    elif category:
        query["$or"] = [
            {"category_slug": category},
            {"subcategory_slug": category}
        ]
    
    if search:
        # Combine search with existing conditions
        search_condition = {
            "$or": [
                {"name": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}}
            ]
        }
        # If we already have $or from category filtering, we need to combine them
        if "$or" in query:
            # Use $and to combine the existing $or with the search condition
            query = {
                "$and": [
                    {"status": "approved"},
                    {"$or": query["$or"]},
                    search_condition
                ]
            }
        else:
            query["$or"] = search_condition["$or"]
    if condition:
        # Support multiple conditions separated by comma
        conditions = condition.split(',')
        if len(conditions) > 1:
            query["condition"] = {"$in": conditions}
        else:
            query["condition"] = condition
    if location:
        # Support multiple locations separated by comma
        locations = location.split(',')
        if len(locations) > 1:
            query["location"] = {"$in": locations}
        else:
            query["location"] = location
    if origin_country:
        # Filter by country code - support multiple countries separated by comma
        countries = origin_country.split(',')
        if len(countries) > 1:
            query["origin_country_code"] = {"$in": countries}
        else:
            query["origin_country_code"] = origin_country
    if min_price:
        query.setdefault("price_fcfa", {})["$gte"] = min_price
    if max_price:
        query.setdefault("price_fcfa", {})["$lte"] = max_price
    if seller_id:
        query["seller_id"] = seller_id
    if featured is not None:
        query["is_featured"] = featured

    skip = (page - 1) * limit
    total = await db.products.count_documents(query)
    products = await db.products.find(query, {"_id": 0}).sort(
        sort_by, -1 if sort_order == "desc" else 1
    ).skip(skip).limit(limit).to_list(limit)
    await _inject_seller_profile_photo(products)

    return {
        "products": products,
        "total": total,
        "page": page,
        "total_pages": (total + limit - 1) // limit
    }


@router.get("/featured")
async def get_featured_products_public(limit: int = 12):
    """Get featured products for homepage animations"""
    manual_featured = await db.products.find(
        {"is_featured": True, "status": "approved"},
        {"_id": 0}
    ).sort([("featured_at", -1), ("created_at", -1)]).limit(limit).to_list(limit)

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

    for product in manual_featured:
        seller = await db.users.find_one(
            {"id": product.get("seller_id")},
            {"_id": 0, "password": 0}
        )
        product["seller"] = seller
        product["seller_profile_photo"] = (seller or {}).get("profile_photo")

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

    seller = await db.users.find_one({"id": p.get("seller_id")}, {"_id": 0, "id": 1, "profile_photo": 1})
    p["seller_profile_photo"] = (seller or {}).get("profile_photo")
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

    products = await db.products.find(
        {"category_slug": p["category_slug"], "id": {"$ne": p["id"]}, "status": "approved"},
        {"_id": 0}
    ).limit(limit).to_list(limit)
    await _inject_seller_profile_photo(products)
    return products


@router.get("/{product_id}/also-bought")
async def get_also_bought(product_id: str, limit: int = 6):
    """Get products that are often bought together"""
    p = await db.products.find_one(
        {"$or": [{"id": product_id}, {"slug": product_id}]},
        {"_id": 0}
    )
    if not p:
        return []

    price = p.get("price_fcfa", 10000)
    min_price = int(price * 0.5)
    max_price = int(price * 2)

    products = await db.products.find(
        {
            "id": {"$ne": p["id"]},
            "status": "approved",
            "price_fcfa": {"$gte": min_price, "$lte": max_price}
        },
        {"_id": 0}
    ).limit(limit).to_list(limit)
    await _inject_seller_profile_photo(products)
    return products
