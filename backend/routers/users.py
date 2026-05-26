from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from typing import Any
import uuid
from bson import ObjectId
import datetime

from models.user import UserResponse, UserProfileUpdate
from dependencies.auth import get_current_user_doc
from database.connection import get_collection
from services.cloudinary_service import upload_image_bytes

router = APIRouter()

@router.get("/me", response_model=UserResponse)
async def read_user_me(current_user: dict = Depends(get_current_user_doc)) -> Any:
    return {
        "id": str(current_user["_id"]),
        "name": current_user.get("name", ""),
        "email": current_user["email"],
        "saved_photos": current_user.get("saved_photos", []),
        "height_cm": current_user.get("height_cm"),
        "weight_kg": current_user.get("weight_kg"),
        "created_at": current_user["created_at"]
    }

@router.put("/me/profile", response_model=UserResponse)
async def update_user_profile(
    profile_data: UserProfileUpdate,
    current_user: dict = Depends(get_current_user_doc)
) -> Any:
    users = get_collection("users")
    
    update_fields = {}
    if profile_data.name is not None:
        update_fields["name"] = profile_data.name
    if profile_data.height_cm is not None:
        update_fields["height_cm"] = profile_data.height_cm
    if profile_data.weight_kg is not None:
        update_fields["weight_kg"] = profile_data.weight_kg
        
    if update_fields:
        users.update_one(
            {"_id": current_user["_id"]},
            {"$set": update_fields}
        )
        
    updated_user = users.find_one({"_id": current_user["_id"]})
    return {
        "id": str(updated_user["_id"]),
        "name": updated_user.get("name", ""),
        "email": updated_user["email"],
        "saved_photos": updated_user.get("saved_photos", []),
        "height_cm": updated_user.get("height_cm"),
        "weight_kg": updated_user.get("weight_kg"),
        "created_at": updated_user["created_at"]
    }

@router.post("/me/photos", response_model=UserResponse)
async def upload_user_photo(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user_doc)
) -> Any:
    file_bytes = await file.read()
    
    # Upload to Cloudinary
    filename = f"user_{current_user['_id']}_{uuid.uuid4().hex[:8]}"
    url = upload_image_bytes(file_bytes, filename=filename, folder="vton/user_photos")
    
    new_photo = {
        "id": filename,
        "url": url,
        "created_at": datetime.datetime.utcnow()
    }
    
    # Update user in DB
    users = get_collection("users")
    users.update_one(
        {"_id": current_user["_id"]},
        {"$push": {"saved_photos": new_photo}}
    )
    
    # Fetch updated user
    updated_user = users.find_one({"_id": current_user["_id"]})
    
    return {
        "id": str(updated_user["_id"]),
        "name": updated_user.get("name", ""),
        "email": updated_user["email"],
        "saved_photos": updated_user.get("saved_photos", []),
        "height_cm": updated_user.get("height_cm"),
        "weight_kg": updated_user.get("weight_kg"),
        "created_at": updated_user["created_at"]
    }
