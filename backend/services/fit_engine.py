from dataclasses import dataclass, field
from typing import List

from models.body_profile import BodyProfile
from models.garment import GarmentModel

# ---------------------------------------------------------------------------
# Size ordering for up/down adjustments
# ---------------------------------------------------------------------------
SIZE_ORDER = ["XS", "S", "M", "L", "XL"]


def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def _adjust_size(base_size: str, delta: int) -> str:
    """Shift size up or down by delta steps, clamped to valid range."""
    idx = SIZE_ORDER.index(base_size) if base_size in SIZE_ORDER else 2  # default M
    return SIZE_ORDER[_clamp(idx + delta, 0, len(SIZE_ORDER) - 1)]


# ---------------------------------------------------------------------------
# FitResult dataclass
# ---------------------------------------------------------------------------

@dataclass
class FitResult:
    recommended_size: str          # XS, S, M, L, XL
    fit_label: str                 # "tight fit", "regular fit", "oversized"
    fit_score: float               # 0.0 – 1.0, higher = better fit
    shoulder_offset: float         # pixels to shift garment horizontally (+ right, - left)
    torso_scale_factor: float      # scale multiplier for garment height
    sleeve_scale_factor: float     # scale multiplier for sleeve length
    shoulder_scale_factor: float   # scale multiplier for garment width
    fit_notes: List[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Main fit calculation
# ---------------------------------------------------------------------------

def calculate_fit(body: BodyProfile, garment: GarmentModel) -> FitResult:
    """
    Compare body proportions against garment metadata and return a FitResult.
    All logic is pure Python math — no ML, no API calls.
    """

    # ------------------------------------------------------------------
    # 1. SHOULDER FIT
    # ------------------------------------------------------------------
    body_shoulder = body.shoulder_width_ratio         # always 1.0 (base unit)
    garment_shoulder = garment.shoulder_ratio
    shoulder_delta = garment_shoulder - body_shoulder

    # Scale factor: how much wider/narrower the garment shoulder is vs body
    shoulder_scale_factor = _clamp(garment_shoulder / body_shoulder, 0.85, 1.3)

    # Horizontal offset (positive = shift right, negative = shift left)
    # Minor drift compensation for asymmetric garments; 0 for symmetric
    shoulder_offset = 0.0

    # ------------------------------------------------------------------
    # 2. TORSO FIT
    # ------------------------------------------------------------------
    torso_delta = garment.torso_ratio - body.torso_length_ratio
    torso_scale_factor = _clamp(
        garment.torso_ratio / max(body.torso_length_ratio, 0.01),
        0.8, 1.4
    )

    # ------------------------------------------------------------------
    # 3. SLEEVE FIT
    # ------------------------------------------------------------------
    sleeve_delta = garment.sleeve_ratio - body.sleeve_length_ratio
    sleeve_scale_factor = _clamp(
        garment.sleeve_ratio / max(body.sleeve_length_ratio, 0.01),
        0.75, 1.2
    )

    # ------------------------------------------------------------------
    # 4. FIT LABEL
    # ------------------------------------------------------------------
    if garment.drape_factor > 0.6 and shoulder_scale_factor > 1.1:
        fit_label = "oversized"
    elif shoulder_scale_factor <= 0.95 and garment.drape_factor < 0.4:
        fit_label = "tight fit"
    else:
        fit_label = "regular fit"

    # ------------------------------------------------------------------
    # 5. SIZE RECOMMENDATION
    # ------------------------------------------------------------------
    base_size = body.estimated_size or "M"
    if shoulder_delta > 0.2:
        recommended_size = _adjust_size(base_size, -1)  # size down
    elif shoulder_delta < -0.15:
        recommended_size = _adjust_size(base_size, +1)  # size up
    else:
        recommended_size = base_size

    # ------------------------------------------------------------------
    # 6. FIT SCORE  (1.0 = perfect, 0.0 = very poor match)
    # ------------------------------------------------------------------
    raw_score = 1.0 - (
        abs(shoulder_delta) * 0.5
        + abs(torso_delta) * 0.3
        + abs(sleeve_delta) * 0.2
    )
    fit_score = round(_clamp(raw_score, 0.0, 1.0), 3)

    # ------------------------------------------------------------------
    # 7. FIT NOTES  (human-readable feedback)
    # ------------------------------------------------------------------
    notes: List[str] = []

    # Shoulder notes
    if shoulder_delta < -0.1:
        notes.append("Shoulders may feel snug")
    elif shoulder_delta > 0.15:
        notes.append("Expect relaxed shoulder drop")
    else:
        notes.append("Shoulder width fits well")

    # Sleeve notes
    if sleeve_delta < -0.1:
        notes.append("Sleeves may sit above wrist")
    elif sleeve_delta > 0.1:
        notes.append("Sleeves will have extra length")

    # Torso notes
    if torso_delta < -0.15:
        notes.append("Cropped silhouette")
    elif torso_delta > 0.2:
        notes.append("Extra length, may need tucking")

    # Fit label note (always present)
    label_notes = {
        "tight fit": "This garment will have a close, fitted silhouette",
        "regular fit": "Standard fit - comfortable and true to size",
        "oversized": "Loose, relaxed silhouette with extra room",
    }
    notes.append(label_notes.get(fit_label, ""))

    return FitResult(
        recommended_size=recommended_size,
        fit_label=fit_label,
        fit_score=fit_score,
        shoulder_offset=shoulder_offset,
        torso_scale_factor=round(torso_scale_factor, 3),
        sleeve_scale_factor=round(sleeve_scale_factor, 3),
        shoulder_scale_factor=round(shoulder_scale_factor, 3),
        fit_notes=[n for n in notes if n],  # filter empty strings
    )


# ---------------------------------------------------------------------------
# Similar item recommendations
# ---------------------------------------------------------------------------

def get_similar_items(
    garment: GarmentModel,
    all_garments: list,
    body: BodyProfile,
    max_results: int = 3,
) -> list:
    """
    Return up to `max_results` garments from all_garments (excluding the
    current one) that are similar in fit_type and torso_ratio.
    Sorted by fit_score (best first).
    """
    candidates = []
    for g in all_garments:
        # Skip current garment (compare by name+category as proxy for ID)
        if g.name == garment.name and g.category == garment.category:
            continue

        # Prefer same fit_type OR torso_ratio within 0.2
        same_fit = g.fit_type == garment.fit_type
        similar_torso = abs(g.torso_ratio - garment.torso_ratio) <= 0.2

        if same_fit or similar_torso:
            fit_result = calculate_fit(body, g)
            candidates.append((fit_result.fit_score, g))

    # Sort by fit_score descending (best fit first)
    candidates.sort(key=lambda x: x[0], reverse=True)
    return [g for _, g in candidates[:max_results]]
