"""
test_fit_engine.py
------------------
Quick sanity-check for the fit engine logic.
Run from backend/ directory:
    .\\venv\\Scripts\\python test_fit_engine.py
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from datetime import datetime
from models.body_profile import BodyProfile
from models.garment import GarmentModel
from services.fit_engine import calculate_fit, get_similar_items


def make_garment(name, category, fit_type, torso_ratio, shoulder_ratio, sleeve_ratio, drape_factor):
    return GarmentModel(
        name=name,
        category=category,
        fit_type=fit_type,
        render_mode="overlay",
        image_url="https://example.com/img.jpg",
        garment_image_url="https://example.com/garment.jpg",
        torso_ratio=torso_ratio,
        shoulder_ratio=shoulder_ratio,
        sleeve_ratio=sleeve_ratio,
        drape_factor=drape_factor,
        created_at=datetime.now(),
    )


def main():
    # ------------------------------------------------------------------
    # Mock body profile: medium-build person
    # ------------------------------------------------------------------
    body = BodyProfile(
        shoulder_width_ratio=1.0,
        torso_length_ratio=1.35,
        sleeve_length_ratio=1.1,
        neck_width_ratio=0.22,
        estimated_size="M",
    )

    print("=" * 60)
    print("Body Profile (mock medium-build person)")
    print("=" * 60)
    print(f"  shoulder_width_ratio : {body.shoulder_width_ratio}")
    print(f"  torso_length_ratio   : {body.torso_length_ratio}")
    print(f"  sleeve_length_ratio  : {body.sleeve_length_ratio}")
    print(f"  estimated_size       : {body.estimated_size}")
    print()

    # ------------------------------------------------------------------
    # Mock garments
    # ------------------------------------------------------------------
    garments = [
        make_garment("Oversized Hoodie", "hoodie",  "oversized", torso_ratio=1.3,  shoulder_ratio=1.15, sleeve_ratio=0.9,  drape_factor=0.8),
        make_garment("Slim Fit Shirt",   "shirt",   "tight",     torso_ratio=0.9,  shoulder_ratio=0.95, sleeve_ratio=0.75, drape_factor=0.2),
        make_garment("Bomber Jacket",    "jacket",  "regular",   torso_ratio=1.1,  shoulder_ratio=1.05, sleeve_ratio=0.85, drape_factor=0.6),
    ]

    all_pass = True
    results = []

    for garment in garments:
        fit = calculate_fit(body, garment)
        results.append((garment, fit))

        print("-" * 60)
        print(f"Garment        : {garment.name}")
        print(f"fit_label      : {fit.fit_label}")
        print(f"recommended_size: {fit.recommended_size}")
        print(f"fit_score      : {fit.fit_score:.3f}")
        print(f"shoulder_scale : {fit.shoulder_scale_factor}")
        print(f"torso_scale    : {fit.torso_scale_factor}")
        print(f"sleeve_scale   : {fit.sleeve_scale_factor}")
        print(f"fit_notes      :")
        for note in fit.fit_notes:
            print(f"   - {note}")
        print()

    # ------------------------------------------------------------------
    # Assertions: validate expected outcomes
    # ------------------------------------------------------------------
    hoodie_fit  = results[0][1]
    shirt_fit   = results[1][1]
    jacket_fit  = results[2][1]

    assert hoodie_fit.fit_label == "oversized",    f"Expected 'oversized', got '{hoodie_fit.fit_label}'"
    assert shirt_fit.fit_label == "tight fit",     f"Expected 'tight fit', got '{shirt_fit.fit_label}'"
    assert jacket_fit.fit_label == "regular fit",  f"Expected 'regular fit', got '{jacket_fit.fit_label}'"
    # Jacket and hoodie scores are close, but both clearly beat the shirt
    assert jacket_fit.fit_score > shirt_fit.fit_score, \
        f"Jacket score ({jacket_fit.fit_score}) should be higher than shirt score ({shirt_fit.fit_score})"
    assert hoodie_fit.fit_score > shirt_fit.fit_score, \
        f"Hoodie score ({hoodie_fit.fit_score}) should be higher than shirt score ({shirt_fit.fit_score})"
    print("[OK] All assertions passed")
    print()

    # ------------------------------------------------------------------
    # Similar items test
    # ------------------------------------------------------------------
    bomber = garments[2]
    similar = get_similar_items(bomber, garments, body)
    print(f"Similar to '{bomber.name}': {[g.name for g in similar]}")
    print()
    print("SUCCESS - Fit engine working correctly")


if __name__ == "__main__":
    try:
        main()
    except AssertionError as e:
        print(f"[FAIL] Assertion error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] {e}")
        raise
