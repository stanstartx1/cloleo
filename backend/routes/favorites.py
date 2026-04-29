# Favorites routes - User favorites system
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid

from core.database import db
from core.auth import get_current_user_optional

router = APIRouter(prefix="/user/favorites", tags=["Favorites"])


@router.post("/{product_id}")
async def add_user_favorite(product_id: str, user: dict = Depends(get_current_user_optional)):
    """Add a product to user's favorites (requires authentication)"""
    if not user:
        raise HTTPException(status_code=401, detail="Connectez-vous pour ajouter aux favoris")
    
    product = await db.products.find_one({"id": product_id, "status": "approved"})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    # Check if already favorited
    existing = await db.user_favorites.find_one({"user_id": user["id"], "product_id": product_id})
    if existing:
        return {"message": "Déjà dans vos favoris", "is_favorite": True}
    
    await db.user_favorites.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "product_id": product_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Ajouté aux favoris", "is_favorite": True}


@router.delete("/{product_id}")
async def remove_user_favorite(product_id: str, user: dict = Depends(get_current_user_optional)):
    """Remove a product from user's favorites"""
    if not user:
        raise HTTPException(status_code=401, detail="Connectez-vous pour gérer vos favoris")
    
    result = await db.user_favorites.delete_one({"user_id": user["id"], "product_id": product_id})
    if result.deleted_count == 0:
        return {"message": "Produit non trouvé dans vos favoris", "is_favorite": False}
    
    return {"message": "Retiré des favoris", "is_favorite": False}


@router.get("")
async def get_user_favorites(user: dict = Depends(get_current_user_optional)):
    """Get all user's favorite products with details"""
    if not user:
        raise HTTPException(status_code=401, detail="Connectez-vous pour voir vos favoris")
    
    favorites = await db.user_favorites.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    products = []
    for fav in favorites:
        product = await db.products.find_one({"id": fav["product_id"], "status": "approved"}, {"_id": 0})
        if product:
            # Get seller info
            seller = await db.users.find_one({"id": product.get("seller_id")}, {"_id": 0, "password": 0})
            product["seller"] = seller
            product["favorited_at"] = fav["created_at"]
            products.append(product)
    
    return {"favorites": products, "total": len(products)}


@router.get("/check/{product_id}")
async def check_user_favorite(product_id: str, user: dict = Depends(get_current_user_optional)):
    """Check if a product is in user's favorites"""
    if not user:
        return {"is_favorite": False}
    
    existing = await db.user_favorites.find_one({"user_id": user["id"], "product_id": product_id})
    return {"is_favorite": existing is not None}


# Session-based favorites (for guests)
session_favorites_router = APIRouter(prefix="/favorites", tags=["Session Favorites"])


@session_favorites_router.post("/{session_id}/{product_id}")
async def add_session_favorite(session_id: str, product_id: str):
    """Add to session favorites (for guests)"""
    if not await db.favorites.find_one({"session_id": session_id, "product_id": product_id}):
        await db.favorites.insert_one({
            "id": str(uuid.uuid4()),
            "session_id": session_id,
            "product_id": product_id
        })
    return {"message": "Ajouté"}


@session_favorites_router.delete("/{session_id}/{product_id}")
async def remove_session_favorite(session_id: str, product_id: str):
    """Remove from session favorites"""
    await db.favorites.delete_one({"session_id": session_id, "product_id": product_id})
    return {"message": "Supprimé"}


@session_favorites_router.get("/{session_id}")
async def get_session_favorites(session_id: str):
    """Get session favorites"""
    favs = await db.favorites.find({"session_id": session_id}, {"_id": 0}).to_list(100)
    result = []
    for f in favs:
        p = await db.products.find_one({"id": f["product_id"], "status": "approved"}, {"_id": 0})
        if p:
            result.append(p)
    return result
