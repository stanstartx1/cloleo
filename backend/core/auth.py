# Authentication utilities - Shared dependencies for all routes
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timezone, timedelta
import hashlib
import jwt
import secrets
import os
from pymongo.errors import PyMongoError

from core.database import db
from models.schemas import UserRole

JWT_SECRET = os.environ.get("JWT_SECRET", secrets.token_hex(32))
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7

security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed


def create_token(user_id: str, role: str) -> str:
    return jwt.encode(
        {"user_id": user_id, "role": role, "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)},
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expire")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")


def _local_admin_user() -> dict:
    return {
        "id": "local-admin",
        "email": os.environ.get("LOCAL_ADMIN_EMAIL", "admin@cloleo.com"),
        "name": os.environ.get("LOCAL_ADMIN_NAME", "Admin Cloleo"),
        "role": UserRole.ADMIN,
        "is_active": True,
        "is_verified": True,
    }


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Non authentifie")
    payload = decode_token(credentials.credentials)

    if payload.get("user_id") == "local-admin" and payload.get("role") == UserRole.ADMIN:
        return _local_admin_user()

    try:
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
    except PyMongoError:
        raise HTTPException(status_code=503, detail="Base de donnees indisponible")
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur non trouve")
    return user


async def get_current_user_optional(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
        if payload.get("user_id") == "local-admin" and payload.get("role") == UserRole.ADMIN:
            return _local_admin_user()
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        return user
    except Exception:
        return None


async def require_vendor(user: dict = Depends(get_current_user)):
    if user["role"] not in [UserRole.VENDOR, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Acces reserve aux vendeurs")
    return user


async def require_admin(user: dict = Depends(get_current_user)):
    if user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Acces reserve aux administrateurs")
    return user


async def require_driver(user: dict = Depends(get_current_user)):
    if user["role"] != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Acces reserve aux livreurs")
    if not user.get("is_active", False) or not user.get("is_verified", False):
        raise HTTPException(status_code=403, detail="Compte livreur en attente d'approbation")
    return user


async def require_dropshipper(user: dict = Depends(get_current_user)):
    if user["role"] != UserRole.DROPSHIPPER:
        raise HTTPException(status_code=403, detail="Acces reserve aux dropshippers")
    if not user.get("is_active", False) or not user.get("is_verified", False):
        raise HTTPException(status_code=403, detail="Compte revendeur en attente d'approbation")
    return user
