"""Revendeur/Dropshipper Routes"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from pydantic import BaseModel

from core.auth import get_current_user
from core.database import db

router = APIRouter(prefix="/revendeur", tags=["Revendeur"])


@router.get("/catalog")
async def get_catalog_products(
    page: int = Query(1, ge=1),
    limit: int = Query(24, ge=1, le=100),
    search: Optional[str] = None,
    category_slug: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """
    Get all products from the site for reseller catalog
    Resellers can see all products to add to their catalog
    """
    if user.get("role") not in ["revendeur", "dropshipper"]:
        raise HTTPException(status_code=403, detail="Accès réservé aux revendeurs")
    
    # Build query
    query = {"is_active": True}
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    if category_slug:
        query["category_slug"] = category_slug
    
    # Count total
    total = await db.products.count_documents(query)
    
    # Fetch products with pagination
    skip = (page - 1) * limit
    products = await db.products.find(
        query,
        {
            "_id": 0,
            "id": 1,
            "name": 1,
            "description": 1,
            "price_fcfa": 1,
            "original_price_fcfa": 1,
            "category_slug": 1,
            "category_name": 1,
            "images": 1,
            "stock": 1,
            "seller_id": 1,
            "seller_name": 1,
            "shop_slug": 1,
            "is_active": 1,
            "created_at": 1
        }
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Get categories
    categories = await db.categories.find(
        {"is_active": True},
        {"_id": 0, "slug": 1, "name": 1}
    ).to_list(100)
    
    return {
        "products": products,
        "total": total,
        "page": page,
        "limit": limit,
        "categories": categories
    }


@router.get("/products")
async def get_my_products(user: dict = Depends(get_current_user)):
    """
    Get reseller's custom catalog products
    """
    if user.get("role") not in ["revendeur", "dropshipper"]:
        raise HTTPException(status_code=403, detail="Accès réservé aux revendeurs")
    
    # Fetch products where this reseller has customized them
    # For now, return empty since we need to implement custom catalog
    return {
        "products": [],
        "total": 0
    }


@router.post("/catalog/add")
async def add_to_catalog(
    product_id: str,
    custom_price: Optional[int] = None,
    custom_description: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """
    Add a product to reseller's custom catalog
    """
    if user.get("role") not in ["revendeur", "dropshipper"]:
        raise HTTPException(status_code=403, detail="Accès réservé aux revendeurs")
    
    # Check if product exists
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    # Add to reseller's catalog (to be implemented)
    # For now, return success
    return {
        "ok": True,
        "message": "Produit ajouté au catalogue"
    }


@router.get("/earnings")
async def get_earnings(user: dict = Depends(get_current_user)):
    """
    Get reseller's earnings
    """
    if user.get("role") not in ["revendeur", "dropshipper"]:
        raise HTTPException(status_code=403, detail="Accès réservé aux revendeurs")
    
    # Return empty for now (to be implemented)
    return {
        "earnings": [],
        "total_earnings": 0
    }
