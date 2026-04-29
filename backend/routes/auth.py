# Authentication routes
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPAuthorizationCredentials

from datetime import datetime, timezone, timedelta
import hashlib
import jwt
import secrets
import uuid
import os

from core.database import db
from models.schemas import UserRegister, UserLogin, UserRole

JWT_SECRET = os.environ.get('JWT_SECRET', secrets.token_hex(32))
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7

router = APIRouter(prefix="/auth", tags=["Authentication"])


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed


def create_token(user_id: str, role: str) -> str:
    return jwt.encode(
        {"user_id": user_id, "role": role, "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)},
        JWT_SECRET,
        algorithm=JWT_ALGORITHM
    )


@router.post("/register")
async def register(data: UserRegister):
    """Register a new user"""
    if await db.users.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    # Vendors need admin approval
    is_vendor = data.role == UserRole.VENDOR
    
    user = {
        "id": str(uuid.uuid4()),
        "email": data.email,
        "password": hash_password(data.password),
        "name": data.name,
        "role": data.role,
        "phone": data.phone,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_active": not is_vendor,
        "is_verified": not is_vendor,
        "subscription_plan": "free" if is_vendor else None,
        "subscription_expires": None,
        "shop_name": data.name if is_vendor else None,
        "location": None,
        "city": None
    }
    await db.users.insert_one(user)
    return {
        "token": create_token(user["id"], user["role"]),
        "user": {k: v for k, v in user.items() if k not in ["password", "_id"]}
    }


@router.post("/login")
async def login(data: UserLogin):
    """Login a user"""
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Identifiants incorrects")
    
    # Allow drivers and vendors to login even if not active
    if not user.get("is_active", True) and user.get("role") not in [UserRole.DRIVER, UserRole.VENDOR]:
        raise HTTPException(status_code=401, detail="Compte désactivé")
    
    return {
        "token": create_token(user["id"], user["role"]),
        "user": {k: v for k, v in user.items() if k != "password"}
    }


# Export auth utilities for other modules
__all__ = ['router', 'hash_password', 'verify_password', 'create_token', 'JWT_SECRET', 'JWT_ALGORITHM']
