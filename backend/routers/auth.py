from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from typing import Any
from datetime import timedelta
import os
import uuid
import datetime

from models.user import UserCreate, UserResponse, Token
from services.auth_service import verify_password, get_password_hash, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from database.connection import get_collection

router = APIRouter()

@router.post("/register", response_model=UserResponse)
async def register(user: UserCreate) -> Any:
    # Check if user exists
    users = get_collection("users")
    existing_user = users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system",
        )
        
    user_dict = {
        "email": user.email,
        "password_hash": get_password_hash(user.password),
        "name": user.name,
        "saved_photos": [],
        "height_cm": None,
        "weight_kg": None,
        "created_at": datetime.datetime.utcnow()
    }
    
    result = users.insert_one(user_dict)
    
    return {
        "id": str(result.inserted_id),
        "name": user.name,
        "email": user.email,
        "saved_photos": [],
        "height_cm": None,
        "weight_kg": None,
        "created_at": user_dict["created_at"]
    }

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()) -> Any:
    users = get_collection("users")
    user = users.find_one({"email": form_data.username})
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
        
    if not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
        
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"user_id": str(user["_id"]), "email": user["email"]},
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}
