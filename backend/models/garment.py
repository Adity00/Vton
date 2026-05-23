from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class GarmentModel(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    name: str
    category: str  # tshirt, hoodie, jacket, shirt
    fit_type: str  # tight, regular, oversized
    render_mode: str  # overlay, replacement
    image_url: str
    garment_image_url: str  # clean garment image for VTON input
    torso_ratio: float = 1.0
    shoulder_ratio: float = 1.0
    sleeve_ratio: float = 0.85
    drape_factor: float = 0.5
    created_at: datetime = Field(default_factory=datetime.now)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
