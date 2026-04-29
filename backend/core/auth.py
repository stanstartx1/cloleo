# Authentication utilities
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import secrets
import os

from core.database import db

JWT_SECRET = os.environ.get('JWT_SECRET', secrets.token_hex(32))
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7

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
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
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
    if user["role"] != UserRole.VENDOR:
        raise HTTPException(status_code=403, detail="Accès réservé aux vendeurs")
    return user

async def require_admin(user: dict = Depends(get_current_user)):
    if user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    return user

async def require_driver(user: dict = Depends(get_current_user)):
    if user["role"] != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Accès réservé aux livreurs")
    return user

async def require_dropshipper(user: dict = Depends(get_current_user)):
    if user["role"] != UserRole.DROPSHIPPER:
        raise HTTPException(status_code=403, detail="Accès réservé aux dropshippers")
    return user
