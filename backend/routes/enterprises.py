from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from core.database import db
from core.auth import get_current_user, require_admin

router = APIRouter(prefix="/enterprises", tags=["enterprises"])

class EnterpriseRegister(BaseModel):
    email: str
    password: str
    company_name: str
    contact_person: str
    phone: str
    business_type: str
    year_founded: Optional[str] = None
    number_of_employees: Optional[str] = None
    business_sector: Optional[str] = None
    company_description: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    certifications: Optional[List[str]] = []
    dfe_number: Optional[str] = None
    trade_register_number: Optional[str] = None
    tax_id: Optional[str] = None
    legal_form: Optional[str] = None
    capital: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    documents: Optional[dict] = {}

class EnterpriseUpdate(BaseModel):
    company_name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    business_type: Optional[str] = None
    year_founded: Optional[str] = None
    number_of_employees: Optional[str] = None
    business_sector: Optional[str] = None
    company_description: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    certifications: Optional[List[str]] = None
    profile_photo: Optional[str] = None
    dfe_number: Optional[str] = None

@router.post("/register")
async def register_enterprise(data: EnterpriseRegister):
    """Register a new enterprise"""
    try:
        # Check if email already exists
        existing_user = await db.users.find_one({"email": data.email})
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Check platform settings for auto-approval
        platform = await db.settings.find_one({"type": "platform"}, {"_id": 0}) or {}
        auto_approve = bool(platform.get("auto_approve_enterprises", False))
        
        # Create enterprise user
        from core.auth import hash_password
        import uuid
        enterprise_data = {
            "id": str(uuid.uuid4()),
            "email": data.email,
            "password": hash_password(data.password),
            "role": "enterprise",
            "company_name": data.company_name,
            "contact_person": data.contact_person,
            "phone": data.phone,
            "business_type": data.business_type,
            "year_founded": data.year_founded,
            "number_of_employees": data.number_of_employees,
            "business_sector": data.business_sector,
            "company_description": data.company_description,
            "city": data.city,
            "country": data.country,
            "certifications": data.certifications,
            "dfe_number": data.dfe_number,
            "trade_register_number": data.trade_register_number,
            "tax_id": data.tax_id,
            "legal_form": data.legal_form,
            "capital": data.capital,
            "address": data.address,
            "website": data.website,
            "company_slug": data.company_name.lower().replace(" ", "-"),
            "created_at": datetime.utcnow(),
            "is_active": auto_approve,
            "is_verified": auto_approve,
            "approval_status": "approved" if auto_approve else "pending",
            "documents": data.documents or {}
        }
        
        result = await db.users.insert_one(enterprise_data)
        return {"message": "Enterprise registered successfully", "id": str(result.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list")
async def list_enterprises(limit: int = 20, skip: int = 0):
    """List all enterprises"""
    try:
        enterprises = await db.users.find({"role": "enterprise", "is_active": True}).skip(skip).limit(limit).to_list(length=limit)
        
        # Format enterprises for frontend
        formatted_enterprises = []
        for enterprise in enterprises:
            formatted_enterprises.append({
                "id": str(enterprise["_id"]),
                "company_name": enterprise.get("company_name", ""),
                "company_slug": enterprise.get("company_slug", ""),
                "business_type": enterprise.get("business_type", ""),
                "contact_person": enterprise.get("contact_person", ""),
                "phone": enterprise.get("phone", ""),
                "year_founded": enterprise.get("year_founded", ""),
                "number_of_employees": enterprise.get("number_of_employees", ""),
                "business_sector": enterprise.get("business_sector", ""),
                "company_description": enterprise.get("company_description", ""),
                "city": enterprise.get("city", ""),
                "country": enterprise.get("country", ""),
                "certifications": enterprise.get("certifications", []),
                "profile_photo": enterprise.get("profile_photo", ""),
                "dfe_number": enterprise.get("dfe_number", ""),
                "average_rating": enterprise.get("average_rating", 0),
                "total_products": enterprise.get("total_products", 0),
                "created_at": enterprise.get("created_at", "")
            })
        
        return {"enterprises": formatted_enterprises, "total": len(formatted_enterprises)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/profile/{company_slug}")
async def get_enterprise_profile(company_slug: str):
    """Get enterprise profile by slug"""
    try:
        enterprise = await db.users.find_one({"company_slug": company_slug, "role": "enterprise"})
        if not enterprise:
            raise HTTPException(status_code=404, detail="Enterprise not found")
        
        return {
            "id": str(enterprise["_id"]),
            "company_name": enterprise.get("company_name", ""),
            "company_slug": enterprise.get("company_slug", ""),
            "business_type": enterprise.get("business_type", ""),
            "contact_person": enterprise.get("contact_person", ""),
            "phone": enterprise.get("phone", ""),
            "year_founded": enterprise.get("year_founded", ""),
            "number_of_employees": enterprise.get("number_of_employees", ""),
            "business_sector": enterprise.get("business_sector", ""),
            "company_description": enterprise.get("company_description", ""),
            "city": enterprise.get("city", ""),
            "country": enterprise.get("country", ""),
            "certifications": enterprise.get("certifications", []),
            "profile_photo": enterprise.get("profile_photo", ""),
            "dfe_number": enterprise.get("dfe_number", ""),
            "average_rating": enterprise.get("average_rating", 0),
            "total_products": enterprise.get("total_products", 0),
            "created_at": enterprise.get("created_at", "")
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard")
async def get_enterprise_dashboard(current_user = Depends(get_current_user)):
    """Get enterprise dashboard stats"""
    try:
        if current_user.get("role") != "enterprise":
            raise HTTPException(status_code=403, detail="Not an enterprise user")
        
        # Get enterprise stats
        enterprise_id = str(current_user.get("_id"))
        
        # Count products
        total_products = await db.products.count_documents({"seller_id": enterprise_id})
        
        # Count orders
        total_orders = await db.orders.count_documents({"seller_id": enterprise_id})
        
        # Calculate total revenue
        orders = await db.orders.find({"seller_id": enterprise_id}).to_list(length=None)
        total_revenue = sum(order.get("total_fcfa", 0) for order in orders)
        
        # Get recent orders
        recent_orders = await db.orders.find({"seller_id": enterprise_id}).sort("created_at", -1).limit(10).to_list(length=10)
        
        # Get pending orders
        pending_orders = await db.orders.count_documents({"seller_id": enterprise_id, "status": "pending"})
        
        # Get completed orders
        completed_orders = await db.orders.count_documents({"seller_id": enterprise_id, "status": "delivered"})
        
        # Get products by status
        active_products = await db.products.count_documents({"seller_id": enterprise_id, "status": "approved"})
        pending_products = await db.products.count_documents({"seller_id": enterprise_id, "status": "pending"})
        
        return {
            "total_products": total_products,
            "total_orders": total_orders,
            "total_revenue": total_revenue,
            "total_visitors": 0,  # To be implemented
            "pending_orders": pending_orders,
            "completed_orders": completed_orders,
            "active_products": active_products,
            "pending_products": pending_products,
            "recent_orders": recent_orders
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/profile")
async def update_enterprise_profile(data: EnterpriseUpdate, current_user = Depends(get_current_user)):
    """Update enterprise profile"""
    try:
        if current_user.get("role") != "enterprise":
            raise HTTPException(status_code=403, detail="Not an enterprise user")
        
        enterprise_id = current_user.get("_id")
        
        # Build update data
        update_data = {}
        for field, value in data.dict(exclude_unset=True).items():
            if value is not None:
                update_data[field] = value
        
        if update_data.get("company_name"):
            update_data["company_slug"] = update_data["company_name"].lower().replace(" ", "-")
        
        await db.users.update_one(
            {"_id": enterprise_id},
            {"$set": update_data}
        )
        
        return {"message": "Profile updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload-photo")
async def upload_enterprise_photo(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    """Upload enterprise profile photo"""
    try:
        if current_user.get("role") != "enterprise":
            raise HTTPException(status_code=403, detail="Not an enterprise user")
        
        # Save file
        import os
        import uuid
        from pathlib import Path
        
        upload_dir = Path("/var/www/cloleo/backend/uploads")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        file_extension = file.filename.split(".")[-1]
        file_name = f"{uuid.uuid4()}.{file_extension}"
        file_path = upload_dir / file_name
        
        with open(file_path, "wb") as f:
            f.write(await file.read())
        
        # Update user profile
        await db.users.update_one(
            {"_id": current_user.get("_id")},
            {"$set": {"profile_photo": f"/uploads/{file_name}"}}
        )
        
        return {"message": "Photo uploaded successfully", "url": f"/uploads/{file_name}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload-document")
async def upload_enterprise_document(
    document_type: str = Form(...),
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    """Upload enterprise document (DFE, trade register, etc.)"""
    try:
        if current_user.get("role") != "enterprise":
            raise HTTPException(status_code=403, detail="Not an enterprise user")
        
        # Validate document type
        valid_types = ["dfe", "trade_register", "tax_id", "legal_form", "other"]
        if document_type not in valid_types:
            raise HTTPException(status_code=400, detail="Invalid document type")
        
        # Save file
        import os
        import uuid
        from pathlib import Path
        
        upload_dir = Path("/var/www/cloleo/backend/uploads/enterprise_documents")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        file_extension = file.filename.split(".")[-1]
        file_name = f"{document_type}_{uuid.uuid4()}.{file_extension}"
        file_path = upload_dir / file_name
        
        with open(file_path, "wb") as f:
            f.write(await file.read())
        
        # Update user documents
        await db.users.update_one(
            {"_id": current_user.get("_id")},
            {"$set": {f"documents.{document_type}": f"/uploads/enterprise_documents/{file_name}"}}
        )
        
        return {"message": "Document uploaded successfully", "url": f"/uploads/enterprise_documents/{file_name}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload-document-temp")
async def upload_enterprise_document_temp(
    document_type: str = Form(...),
    file: UploadFile = File(...)
):
    """Upload enterprise document during registration (no auth required)"""
    try:
        # Validate document type
        valid_types = ["dfe", "trade_register", "tax_id", "legal_form", "other"]
        if document_type not in valid_types:
            raise HTTPException(status_code=400, detail="Invalid document type")
        
        # Save file
        import os
        import uuid
        from pathlib import Path
        
        upload_dir = Path("/var/www/cloleo/backend/uploads/enterprise_documents")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        file_extension = file.filename.split(".")[-1]
        file_name = f"{document_type}_temp_{uuid.uuid4()}.{file_extension}"
        file_path = upload_dir / file_name
        
        with open(file_path, "wb") as f:
            f.write(await file.read())
        
        return {"message": "Document uploaded successfully", "url": f"/uploads/enterprise_documents/{file_name}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/documents")
async def get_enterprise_documents(current_user = Depends(get_current_user)):
    """Get all uploaded documents for enterprise"""
    try:
        if current_user.get("role") != "enterprise":
            raise HTTPException(status_code=403, detail="Not an enterprise user")
        
        user = await db.users.find_one({"_id": current_user.get("_id")})
        documents = user.get("documents", {})
        
        return {"documents": documents}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Admin endpoints for enterprise management
@router.get("/admin/list")
async def admin_list_enterprises(admin = Depends(require_admin)):
    """List all enterprises for admin"""
    try:
        enterprises = await db.users.find({"role": "enterprise"}).to_list(length=None)
        
        formatted_enterprises = []
        for enterprise in enterprises:
            formatted_enterprises.append({
                "id": enterprise.get("id", str(enterprise.get("_id"))),
                "company_name": enterprise.get("company_name", ""),
                "email": enterprise.get("email", ""),
                "contact_person": enterprise.get("contact_person", ""),
                "phone": enterprise.get("phone", ""),
                "business_type": enterprise.get("business_type", ""),
                "is_verified": enterprise.get("is_verified", False),
                "is_active": enterprise.get("is_active", True),
                "documents": enterprise.get("documents", {}),
                "created_at": enterprise.get("created_at", "")
            })
        
        return {"enterprises": formatted_enterprises}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/admin/{enterprise_id}/verify")
async def admin_verify_enterprise(enterprise_id: str, admin = Depends(require_admin)):
    """Verify and activate an enterprise"""
    try:
        result = await db.users.update_one(
            {"id": enterprise_id, "role": "enterprise"},
            {"$set": {"is_verified": True, "is_active": True}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Enterprise not found")
        
        return {"message": "Enterprise verified successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/admin/{enterprise_id}")
async def admin_delete_enterprise(enterprise_id: str, admin = Depends(require_admin)):
    """Delete an enterprise"""
    try:
        result = await db.users.delete_one({"id": enterprise_id, "role": "enterprise"})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Enterprise not found")
        
        return {"message": "Enterprise deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
