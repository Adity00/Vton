# seed_garments.py
# ----------------
# One-time script to populate the MongoDB 'garments' collection with 6 demo
# garments. Downloads images from Unsplash (stable direct URLs) and uploads
# them to Cloudinary, then inserts into MongoDB.
#
# Run from the backend/ directory:
#   .\venv\Scripts\python seed_garments.py

import os
import sys
import time
import urllib.request
import tempfile
from datetime import datetime
from pathlib import Path

# Load .env BEFORE importing anything that reads env vars
from dotenv import load_dotenv
load_dotenv()

# Must be on sys.path for local imports
sys.path.insert(0, str(Path(__file__).parent))

from database.connection import get_collection
from services.cloudinary_service import upload_image

# ---------------------------------------------------------------------------
# Garment definitions
# Each entry has:
#   - name, category, fit_type, render_mode
#   - torso_ratio, shoulder_ratio, sleeve_ratio, drape_factor
#   - display_url  (preview shown in UI)
#   - input_url    (clean garment for VTON pipeline)
# ---------------------------------------------------------------------------

GARMENTS = [
    {
        "name": "Classic White Tee",
        "category": "tshirt",
        "fit_type": "regular",
        "render_mode": "overlay",
        "torso_ratio": 1.0,
        "shoulder_ratio": 1.0,
        "sleeve_ratio": 0.85,
        "drape_factor": 0.4,
        # Verified working Unsplash photo IDs
        "display_url": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=500&fit=crop&q=80",
        "input_url":   "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=512&h=512&fit=crop&q=80",
    },
    {
        "name": "Oversized Hoodie",
        "category": "hoodie",
        "fit_type": "oversized",
        "render_mode": "overlay",
        "torso_ratio": 1.15,
        "shoulder_ratio": 1.1,
        "sleeve_ratio": 0.9,
        "drape_factor": 0.65,
        # photo-1509631179647 = grey hoodie flat lay
        "display_url": "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&h=500&fit=crop&q=80",
        "input_url":   "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=512&h=512&fit=crop&q=80",
    },
    {
        "name": "Slim Fit Shirt",
        "category": "shirt",
        "fit_type": "tight",
        "render_mode": "overlay",
        "torso_ratio": 0.95,
        "shoulder_ratio": 1.0,
        "sleeve_ratio": 1.0,
        "drape_factor": 0.3,
        # photo-1598033129183 = white dress shirt
        "display_url": "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=400&h=500&fit=crop&q=80",
        "input_url":   "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=512&h=512&fit=crop&q=80",
    },
    {
        "name": "Bomber Jacket",
        "category": "jacket",
        "fit_type": "regular",
        "render_mode": "replacement",
        "torso_ratio": 1.1,
        "shoulder_ratio": 1.05,
        "sleeve_ratio": 0.95,
        "drape_factor": 0.6,
        # photo-1591047139829 = green bomber jacket
        "display_url": "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=500&fit=crop&q=80",
        "input_url":   "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=512&h=512&fit=crop&q=80",
    },
    {
        "name": "Crop Hoodie",
        "category": "hoodie",
        "fit_type": "oversized",
        "render_mode": "overlay",
        "torso_ratio": 0.85,
        "shoulder_ratio": 1.05,
        "sleeve_ratio": 0.88,
        "drape_factor": 0.55,
        # photo-1542291026 = black hoodie
        "display_url": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=500&fit=crop&q=80",
        "input_url":   "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=512&h=512&fit=crop&q=80",
    },
    {
        "name": "Denim Jacket",
        "category": "jacket",
        "fit_type": "regular",
        "render_mode": "replacement",
        "torso_ratio": 1.05,
        "shoulder_ratio": 1.02,
        "sleeve_ratio": 0.92,
        "drape_factor": 0.5,
        # photo-1576995853123 = denim jacket on hanger
        "display_url": "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=400&h=500&fit=crop&q=80",
        "input_url":   "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=512&h=512&fit=crop&q=80",
    },
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def download_url(url: str, dest_path: str, retries: int = 3) -> None:
    """Download a URL to a local file with retries."""
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        )
    }
    req = urllib.request.Request(url, headers=headers)
    for attempt in range(1, retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                with open(dest_path, "wb") as f:
                    f.write(resp.read())
            return
        except Exception as e:
            if attempt == retries:
                raise RuntimeError(f"Failed to download {url} after {retries} attempts: {e}")
            print(f"  [RETRY {attempt}] {e}")
            time.sleep(2 * attempt)


def seed():
    col = get_collection("garments")

    # Clear existing data to ensure idempotent re-seeding
    existing = col.count_documents({})
    if existing > 0:
        col.delete_many({})
        print(f"[INFO] Cleared {existing} existing garment(s) for fresh seed.")

    print(f"[INFO] Seeding {len(GARMENTS)} garments...\n")

    for i, g in enumerate(GARMENTS, 1):
        print(f"[{i}/{len(GARMENTS)}] {g['name']}")

        display_tmp = None
        input_tmp = None

        try:
            # --- Download display image ---
            fd, display_tmp = tempfile.mkstemp(suffix=".jpg", prefix="seed_display_")
            os.close(fd)
            print(f"  Downloading display image...")
            download_url(g["display_url"], display_tmp)

            # --- Download input/garment image ---
            fd, input_tmp = tempfile.mkstemp(suffix=".jpg", prefix="seed_input_")
            os.close(fd)
            print(f"  Downloading garment image...")
            download_url(g["input_url"], input_tmp)

            # --- Upload both to Cloudinary ---
            print(f"  Uploading display image to Cloudinary...")
            image_url = upload_image(display_tmp, folder="vton/garments/display")

            print(f"  Uploading garment image to Cloudinary...")
            garment_image_url = upload_image(input_tmp, folder="vton/garments/input")

        finally:
            for path in [display_tmp, input_tmp]:
                if path and os.path.exists(path):
                    try:
                        os.unlink(path)
                    except OSError:
                        pass

        # --- Insert into MongoDB ---
        doc = {
            "name": g["name"],
            "category": g["category"],
            "fit_type": g["fit_type"],
            "render_mode": g["render_mode"],
            "image_url": image_url,
            "garment_image_url": garment_image_url,
            "torso_ratio": g["torso_ratio"],
            "shoulder_ratio": g["shoulder_ratio"],
            "sleeve_ratio": g["sleeve_ratio"],
            "drape_factor": g["drape_factor"],
            "created_at": datetime.now(),
        }

        result = col.insert_one(doc)
        print(f"  [OK] Inserted -> _id: {result.inserted_id}\n")

    print(f"[DONE] Seeded {len(GARMENTS)} garments successfully.")


if __name__ == "__main__":
    seed()
