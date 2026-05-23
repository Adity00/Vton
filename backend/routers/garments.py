import os
import shutil
import tempfile
from typing import Optional, List
from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query
from pydantic import BaseModel

from database.connection import get_collection
from services.cloudinary_service import (
    upload_image,
    delete_image,
    get_public_id_from_url,
)

router = APIRouter()

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


# ---------------------------------------------------------------------------
# Response schema (for serialization — converts ObjectId _id to string)
# ---------------------------------------------------------------------------

class GarmentResponse(BaseModel):
    id: str
    name: str
    category: str
    fit_type: str
    render_mode: str
    image_url: str
    garment_image_url: str
    torso_ratio: float
    shoulder_ratio: float
    sleeve_ratio: float
    drape_factor: float
    created_at: datetime

    class Config:
        populate_by_name = True


def _doc_to_response(doc: dict) -> GarmentResponse:
    """Convert a raw MongoDB document (with ObjectId) to a GarmentResponse."""
    return GarmentResponse(
        id=str(doc["_id"]),
        name=doc["name"],
        category=doc["category"],
        fit_type=doc["fit_type"],
        render_mode=doc.get("render_mode", "overlay"),
        image_url=doc["image_url"],
        garment_image_url=doc["garment_image_url"],
        torso_ratio=doc.get("torso_ratio", 1.0),
        shoulder_ratio=doc.get("shoulder_ratio", 1.0),
        sleeve_ratio=doc.get("sleeve_ratio", 0.85),
        drape_factor=doc.get("drape_factor", 0.5),
        created_at=doc.get("created_at", datetime.now()),
    )


def _save_temp_file(upload_file: UploadFile, prefix: str) -> str:
    """Save an UploadFile to a temp file on disk and return the path."""
    ext = os.path.splitext(upload_file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )
    tmp_fd, tmp_path = tempfile.mkstemp(suffix=ext, prefix=prefix)
    try:
        os.close(tmp_fd)
        with open(tmp_path, "wb") as f:
            shutil.copyfileobj(upload_file.file, f)
    except Exception:
        os.unlink(tmp_path)
        raise
    return tmp_path


# ---------------------------------------------------------------------------
# GET /garments — list all, with optional filters
# ---------------------------------------------------------------------------

@router.get("", response_model=List[GarmentResponse])
def list_garments(
    category: Optional[str] = Query(default=None, description="Filter by category (tshirt, hoodie, jacket, shirt)"),
    fit_type: Optional[str] = Query(default=None, description="Filter by fit type (tight, regular, oversized)"),
):
    col = get_collection("garments")
    query: dict = {}
    if category:
        query["category"] = category.lower()
    if fit_type:
        query["fit_type"] = fit_type.lower()

    docs = list(col.find(query).sort("created_at", -1))
    return [_doc_to_response(doc) for doc in docs]


# ---------------------------------------------------------------------------
# GET /garments/{garment_id} — single garment
# ---------------------------------------------------------------------------

@router.get("/{garment_id}", response_model=GarmentResponse)
def get_garment(garment_id: str):
    col = get_collection("garments")
    try:
        oid = ObjectId(garment_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid garment ID format")

    doc = col.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail=f"Garment '{garment_id}' not found")

    return _doc_to_response(doc)


# ---------------------------------------------------------------------------
# POST /garments — create new garment
# ---------------------------------------------------------------------------

@router.post("", response_model=GarmentResponse, status_code=201)
def create_garment(
    name: str = Form(..., description="Garment display name"),
    category: str = Form(..., description="tshirt | hoodie | jacket | shirt"),
    fit_type: str = Form(..., description="tight | regular | oversized"),
    render_mode: str = Form(default="overlay", description="overlay | replacement"),
    torso_ratio: float = Form(default=1.0),
    shoulder_ratio: float = Form(default=1.0),
    sleeve_ratio: float = Form(default=0.85),
    drape_factor: float = Form(default=0.5),
    display_image: UploadFile = File(..., description="Preview image shown in the UI"),
    garment_image: UploadFile = File(..., description="Clean garment image used as VTON input"),
):
    display_tmp = None
    garment_tmp = None
    uploaded_display_url = None
    uploaded_garment_url = None

    try:
        # Save both uploads to temp files
        display_tmp = _save_temp_file(display_image, "display_")
        garment_tmp = _save_temp_file(garment_image, "garment_")

        # Upload to Cloudinary
        uploaded_display_url = upload_image(display_tmp, folder="vton/garments/display")
        uploaded_garment_url = upload_image(garment_tmp, folder="vton/garments/input")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image upload failed: {e}")
    finally:
        # Always clean up temp files
        for path in [display_tmp, garment_tmp]:
            if path and os.path.exists(path):
                try:
                    os.unlink(path)
                except OSError:
                    pass

    # Build the MongoDB document
    doc = {
        "name": name,
        "category": category.lower(),
        "fit_type": fit_type.lower(),
        "render_mode": render_mode,
        "image_url": uploaded_display_url,
        "garment_image_url": uploaded_garment_url,
        "torso_ratio": torso_ratio,
        "shoulder_ratio": shoulder_ratio,
        "sleeve_ratio": sleeve_ratio,
        "drape_factor": drape_factor,
        "created_at": datetime.now(),
    }

    col = get_collection("garments")
    result = col.insert_one(doc)
    doc["_id"] = result.inserted_id

    return _doc_to_response(doc)


# ---------------------------------------------------------------------------
# DELETE /garments/{garment_id}
# ---------------------------------------------------------------------------

@router.delete("/{garment_id}")
def delete_garment(garment_id: str):
    col = get_collection("garments")
    try:
        oid = ObjectId(garment_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid garment ID format")

    doc = col.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail=f"Garment '{garment_id}' not found")

    # Delete images from Cloudinary
    for url_field in ["image_url", "garment_image_url"]:
        url = doc.get(url_field, "")
        if url:
            public_id = get_public_id_from_url(url)
            delete_image(public_id)

    # Delete from MongoDB
    col.delete_one({"_id": oid})

    return {"deleted": True, "id": garment_id}
