import os
import re
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv

load_dotenv()

# Configure Cloudinary once at import time
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True,
)


def upload_image(file_path: str, folder: str = "vton/garments") -> str:
    """Upload a local file to Cloudinary. Returns the secure_url."""
    result = cloudinary.uploader.upload(
        file_path,
        folder=folder,
        resource_type="image",
    )
    return result["secure_url"]


def upload_image_bytes(image_bytes: bytes, filename: str, folder: str = "vton/garments") -> str:
    """Upload raw image bytes (e.g. from UploadFile) to Cloudinary. Returns the secure_url."""
    result = cloudinary.uploader.upload(
        image_bytes,
        folder=folder,
        public_id=filename,
        resource_type="image",
    )
    return result["secure_url"]


def delete_image(public_id: str) -> bool:
    """Delete an image from Cloudinary by its public_id. Returns True on success."""
    try:
        result = cloudinary.uploader.destroy(public_id, resource_type="image")
        return result.get("result") == "ok"
    except Exception as e:
        print(f"[WARN] Cloudinary delete failed for {public_id}: {e}")
        return False


def get_public_id_from_url(url: str) -> str:
    """
    Extract the Cloudinary public_id from a secure_url.

    Example:
        https://res.cloudinary.com/dsbvqj65y/image/upload/v1234567890/vton/garments/abc123.jpg
        --> vton/garments/abc123
    """
    # Strip query params
    url = url.split("?")[0]
    # Match everything after /upload/vXXXXXX/ (version segment is optional)
    match = re.search(r"/upload/(?:v\d+/)?(.+?)(?:\.[^.]+)?$", url)
    if match:
        return match.group(1)
    # Fallback: return last path segment without extension
    path = url.rstrip("/")
    last_part = path.rsplit("/", 1)[-1]
    return last_part.rsplit(".", 1)[0]
