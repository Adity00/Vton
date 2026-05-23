from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class TryOnResult(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    session_id: str
    user_image_url: str
    garment_id: str
    result_image_url: str
    size_recommendation: str
    fit_label: str
    body_proportions: dict
    created_at: datetime = Field(default_factory=datetime.now)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
