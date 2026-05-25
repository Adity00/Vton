import os
import shutil
import tempfile
import time
from pathlib import Path
from PIL import Image

def to_base64(image_url_or_path: str) -> str:
    import base64
    import httpx
    if image_url_or_path.startswith("http"):
        with httpx.Client(follow_redirects=True, timeout=30) as client:
            resp = client.get(image_url_or_path)
            resp.raise_for_status()
            data = resp.content
    else:
        with open(image_url_or_path, "rb") as f:
            data = f.read()
    return base64.b64encode(data).decode("utf-8")

def run_vton(person_image_url: str, garment_image_url: str) -> tuple[str, bool]:
    try:
        from gradio_client import Client, handle_file
        print("[HUGGINGFACE] Sending request to yisol/IDM-VTON API...")
        client = Client("yisol/IDM-VTON")
        
        result = client.predict(
            dict={"background": handle_file(person_image_url), "layers": [], "composite": None},
            garm_img=handle_file(garment_image_url),
            garment_des="shirt",
            is_checked=True,
            is_checked_crop=False,
            denoise_steps=30,
            seed=42,
            api_name="/tryon"
        )
        
        output_image_path = result[0]
        print(f"[HUGGINGFACE] Saved result to {output_image_path}")
        
        import shutil
        import tempfile
        import time
        ts = int(time.time() * 1000)
        dest = os.path.join(tempfile.gettempdir(), f"vton_hf_{ts}.jpg")
        shutil.copy(output_image_path, dest)
        return dest, False
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[WARN] HuggingFace VTON failed: {type(e).__name__}: {e}")
        return run_vton_fallback(person_image_url, garment_image_url), True


def run_vton_fallback(person_image_url: str, garment_image_url: str) -> str:
    import httpx
    import cv2
    import numpy as np
    from services.segmentation import remove_background

    print("[VTON FALLBACK] Starting fallback overlay")
    
    def download_to_temp(url: str, suffix: str = ".jpg") -> str:
        fd, path = tempfile.mkstemp(suffix=suffix, prefix="fallback_dl_")
        os.close(fd)
        with httpx.Client(follow_redirects=True, timeout=30) as client:
            resp = client.get(url)
            resp.raise_for_status()
            with open(path, "wb") as f:
                f.write(resp.content)
        return path

    person_image_path = download_to_temp(person_image_url)
    garment_image_path = download_to_temp(garment_image_url)

    person = Image.open(person_image_path).convert("RGBA")
    pw, ph = person.size
    print(f"[VTON FALLBACK] Person image size: {pw}x{ph}")

    # Step 1: Remove background from garment
    try:
        garment_rgba_cv2, alpha_mask = remove_background(garment_image_path)
        garment_rgba_cv2 = cv2.cvtColor(garment_rgba_cv2, cv2.COLOR_BGRA2RGBA)
        garment = Image.fromarray(garment_rgba_cv2)
        print(f"[VTON FALLBACK] Background removed. Garment size: {garment.size}")
    except Exception as e:
        print(f"[VTON FALLBACK] rembg failed ({e}), using raw garment")
        garment = Image.open(garment_image_path).convert("RGBA")

    gw, gh = garment.size

    # Step 2: Calculate target size
    # Width: 65% of person image width (covers shoulder-to-shoulder)
    target_w = int(pw * 0.65)

    # Height: maintain aspect ratio but cap at 55% of person image height
    # This ensures garment stays in torso region and doesn't extend to bottom
    aspect = gh / gw if gw > 0 else 1.0
    target_h = int(target_w * aspect)
    max_h = int(ph * 0.55)
    if target_h > max_h:
        target_h = max_h
        target_w = int(target_h / aspect) if aspect > 0 else target_w

    print(f"[VTON FALLBACK] Garment resized to: {target_w}x{target_h}")
    garment_resized = garment.resize((target_w, target_h), Image.LANCZOS)

    # Step 3: Position at shoulder line
    # Shoulder line is approximately 18% from top for standing person photos
    paste_x = (pw - target_w) // 2
    paste_y = int(ph * 0.18)

    # Clamp to valid bounds
    paste_x = max(0, paste_x)
    paste_y = max(0, paste_y)

    # Ensure garment doesn't go out of bounds at bottom or right
    if paste_x + target_w > pw:
        target_w = pw - paste_x
        garment_resized = garment_resized.crop((0, 0, target_w, target_h))
    if paste_y + target_h > ph:
        target_h = ph - paste_y
        garment_resized = garment_resized.crop((0, 0, target_w, target_h))

    print(f"[VTON FALLBACK] Pasting at ({paste_x}, {paste_y})")

    # Step 4: Composite
    result = person.copy()
    result.alpha_composite(garment_resized, (paste_x, paste_y))

    ts = int(time.time())
    dest = os.path.join(tempfile.gettempdir(), f"vton_fallback_{ts}.jpg")
    result.convert("RGB").save(dest, "JPEG", quality=92)
    print(f"[VTON FALLBACK] Saved to {dest}")
    
    # Cleanup temp downloads
    try:
        os.unlink(person_image_path)
        os.unlink(garment_image_path)
    except:
        pass
        
    return dest
