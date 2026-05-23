import math
import os
import cv2
import mediapipe as mp
from typing import Optional, Tuple
from models.body_profile import BodyProfile

# Setup MediaPipe Pose
mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils


def distance(p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
    """Calculate Euclidean distance between two 2D points."""
    return math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2)


def midpoint(p1: Tuple[float, float], p2: Tuple[float, float]) -> Tuple[float, float]:
    """Calculate the midpoint of two 2D points."""
    return ((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2)


def extract_body_proportions(
    image_path: str,
    height_cm: Optional[float] = None,
    weight_kg: Optional[float] = None
) -> BodyProfile:
    """
    Extracts key body landmarks from a user image, computes relative body proportions,
    and estimates body size (XS-XL) with BMI calibration.
    """
    if not os.path.exists(image_path):
        raise ValueError(f"Image path does not exist: {image_path}")

    # 1. Load the image with OpenCV
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError(f"Could not load image from path: {image_path}")

    h, w, _ = image.shape

    # 2. Run MediaPipe Pose
    # Use static_image_mode=True as we are processing a single upload
    with mp_pose.Pose(
        static_image_mode=True,
        min_detection_confidence=0.5
    ) as pose:
        # MediaPipe expects RGB image
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = pose.process(rgb_image)

        if not results.pose_landmarks:
            raise ValueError(
                "Could not detect body landmarks. Please use a clear front-facing photo."
            )

        landmarks = results.pose_landmarks.landmark

        # Get pixel coordinates for relevant landmarks
        # LEFT_SHOULDER = 11, RIGHT_SHOULDER = 12
        # LEFT_HIP = 23, RIGHT_HIP = 24
        # LEFT_WRIST = 15, RIGHT_WRIST = 16
        # LEFT_ELBOW = 13, RIGHT_ELBOW = 14
        # NOSE = 0
        try:
            left_shoulder = (landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].x * w,
                             landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y * h)
            right_shoulder = (landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].x * w,
                              landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].y * h)
            
            left_hip = (landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].x * w,
                        landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].y * h)
            right_hip = (landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].x * w,
                         landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].y * h)

            left_wrist = (landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].x * w,
                          landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].y * h)
            right_wrist = (landmarks[mp_pose.PoseLandmark.RIGHT_WRIST.value].x * w,
                           landmarks[mp_pose.PoseLandmark.RIGHT_WRIST.value].y * h)

            # Left/Right shoulder and wrist visibility scores to choose the better arm
            left_arm_vis = (landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].visibility + 
                            landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].visibility) / 2
            right_arm_vis = (landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].visibility + 
                             landmarks[mp_pose.PoseLandmark.RIGHT_WRIST.value].visibility) / 2

        except IndexError:
            raise ValueError(
                "Could not detect body landmarks. Please use a clear front-facing photo."
            )

        # 3. Calculate absolute dimensions
        shoulder_width = distance(left_shoulder, right_shoulder)
        if shoulder_width == 0:
            raise ValueError("Invalid pose landmark coordinates detected.")

        mid_shoulder = midpoint(left_shoulder, right_shoulder)
        mid_hip = midpoint(left_hip, right_hip)
        torso_length = distance(mid_shoulder, mid_hip)

        # Sleeve length from the more visible arm
        if left_arm_vis >= right_arm_vis:
            sleeve_length = distance(left_shoulder, left_wrist)
        else:
            sleeve_length = distance(right_shoulder, right_wrist)

        # Neck width estimated as 0.22 of shoulder width
        neck_width = 0.22 * shoulder_width

        # 4. Calculate relative ratios (relative to shoulder_width as the base unit)
        torso_length_ratio = torso_length / shoulder_width
        sleeve_length_ratio = sleeve_length / shoulder_width
        neck_width_ratio = neck_width / shoulder_width  # should be ~0.22
        shoulder_width_ratio = 1.0

        # 5. BMI-based calibration factor
        calibration = 1.0
        if height_cm is not None and weight_kg is not None:
            # bmi = weight / height^2 (height in meters)
            bmi = weight_kg / ((height_cm / 100.0) ** 2)
            if bmi < 18.5:
                calibration = 0.9  # lean
            elif bmi < 25.0:
                calibration = 1.0  # average
            elif bmi < 30.0:
                calibration = 1.1  # slightly fuller
            else:
                calibration = 1.2  # fuller

        # Apply calibration to shoulder width ratio
        shoulder_width_ratio = 1.0 * calibration

        # 6. Estimate size
        # Use shoulder_width_pixels / (image_width * 0.3) as the normalized ratio
        normalized_shoulder_ratio = shoulder_width / (w * 0.3)
        size_metric = normalized_shoulder_ratio * calibration

        if size_metric < 0.85:
            estimated_size = "XS"
        elif size_metric < 1.0:
            estimated_size = "S"
        elif size_metric < 1.15:
            estimated_size = "M"
        elif size_metric < 1.3:
            estimated_size = "L"
        else:
            estimated_size = "XL"

        # 7. Return BodyProfile
        return BodyProfile(
            shoulder_width_ratio=shoulder_width_ratio,
            torso_length_ratio=torso_length_ratio,
            sleeve_length_ratio=sleeve_length_ratio,
            neck_width_ratio=neck_width_ratio,
            estimated_size=estimated_size,
            height_cm=height_cm,
            weight_kg=weight_kg
        )


def draw_landmarks_debug(image_path: str, output_path: str) -> None:
    """Draw detected landmarks and connections on the image and save to output_path."""
    if not os.path.exists(image_path):
        raise ValueError(f"Image path does not exist: {image_path}")

    image = cv2.imread(image_path)
    if image is None:
        raise ValueError(f"Could not load image from path: {image_path}")

    with mp_pose.Pose(
        static_image_mode=True,
        min_detection_confidence=0.5
    ) as pose:
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = pose.process(rgb_image)

        if results.pose_landmarks:
            # Draw landmarks
            mp_drawing.draw_landmarks(
                image,
                results.pose_landmarks,
                mp_pose.POSE_CONNECTIONS,
                mp_drawing.DrawingSpec(color=(245, 117, 66), thickness=2, circle_radius=2),
                mp_drawing.DrawingSpec(color=(245, 66, 230), thickness=2, circle_radius=2)
            )

    # Ensure parent output directory exists
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    cv2.imwrite(output_path, image)
