import os
import shutil
import time
from typing import Optional
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from models.body_profile import BodyProfile
from services.body_analysis import extract_body_proportions

router = APIRouter()

# Define local temp directory within workspace for Windows safety
TEMP_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "temp")


@router.post("", response_model=BodyProfile)
async def analyze_body(
    file: UploadFile = File(...),
    height_cm: Optional[float] = Form(None),
    weight_kg: Optional[float] = Form(None)
):
    """
    Endpoint to receive a body photo, run MediaPipe landmark detection,
    and return relative body proportions and estimated clothing size.
    """
    # Ensure temp directory exists
    os.makedirs(TEMP_DIR, exist_ok=True)

    # Validate file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in [".jpg", ".jpeg", ".png"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid image format. Please upload a JPEG or PNG image."
        )

    # Save UploadFile temporarily to a local temp folder
    timestamp = int(time.time() * 1000)
    temp_filename = f"user_upload_{timestamp}{file_ext}"
    temp_filepath = os.path.join(TEMP_DIR, temp_filename)

    try:
        # Save file to temp_filepath
        with open(temp_filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Call the body analysis engine
        body_profile = extract_body_proportions(
            image_path=temp_filepath,
            height_cm=height_cm,
            weight_kg=weight_kg
        )
        return body_profile

    except ValueError as e:
        # MediaPipe failure or missing file
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Unhandled backend error
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
    finally:
        # Always clean up the temporary file
        if os.path.exists(temp_filepath):
            try:
                os.remove(temp_filepath)
            except Exception as cleanup_err:
                print(f"[WARN] Failed to delete temp file {temp_filepath}: {cleanup_err}")
