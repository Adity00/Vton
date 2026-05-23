import os
import numpy as np
import cv2
from PIL import Image
import rembg

# ---------------------------------------------------------------------------
# 1. Background removal
# ---------------------------------------------------------------------------

def remove_background(image_path: str) -> tuple:
    """
    Remove the background from a person image using rembg.
    Returns (person_rgba, alpha_mask) as numpy arrays.
    person_rgba: H x W x 4 (RGBA)
    alpha_mask:  H x W (uint8, 255 = person, 0 = background)
    """
    with open(image_path, "rb") as f:
        input_bytes = f.read()

    output_bytes = rembg.remove(input_bytes)

    # Decode RGBA PNG output
    nparr = np.frombuffer(output_bytes, np.uint8)
    person_rgba = cv2.imdecode(nparr, cv2.IMREAD_UNCHANGED)  # H x W x 4

    if person_rgba is None or person_rgba.shape[2] != 4:
        raise ValueError("rembg background removal failed")

    alpha_mask = person_rgba[:, :, 3]  # alpha channel
    return person_rgba, alpha_mask


# ---------------------------------------------------------------------------
# 2. Upper body mask from landmarks
# ---------------------------------------------------------------------------

def create_upper_body_mask(image_path: str, landmarks: dict) -> np.ndarray:
    """
    Create a binary mask of the upper body region (shoulders to hips).

    landmarks: dict with keys like 'left_shoulder', 'right_shoulder',
               'left_hip', 'right_hip' — each is (x, y) in pixel coords.

    Returns a uint8 mask: 255 = upper body region, 0 = everything else.
    """
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Cannot read image: {image_path}")

    h, w = img.shape[:2]
    mask = np.zeros((h, w), dtype=np.uint8)

    ls = landmarks.get("left_shoulder",  (w * 0.3, h * 0.3))
    rs = landmarks.get("right_shoulder", (w * 0.7, h * 0.3))
    lh = landmarks.get("left_hip",       (w * 0.3, h * 0.65))
    rh = landmarks.get("right_hip",      (w * 0.7, h * 0.65))

    # Add padding around the torso polygon
    pad_x = int(w * 0.05)
    pad_y = int(h * 0.02)

    poly = np.array([
        [int(ls[0]) - pad_x, int(ls[1]) - pad_y],
        [int(rs[0]) + pad_x, int(rs[1]) - pad_y],
        [int(rh[0]) + pad_x, int(rh[1]) + pad_y],
        [int(lh[0]) - pad_x, int(lh[1]) + pad_y],
    ], dtype=np.int32)

    cv2.fillPoly(mask, [poly], 255)
    return mask


# ---------------------------------------------------------------------------
# 3. Main compositing function
# ---------------------------------------------------------------------------

def composite_with_layering(
    person_image_path: str,
    vton_result_path: str,
    landmarks: dict,
) -> np.ndarray:
    """
    Composite the VTON result with the original person image to preserve
    the neck, face, and arm regions on top of the generated garment.

    Returns the composited image as a BGR numpy array.
    """
    person_bgr = cv2.imread(person_image_path)
    vton_bgr   = cv2.imread(vton_result_path)

    if person_bgr is None:
        raise ValueError(f"Cannot read person image: {person_image_path}")
    if vton_bgr is None:
        raise ValueError(f"Cannot read VTON result: {vton_result_path}")

    # Resize vton result to match person image size if different
    ph, pw = person_bgr.shape[:2]
    if vton_bgr.shape[:2] != (ph, pw):
        vton_bgr = cv2.resize(vton_bgr, (pw, ph), interpolation=cv2.INTER_LANCZOS4)

    # --- Neck/head region: everything ABOVE the shoulder line ---
    ls = landmarks.get("left_shoulder",  (pw * 0.3, ph * 0.3))
    rs = landmarks.get("right_shoulder", (pw * 0.7, ph * 0.3))
    shoulder_y = int(min(ls[1], rs[1]))  # top of shoulders

    neck_mask = np.zeros((ph, pw), dtype=np.uint8)
    if shoulder_y > 0:
        neck_mask[:shoulder_y, :] = 255

    # --- Arm regions: outside the shoulder-to-wrist lines ---
    lw = landmarks.get("left_wrist",  (pw * 0.1, ph * 0.75))
    rw = landmarks.get("right_wrist", (pw * 0.9, ph * 0.75))

    arm_mask = np.zeros((ph, pw), dtype=np.uint8)

    # Left arm region (left of left shoulder-to-wrist line)
    left_arm_poly = np.array([
        [0,           int(ls[1])],
        [int(ls[0]),  int(ls[1])],
        [int(lw[0]),  int(lw[1])],
        [0,           int(lw[1])],
    ], dtype=np.int32)
    cv2.fillPoly(arm_mask, [left_arm_poly], 255)

    # Right arm region (right of right shoulder-to-wrist line)
    right_arm_poly = np.array([
        [int(rs[0]),  int(rs[1])],
        [pw,          int(rs[1])],
        [pw,          int(rw[1])],
        [int(rw[0]),  int(rw[1])],
    ], dtype=np.int32)
    cv2.fillPoly(arm_mask, [right_arm_poly], 255)

    # --- Composite: start with VTON result, paste person regions on top ---
    result = vton_bgr.copy()

    # Paste neck/head
    neck_mask_3ch = cv2.merge([neck_mask, neck_mask, neck_mask])
    result = np.where(neck_mask_3ch == 255, person_bgr, result)

    # Paste arm regions
    arm_mask_3ch = cv2.merge([arm_mask, arm_mask, arm_mask])
    result = np.where(arm_mask_3ch == 255, person_bgr, result)

    return result.astype(np.uint8)


# ---------------------------------------------------------------------------
# 4. Save image helper
# ---------------------------------------------------------------------------

def save_image(image: np.ndarray, path: str) -> str:
    """Save a numpy BGR image to disk. Returns the path."""
    cv2.imwrite(path, image)
    return path
