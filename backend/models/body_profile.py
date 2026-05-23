from typing import Optional
from pydantic import BaseModel


class BodyProfile(BaseModel):
    shoulder_width_ratio: float
    torso_length_ratio: float
    sleeve_length_ratio: float
    neck_width_ratio: float
    estimated_size: str
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
