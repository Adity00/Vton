from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

class SavedPhoto(BaseModel):
    id: str
    url: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    saved_photos: List[SavedPhoto] = []
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    created_at: datetime

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[str] = None
