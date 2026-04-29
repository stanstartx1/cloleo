# Reviews/Ratings routes
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from datetime import datetime, timezone
import uuid
import jwt
import os
import secrets

from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
from dotenv import load_dotenv

# Load env
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

# Database connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT config
JWT_SECRET = os.environ.get('JWT_SECRET', secrets.token_hex(32))
JWT_ALGORITHM = "HS256"

security = HTTPBearer(auto_error=False)

class UserRole:
    CUSTOMER = "customer"
    VENDOR = "vendor"
    ADMIN = "admin"
    DRIVER = "driver"
    DROPSHIPPER = "dropshipper"

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expire")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Non authentifie")
    payload = decode_token(credentials.credentials)
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur non trouve")
    return user

async def get_current_user_optional(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        return user
    except:
        return None

# Pydantic models
from pydantic import BaseModel, Field

class ReviewCreate(BaseModel):
    product_id: str
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None
    
class ReviewUpdate(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = None

router = APIRouter(tags=["reviews"])

# ============== REVIEWS/RATINGS SYSTEM ==============

@router.post("/reviews")
async def create_review(data: ReviewCreate, user: dict = Depends(get_current_user)):
    """Create a new review for a product"""
    # Check if product exists
    product = await db.products.find_one({"id": data.product_id, "status": "approved"})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouve")
    
    # Check if user already reviewed this product
    existing = await db.reviews.find_one({
        "user_id": user["id"],
        "product_id": data.product_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="Vous avez deja note ce produit")
    
    # Check if user has purchased this product (optional but recommended)
    order = await db.orders.find_one({
        "customer_id": user["id"],
        "status": "delivered",
        "items.product_id": data.product_id
    })
    
    review = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_name": user.get("name", "Anonyme"),
        "product_id": data.product_id,
        "seller_id": product.get("seller_id"),
        "rating": data.rating,
        "comment": data.comment,
        "is_verified_purchase": order is not None,
        "is_approved": True,  # Auto-approve for now
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "helpful_count": 0,
        "reported": False
    }
    
    await db.reviews.insert_one(review)
    
    # Update product average rating
    await update_product_rating(data.product_id)
    
    # Update seller average rating
    if product.get("seller_id"):
        await update_seller_rating(product.get("seller_id"))
    
    return {
        "message": "Avis publie avec succes",
        "review": {k: v for k, v in review.items() if k != "_id"}
    }

@router.get("/reviews/product/{product_id}")
async def get_product_reviews(
    product_id: str, 
    page: int = 1, 
    limit: int = 10,
    sort: str = "recent"  # recent, helpful, highest, lowest
):
    """Get all reviews for a product"""
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouve")
    
    # Build sort order
    sort_order = {"created_at": -1}  # Default: most recent
    if sort == "helpful":
        sort_order = {"helpful_count": -1, "created_at": -1}
    elif sort == "highest":
        sort_order = {"rating": -1, "created_at": -1}
    elif sort == "lowest":
        sort_order = {"rating": 1, "created_at": -1}
    
    skip = (page - 1) * limit
    query = {"product_id": product_id, "is_approved": True}
    
    total = await db.reviews.count_documents(query)
    reviews = await db.reviews.find(query, {"_id": 0}).sort(list(sort_order.items())).skip(skip).limit(limit).to_list(limit)
    
    # Calculate rating distribution
    pipeline = [
        {"$match": {"product_id": product_id, "is_approved": True}},
        {"$group": {"_id": "$rating", "count": {"$sum": 1}}}
    ]
    distribution_result = await db.reviews.aggregate(pipeline).to_list(10)
    distribution = {str(i): 0 for i in range(1, 6)}
    for item in distribution_result:
        distribution[str(item["_id"])] = item["count"]
    
    # Calculate average
    avg_rating = product.get("rating", 0)
    review_count = product.get("review_count", total)
    
    return {
        "reviews": reviews,
        "total": total,
        "page": page,
        "total_pages": (total + limit - 1) // limit,
        "average_rating": round(avg_rating, 1),
        "review_count": review_count,
        "distribution": distribution
    }

@router.get("/reviews/seller/{seller_id}")
async def get_seller_reviews(seller_id: str, page: int = 1, limit: int = 10):
    """Get all reviews for a seller's products"""
    seller = await db.users.find_one({"id": seller_id}, {"_id": 0})
    if not seller:
        raise HTTPException(status_code=404, detail="Vendeur non trouve")
    
    skip = (page - 1) * limit
    query = {"seller_id": seller_id, "is_approved": True}
    
    total = await db.reviews.count_documents(query)
    reviews = await db.reviews.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Add product info to each review
    for review in reviews:
        product = await db.products.find_one({"id": review["product_id"]}, {"_id": 0, "name": 1, "images": 1})
        review["product"] = product
    
    return {
        "reviews": reviews,
        "total": total,
        "page": page,
        "total_pages": (total + limit - 1) // limit,
        "seller_rating": seller.get("average_rating", 0),
        "seller_review_count": seller.get("review_count", 0)
    }

@router.get("/reviews/my-reviews")
async def get_my_reviews(user: dict = Depends(get_current_user)):
    """Get all reviews written by the current user"""
    reviews = await db.reviews.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Add product info to each review
    for review in reviews:
        product = await db.products.find_one({"id": review["product_id"]}, {"_id": 0, "name": 1, "images": 1})
        review["product"] = product
    
    return {"reviews": reviews, "total": len(reviews)}

@router.put("/reviews/{review_id}")
async def update_review(review_id: str, data: ReviewUpdate, user: dict = Depends(get_current_user)):
    """Update an existing review"""
    review = await db.reviews.find_one({"id": review_id, "user_id": user["id"]})
    if not review:
        raise HTTPException(status_code=404, detail="Avis non trouve ou non autorise")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if data.rating is not None:
        update_data["rating"] = data.rating
    if data.comment is not None:
        update_data["comment"] = data.comment
    
    await db.reviews.update_one({"id": review_id}, {"$set": update_data})
    
    # Update product and seller ratings
    await update_product_rating(review["product_id"])
    if review.get("seller_id"):
        await update_seller_rating(review["seller_id"])
    
    return {"message": "Avis mis a jour"}

@router.delete("/reviews/{review_id}")
async def delete_review(review_id: str, user: dict = Depends(get_current_user)):
    """Delete a review"""
    review = await db.reviews.find_one({"id": review_id})
    if not review:
        raise HTTPException(status_code=404, detail="Avis non trouve")
    
    # Allow deletion by review owner or admin
    if review["user_id"] != user["id"] and user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Non autorise")
    
    product_id = review["product_id"]
    seller_id = review.get("seller_id")
    
    await db.reviews.delete_one({"id": review_id})
    
    # Update ratings
    await update_product_rating(product_id)
    if seller_id:
        await update_seller_rating(seller_id)
    
    return {"message": "Avis supprime"}

@router.post("/reviews/{review_id}/helpful")
async def mark_review_helpful(review_id: str, user: dict = Depends(get_current_user_optional)):
    """Mark a review as helpful"""
    review = await db.reviews.find_one({"id": review_id})
    if not review:
        raise HTTPException(status_code=404, detail="Avis non trouve")
    
    # Increment helpful count
    await db.reviews.update_one({"id": review_id}, {"$inc": {"helpful_count": 1}})
    
    return {"message": "Merci pour votre retour"}

@router.post("/reviews/{review_id}/report")
async def report_review(review_id: str, reason: str = "inappropriate", user: dict = Depends(get_current_user)):
    """Report a review as inappropriate"""
    review = await db.reviews.find_one({"id": review_id})
    if not review:
        raise HTTPException(status_code=404, detail="Avis non trouve")
    
    await db.reviews.update_one({"id": review_id}, {"$set": {"reported": True, "report_reason": reason}})
    
    return {"message": "Signalement envoye"}

@router.get("/reviews/check/{product_id}")
async def check_can_review(product_id: str, user: dict = Depends(get_current_user_optional)):
    """Check if user can review a product"""
    if not user:
        return {"can_review": False, "reason": "not_logged_in"}
    
    # Check if already reviewed
    existing = await db.reviews.find_one({"user_id": user["id"], "product_id": product_id})
    if existing:
        return {"can_review": False, "reason": "already_reviewed", "review_id": existing["id"]}
    
    # Check if purchased
    order = await db.orders.find_one({
        "customer_id": user["id"],
        "status": "delivered",
        "items.product_id": product_id
    })
    
    return {
        "can_review": True,
        "is_verified_purchase": order is not None
    }

# ============== HELPER FUNCTIONS ==============

async def update_product_rating(product_id: str):
    """Recalculate and update product average rating"""
    pipeline = [
        {"$match": {"product_id": product_id, "is_approved": True}},
        {"$group": {
            "_id": None,
            "avg_rating": {"$avg": "$rating"},
            "count": {"$sum": 1}
        }}
    ]
    result = await db.reviews.aggregate(pipeline).to_list(1)
    
    if result:
        avg_rating = round(result[0]["avg_rating"], 1)
        count = result[0]["count"]
    else:
        avg_rating = 0
        count = 0
    
    await db.products.update_one(
        {"id": product_id},
        {"$set": {"rating": avg_rating, "review_count": count}}
    )

async def update_seller_rating(seller_id: str):
    """Recalculate and update seller average rating"""
    pipeline = [
        {"$match": {"seller_id": seller_id, "is_approved": True}},
        {"$group": {
            "_id": None,
            "avg_rating": {"$avg": "$rating"},
            "count": {"$sum": 1}
        }}
    ]
    result = await db.reviews.aggregate(pipeline).to_list(1)
    
    if result:
        avg_rating = round(result[0]["avg_rating"], 1)
        count = result[0]["count"]
    else:
        avg_rating = 0
        count = 0
    
    await db.users.update_one(
        {"id": seller_id},
        {"$set": {"average_rating": avg_rating, "review_count": count}}
    )
