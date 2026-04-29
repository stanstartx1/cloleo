# Authentication utilities - Shared dependencies for all routes
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timezone, timedelta
import hashlib
import jwt
import secrets
import os

from core.database import db
from models.schemas import UserRole

JWT_SECRET = os.environ.get('JWT_SECRET', secrets.token_hex(32))
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7

security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Hash a password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    return hash_password(password) == hashed


def create_token(user_id: str, role: str) -> str:
    """Create a JWT token"""
    return jwt.encode(
        {"user_id": user_id, "role": role, "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)},
        JWT_SECRET,
        algorithm=JWT_ALGORITHM
    )


def decode_token(token: str) -> dict:
    """Decode a JWT token"""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated user"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Non authentifié")
    payload = decode_token(credentials.credentials)
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur non trouvé")
    return user


async def get_current_user_optional(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user if authenticated, return None otherwise"""
    if not credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        return user
    except:
        return None


async def require_vendor(user: dict = Depends(get_current_user)):
    """Require vendor role (also allows admin)"""
    if user["role"] not in [UserRole.VENDOR, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Accès réservé aux vendeurs")
    return user


async def require_admin(user: dict = Depends(get_current_user)):
    """Require admin role"""
    if user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    return user


async def require_driver(user: dict = Depends(get_current_user)):
    """Require driver role"""
    if user["role"] != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Accès réservé aux livreurs")
    return user


async def require_dropshipper(user: dict = Depends(get_current_user)):
    """Require dropshipper role"""
    if user["role"] != UserRole.DROPSHIPPER:
        raise HTTPException(status_code=403, detail="Accès réservé aux dropshippers")
    return user
