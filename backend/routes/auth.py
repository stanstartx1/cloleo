# Authentication routes
from fastapi import APIRouter, HTTPException

from datetime import datetime, timezone, timedelta
import hashlib
import jwt
import secrets
import uuid
import os
from pymongo.errors import PyMongoError

from core.database import db
from models.schemas import (
    UserRegister,
    UserLogin,
    UserRole,
    DropshipperRegister,
    DriverRegister,
)

JWT_SECRET = os.environ.get("JWT_SECRET", secrets.token_hex(32))
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
        algorithm=JWT_ALGORITHM,
    )


def normalize_role(raw_role: str | None) -> str:
    role = (raw_role or "").strip().lower()
    aliases = {
        "customer": UserRole.CUSTOMER,
        "client": UserRole.CUSTOMER,
        "acheteur": UserRole.CUSTOMER,
        "buyer": UserRole.CUSTOMER,
        "vendor": UserRole.VENDOR,
        "vendeur": UserRole.VENDOR,
        "seller": UserRole.VENDOR,
        "admin": UserRole.ADMIN,
        "driver": UserRole.DRIVER,
        "livreur": UserRole.DRIVER,
        "dropshipper": UserRole.DROPSHIPPER,
        "revendeur": UserRole.DROPSHIPPER,
        "reseller": UserRole.DROPSHIPPER,
    }
    return aliases.get(role, role)


async def _get_platform_settings() -> dict:
    """Fetch platform settings from DB (auto-approve flags)."""
    try:
        doc = await db.settings.find_one({"type": "platform"}, {"_id": 0})
        return doc or {}
    except Exception:
        return {}


@router.post("/register")
async def register(data: UserRegister):
    """Register a new user."""
    normalized_role = normalize_role(data.role)
    if normalized_role not in {
        UserRole.CUSTOMER,
        UserRole.VENDOR,
        UserRole.DRIVER,
        UserRole.DROPSHIPPER,
        UserRole.ADMIN,
    }:
        raise HTTPException(status_code=400, detail="Role utilisateur invalide")

    if await db.users.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="Email deja utilise")

    platform = await _get_platform_settings()
    is_vendor = normalized_role == UserRole.VENDOR
    auto_approve_vendor = bool(platform.get("auto_approve_vendors", False))

    # If auto-approve is ON for vendors, activate immediately; otherwise pending.
    vendor_approved = is_vendor and auto_approve_vendor

    user = {
        "id": str(uuid.uuid4()),
        "email": data.email,
        "password": hash_password(data.password),
        "name": data.name,
        "role": normalized_role,
        "phone": data.phone,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_active": (not is_vendor) or vendor_approved,
        "is_verified": (not is_vendor) or vendor_approved,
        "approval_status": "approved" if (not is_vendor or vendor_approved) else "pending",
        "subscription_plan": "free" if is_vendor else None,
        "subscription_expires": None,
        "shop_name": data.name if is_vendor else None,
        "location": None,
        "city": None,
    }
    await db.users.insert_one(user)
    return {
        "token": create_token(user["id"], user["role"]),
        "user": {k: v for k, v in user.items() if k not in ["password", "_id"]},
    }


@router.post("/login")
async def login(data: UserLogin):
    """Login a user."""
    local_admin_email = os.environ.get("LOCAL_ADMIN_EMAIL", "admin@cloleo.com")
    local_admin_password = os.environ.get("LOCAL_ADMIN_PASSWORD", "cloclo@2026!")
    if data.email == local_admin_email and data.password == local_admin_password:
        local_user = {
            "id": "local-admin",
            "email": local_admin_email,
            "name": os.environ.get("LOCAL_ADMIN_NAME", "Admin Cloleo"),
            "role": UserRole.ADMIN,
            "is_active": True,
            "is_verified": True,
        }
        return {"token": create_token(local_user["id"], local_user["role"]), "user": local_user}

    try:
        user = await db.users.find_one({"email": data.email}, {"_id": 0})
    except PyMongoError:
        user = None

    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Identifiants incorrects")

    if not user.get("is_active", True):
        # Check if auto-approve is enabled for this user's role
        try:
            platform = await db.settings.find_one({"type": "platform"}, {"_id": 0}) or {}
            role = user.get("role", "")
            auto = (
                (role == "vendor" and platform.get("auto_approve_vendors")) or
                (role == "dropshipper" and platform.get("auto_approve_revendeurs")) or
                (role == "driver" and platform.get("auto_approve_drivers")) or
                (role == "enterprise" and platform.get("auto_approve_enterprises"))
            )
            if auto:
                await db.users.update_one(
                    {"id": user["id"]},
                    {"$set": {"is_active": True, "is_verified": True,
                              "approval_status": "approved",
                              "updated_at": datetime.now(timezone.utc).isoformat()}}
                )
                user = {**user, "is_active": True, "is_verified": True}
            else:
                raise HTTPException(status_code=401, detail="Compte en attente d'approbation administrateur")
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=401, detail="Compte en attente d'approbation administrateur")

    return {
        "token": create_token(user["id"], user["role"]),
        "user": {k: v for k, v in user.items() if k != "password"},
    }


@router.post("/register/revendeur")
@router.post("/register/dropshipper")
async def register_revendeur(data: DropshipperRegister):
    if await db.users.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="Email deja utilise")

    shop_name = data.shop_name or f"Boutique de {data.name}"
    shop_slug = shop_name.lower().strip().replace(" ", "-")
    existing_slug = await db.users.find_one({"shop_slug": shop_slug}, {"_id": 0, "id": 1})
    if existing_slug:
        shop_slug = f"{shop_slug}-{str(uuid.uuid4())[:6]}"

    platform = await _get_platform_settings()
    auto_approve = bool(platform.get("auto_approve_revendeurs", False))

    user = {
        "id": str(uuid.uuid4()),
        "email": data.email,
        "password": hash_password(data.password),
        "name": data.name,
        "phone": data.phone,
        "role": UserRole.DROPSHIPPER,
        "shop_name": shop_name,
        "shop_slug": shop_slug,
        "shop_description": data.shop_description,
        "is_active": auto_approve,
        "is_verified": auto_approve,
        "approval_status": "approved" if auto_approve else "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)
    return {
        "token": create_token(user["id"], user["role"]),
        "user": {k: v for k, v in user.items() if k not in {"password", "_id"}},
    }


@router.post("/register/driver")
@router.post("/register/livreur")
async def register_driver(data: DriverRegister):
    if await db.users.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="Email deja utilise")

    platform = await _get_platform_settings()
    auto_approve = bool(platform.get("auto_approve_drivers", False))

    user = {
        "id": str(uuid.uuid4()),
        "email": data.email,
        "password": hash_password(data.password),
        "name": data.name,
        "phone": data.phone,
        "role": UserRole.DRIVER,
        "vehicle_type": data.vehicle_type,
        "license_number": data.license_number,
        "city": data.city,
        "country": data.country or "Cote d'Ivoire",
        "driver_status": "offline",
        "is_active": auto_approve,
        "is_verified": auto_approve,
        "approval_status": "approved" if auto_approve else "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)
    return {
        "token": create_token(user["id"], user["role"]),
        "user": {k: v for k, v in user.items() if k not in {"password", "_id"}},
    }


# Export auth utilities for other modules
__all__ = ["router", "hash_password", "verify_password", "create_token", "JWT_SECRET", "JWT_ALGORITHM"]
