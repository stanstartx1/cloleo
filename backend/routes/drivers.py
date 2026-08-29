from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pathlib import Path
from typing import Optional

from ..core.auth import get_current_user
from ..core.database import get_database

router = APIRouter()

@router.post("/upload-license-test")
async def test_upload_license(user: dict = Depends(get_current_user)):
    """
    Test authentication for license upload
    """
    if user.get("role") != "driver":
        raise HTTPException(status_code=403, detail="Accès réservé aux livreurs")
    
    return {"ok": True, "message": "Authentication successful"}

@router.post("/upload-license-registration")
async def upload_license_registration(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """
    Upload driver license for registration
    """
    if user.get("role") != "driver":
        raise HTTPException(status_code=403, detail="Accès réservé aux livreurs")
    
    if not file:
        raise HTTPException(status_code=400, detail="Aucun fichier fourni")
    
    # Validate file size (max 10MB)
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Le fichier est trop volumineux (max 10 MB)")
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/jpg", "application/pdf"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Type de fichier non supporté. Utilisez JPG, PNG ou PDF")
    
    # Create upload directory
    upload_dir = Path(__file__).resolve().parents[1] / "uploads" / "licenses"
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    import uuid
    ext = Path(file.filename).suffix
    filename = f"license_{user['id']}_{uuid.uuid4().hex[:8]}{ext}"
    file_path = upload_dir / filename
    
    # Save file
    file_path.write_bytes(content)
    
    # Update user document with license path
    db = get_database()
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"license_url": f"/uploads/licenses/{filename}"}}
    )
    
    return {
        "ok": True,
        "message": "Permis uploadé avec succès",
        "license_url": f"/uploads/licenses/{filename}"
    }
