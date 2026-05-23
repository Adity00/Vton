import os
import shutil
import tempfile
import time
import uuid
from datetime import datetime
from typing import Optional

import httpx
from bson import ObjectId
from fastapi import APIRouter, Form, HTTPException, UploadFile, File

from database.connection import get_collection
from services.body_analysis import extract_body_proportions
from services.fit_engine import calculate_fit, get_similar_items
from services.vton_service import run_vton
from services.segmentation import composite_with_layering, save_image
from services.cloudinary_service import upload_image, upload_image_bytes

router = APIRouter()

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


# ---------------------------------------------------------------------------
# Helper: download a URL to a temp file
# ---------------------------------------------------------------------------

def _download_to_temp(url: str, suffix: str = ".jpg") -> str:
    """Download a URL to a temporary file. Returns the temp file path."""
    fd, path = tempfile.mkstemp(suffix=suffix, prefix="vton_dl_")
    os.close(fd)
    with httpx.Client(follow_redirects=True, timeout=30) as client:
        resp = client.get(url)
        resp.raise_for_status()
        with open(path, "wb") as f:
            f.write(resp.content)
    return path


def _save_upload_to_temp(upload_file: UploadFile, prefix: str) -> str:
    """Save an UploadFile to a temp file. Returns the path."""
    ext = os.path.splitext(upload_file.filename or "")[1].lower() or ".jpg"
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image type '{ext}'. Allowed: jpg, jpeg, png, webp",
        )
    fd, path = tempfile.mkstemp(suffix=ext, prefix=prefix)
    os.close(fd)
    with open(path, "wb") as f:
        shutil.copyfileobj(upload_file.file, f)
    return path


def _cleanup(*paths: str) -> None:
    """Delete a list of temp file paths, silently ignoring errors."""
    for p in paths:
        if p and os.path.exists(p):
            try:
                os.unlink(p)
            except OSError:
                pass


def _garment_doc_to_model(doc: dict):
    """Convert a raw MongoDB garment document to a GarmentModel instance."""
    from models.garment import GarmentModel
    return GarmentModel(
        _id=str(doc["_id"]),
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


# ---------------------------------------------------------------------------
# POST /tryon — main pipeline endpoint
# ---------------------------------------------------------------------------

@router.post("")
def tryon(
    person_image: UploadFile = File(..., description="Front-facing photo of the person"),
    garment_id: str = Form(..., description="MongoDB _id of the garment"),
    height_cm: Optional[float] = Form(default=None),
    weight_kg: Optional[float] = Form(default=None),
    session_id: Optional[str] = Form(default=None),
):
    """
    Full virtual try-on pipeline:
      1.  Save & upload user photo
      2.  Fetch garment from MongoDB
      3.  Download garment image
      4.  Body analysis (MediaPipe)
      5.  Fit engine
      6.  VTON model (OOTDiffusion or fallback overlay)
      7.  Compositing (preserve face/arms)
      8.  Upload result to Cloudinary
      9.  Find similar garments
      10. Persist TryOnResult to MongoDB
      11. Clean up all temp files
    """

    if not session_id:
        session_id = str(uuid.uuid4())

    # Paths to clean up in finally block
    person_tmp      = None
    garment_tmp     = None
    vton_tmp        = None
    composite_tmp   = None

    timings: dict = {}

    try:
        # ----------------------------------------------------------------
        # STEP 1: Save person image to temp file
        # ----------------------------------------------------------------
        t0 = time.time()
        person_tmp = _save_upload_to_temp(person_image, "person_")
        timings["save_upload"] = round(time.time() - t0, 2)

        # ----------------------------------------------------------------
        # STEP 2: Upload person image to Cloudinary (original storage)
        # ----------------------------------------------------------------
        t0 = time.time()
        user_image_url = upload_image(person_tmp, folder="vton/user_photos")
        timings["upload_person"] = round(time.time() - t0, 2)

        # ----------------------------------------------------------------
        # STEP 3: Fetch garment from MongoDB
        # ----------------------------------------------------------------
        t0 = time.time()
        col = get_collection("garments")
        try:
            oid = ObjectId(garment_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid garment_id format")

        garment_doc = col.find_one({"_id": oid})
        if not garment_doc:
            raise HTTPException(status_code=404, detail=f"Garment '{garment_id}' not found")

        garment = _garment_doc_to_model(garment_doc)
        timings["fetch_garment"] = round(time.time() - t0, 2)

        # ----------------------------------------------------------------
        # STEP 4: Download garment image to temp file
        # ----------------------------------------------------------------
        t0 = time.time()
        garment_tmp = _download_to_temp(garment.garment_image_url, suffix=".jpg")
        timings["download_garment"] = round(time.time() - t0, 2)

        # ----------------------------------------------------------------
        # STEP 5: Body analysis
        # ----------------------------------------------------------------
        t0 = time.time()
        try:
            body_profile, landmarks = extract_body_proportions(
                person_tmp,
                height_cm=height_cm,
                weight_kg=weight_kg,
                return_landmarks=True,
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        timings["body_analysis"] = round(time.time() - t0, 2)

        # ----------------------------------------------------------------
        # STEP 6: Fit engine
        # ----------------------------------------------------------------
        t0 = time.time()
        fit_result = calculate_fit(body_profile, garment)
        timings["fit_engine"] = round(time.time() - t0, 2)

        # ----------------------------------------------------------------
        # STEP 7: VTON model (OOTDiffusion or overlay fallback)
        # ----------------------------------------------------------------
        t0 = time.time()
        vton_tmp, used_fallback = run_vton(person_tmp, garment_tmp)
        processing_mode = "fallback" if used_fallback else "ai"
        timings["vton_model"] = round(time.time() - t0, 2)

        # ----------------------------------------------------------------
        # STEP 8: Compositing (paste face/arms on top of VTON result)
        # ----------------------------------------------------------------
        t0 = time.time()
        composited = composite_with_layering(person_tmp, vton_tmp, landmarks)
        fd, composite_tmp = tempfile.mkstemp(suffix=".jpg", prefix="composite_")
        os.close(fd)
        save_image(composited, composite_tmp)
        timings["compositing"] = round(time.time() - t0, 2)

        # ----------------------------------------------------------------
        # STEP 9: Upload result to Cloudinary
        # ----------------------------------------------------------------
        t0 = time.time()
        result_image_url = upload_image(composite_tmp, folder="vton/results")
        timings["upload_result"] = round(time.time() - t0, 2)

        # ----------------------------------------------------------------
        # STEP 10: Find similar garments
        # ----------------------------------------------------------------
        t0 = time.time()
        all_docs = list(col.find({}))
        all_garments = [_garment_doc_to_model(d) for d in all_docs]
        similar_raw = get_similar_items(garment, all_garments, body_profile)
        similar_items = [
            {
                "id": g.id or "",
                "name": g.name,
                "category": g.category,
                "fit_type": g.fit_type,
                "image_url": g.image_url,
                "fit_score": round(calculate_fit(body_profile, g).fit_score, 3),
            }
            for g in similar_raw
        ]
        timings["similar_items"] = round(time.time() - t0, 2)

        # ----------------------------------------------------------------
        # STEP 11: Save TryOnResult to MongoDB
        # ----------------------------------------------------------------
        t0 = time.time()
        history_col = get_collection("tryon_results")
        history_doc = {
            "session_id": session_id,
            "user_image_url": user_image_url,
            "garment_id": garment_id,
            "result_image_url": result_image_url,
            "size_recommendation": fit_result.recommended_size,
            "fit_label": fit_result.fit_label,
            "body_proportions": {
                "shoulder_width_ratio": body_profile.shoulder_width_ratio,
                "torso_length_ratio": body_profile.torso_length_ratio,
                "sleeve_length_ratio": body_profile.sleeve_length_ratio,
                "estimated_size": body_profile.estimated_size,
            },
            "processing_mode": processing_mode,
            "created_at": datetime.now(),
        }
        history_col.insert_one(history_doc)
        timings["save_history"] = round(time.time() - t0, 2)

        # ----------------------------------------------------------------
        # Build response
        # ----------------------------------------------------------------
        return {
            "session_id": session_id,
            "result_image_url": result_image_url,
            "original_image_url": user_image_url,
            "garment": {
                "id": str(garment_doc["_id"]),
                "name": garment.name,
                "category": garment.category,
                "fit_type": garment.fit_type,
                "render_mode": garment.render_mode,
                "image_url": garment.image_url,
            },
            "body_profile": {
                "shoulder_width_ratio": body_profile.shoulder_width_ratio,
                "torso_length_ratio": body_profile.torso_length_ratio,
                "sleeve_length_ratio": body_profile.sleeve_length_ratio,
                "neck_width_ratio": body_profile.neck_width_ratio,
                "estimated_size": body_profile.estimated_size,
            },
            "fit_result": {
                "recommended_size": fit_result.recommended_size,
                "fit_label": fit_result.fit_label,
                "fit_score": fit_result.fit_score,
                "shoulder_scale_factor": fit_result.shoulder_scale_factor,
                "torso_scale_factor": fit_result.torso_scale_factor,
                "sleeve_scale_factor": fit_result.sleeve_scale_factor,
                "fit_notes": fit_result.fit_notes,
            },
            "similar_items": similar_items,
            "processing_mode": processing_mode,
            "timings_ms": {k: f"{v}s" for k, v in timings.items()},
        }

    finally:
        # Always clean up all temp files regardless of success or failure
        _cleanup(person_tmp, garment_tmp, vton_tmp, composite_tmp)
