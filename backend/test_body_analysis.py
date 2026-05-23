import json
import os
import urllib.request
from services.body_analysis import extract_body_proportions, draw_landmarks_debug

TEST_IMAGE_URL = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400"
TEMP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp")
TEST_IMAGE_PATH = os.path.join(TEMP_DIR, "test_person.jpg")
DEBUG_IMAGE_PATH = os.path.join(TEMP_DIR, "debug_landmarks.jpg")


def run_test():
    print("Starting Phase 1 Test — Body Analysis Service")
    print("---------------------------------------------")

    # Ensure local temp directory exists
    os.makedirs(TEMP_DIR, exist_ok=True)

    # 1. Download test image
    try:
        print(f"Downloading test image from {TEST_IMAGE_URL}...")
        urllib.request.urlretrieve(TEST_IMAGE_URL, TEST_IMAGE_PATH)
        print(f"Test image downloaded and saved to: {TEST_IMAGE_PATH}")
    except Exception as e:
        print(f"Failed to download test image: {e}")
        return

    # 2. Run body analysis engine
    try:
        print("Extracting body proportions with height=175cm, weight=70kg...")
        profile = extract_body_proportions(
            image_path=TEST_IMAGE_PATH,
            height_cm=175.0,
            weight_kg=70.0
        )
        
        print("\n[OK] Body Analysis Succeeded!")
        print("Resulting BodyProfile JSON:")
        print(json.dumps(profile.model_dump(), indent=2))
        
    except Exception as e:
        print(f"\n[FAIL] Body analysis failed: {e}")
        return

    # 3. Draw and save debug landmarks
    try:
        print(f"\nGenerating landmark debug visualization...")
        draw_landmarks_debug(TEST_IMAGE_PATH, DEBUG_IMAGE_PATH)
        print(f"[OK] Debug image successfully saved to: {DEBUG_IMAGE_PATH}")
        print("\nSUCCESS — Phase 1 Test Complete!")
    except Exception as e:
        print(f"\n[FAIL] Debug visualization failed: {e}")


if __name__ == "__main__":
    run_test()
