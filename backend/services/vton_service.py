import os
import shutil
import tempfile
import time
from pathlib import Path

from PIL import Image

# ---------------------------------------------------------------------------
# HuggingFace VTON via gradio_client
# ---------------------------------------------------------------------------

_SPACE = os.getenv("HUGGINGFACE_SPACE", "levihsu/OOTDiffusion")

# Track whether we're in fallback mode so the caller can label the response
_last_used_fallback = False


def run_vton(person_image_path: str, garment_image_path: str) -> tuple[str, bool]:
    """
    Try HuggingFace OOTDiffusion first. On failure, use the simple overlay fallback.

    Returns:
        (output_image_path, used_fallback)
        used_fallback=True when HuggingFace was unavailable/slow.
    """
    try:
        return _run_ootdiffusion(person_image_path, garment_image_path), False
    except Exception as e:
        print(f"[WARN] HuggingFace VTON failed ({e}). Using overlay fallback.")
        return run_vton_fallback(person_image_path, garment_image_path), True


def _run_ootdiffusion(person_image_path: str, garment_image_path: str) -> str:
    """
    Call OOTDiffusion on HuggingFace Spaces via gradio_client.
    Raises an exception (propagated to run_vton) if anything goes wrong.
    """
    from gradio_client import Client, handle_file

    client = Client(_SPACE)

    result = client.predict(
        vton_img=handle_file(person_image_path),
        garm_img=handle_file(garment_image_path),
        category="Upper-body",
        n_samples=1,
        n_steps=20,
        image_scale=2.0,
        seed=-1,
        api_name="/run_ootd",
    )

    # result is typically a list of dicts or file paths
    if not result:
        raise ValueError("VTON model returned no output")

    # Extract the file path from the result
    first = result[0]
    if isinstance(first, dict):
        src = first.get("image") or first.get("path") or first.get("url") or ""
    else:
        src = str(first)

    if not src or not Path(src).exists():
        raise ValueError(f"VTON output file not found: {src!r}")

    # Copy to a predictable tmp location
    ts = int(time.time())
    dest = os.path.join(tempfile.gettempdir(), f"vton_output_{ts}.jpg")
    shutil.copy2(src, dest)
    return dest


# ---------------------------------------------------------------------------
# Fallback: simple upper-body overlay using Pillow
# ---------------------------------------------------------------------------

def run_vton_fallback(person_image_path: str, garment_image_path: str) -> str:
    """
    Simple overlay fallback used when HuggingFace is unavailable.
    Resizes the garment and blends it over the top 60% of the person image.
    The result is visually rough but guarantees the system never fully fails.
    """
    person = Image.open(person_image_path).convert("RGBA")
    garment = Image.open(garment_image_path).convert("RGBA")

    pw, ph = person.size

    # Target: garment covers top 60% of person image, full width
    target_w = pw
    target_h = int(ph * 0.60)
    garment_resized = garment.resize((target_w, target_h), Image.LANCZOS)

    # Apply 85% opacity to the garment layer
    r, g, b, a = garment_resized.split()
    a = a.point(lambda x: int(x * 0.85))
    garment_resized = Image.merge("RGBA", (r, g, b, a))

    # Composite garment over person at y=0 (top of image)
    composited = person.copy()
    composited.paste(garment_resized, (0, 0), garment_resized)

    ts = int(time.time())
    dest = os.path.join(tempfile.gettempdir(), f"vton_fallback_{ts}.jpg")
    composited.convert("RGB").save(dest, "JPEG", quality=90)
    return dest
