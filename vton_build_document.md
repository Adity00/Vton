# Virtual Try-On System — Complete Agent Build Document

> This document is your execution guide. Every phase has exact prompts to paste into Antigravity IDE.
> Follow phases in order. Do not skip checkpoints.
> Estimated total build time with AI agents: 6–9 days of focused work.

---

## Cost Summary

| Service | Usage | Cost |
|---|---|---|
| HuggingFace Spaces | VTON model inference | Free |
| Vercel | Frontend hosting | Free |
| Railway | FastAPI backend hosting | Free ($5 credit) |
| MongoDB Atlas | Database | Free (512MB) |
| Cloudinary | Image storage | Free (25GB) |
| All CV libraries | MediaPipe, OpenCV, Pillow | Free / open source |

**Total: $0**

---

## Final Tech Stack

```
Frontend       Next.js 14 + Tailwind CSS
Backend        Python FastAPI
CV Pipeline    MediaPipe + OpenCV + Pillow + NumPy
VTON Model     OOTDiffusion via HuggingFace Spaces (gradio_client)
Database       MongoDB Atlas
Image Storage  Cloudinary
Deployment     Vercel (frontend) + Railway (backend)
```

---

## Complete Folder Structure

```
vton-system/
├── frontend/                        # Next.js app
│   ├── app/
│   │   ├── page.tsx                 # Landing / upload page
│   │   ├── try-on/
│   │   │   └── page.tsx             # Try-on results page
│   │   ├── catalog/
│   │   │   └── page.tsx             # Garment browsing page
│   │   ├── admin/
│   │   │   └── page.tsx             # Admin upload panel
│   │   └── layout.tsx
│   ├── components/
│   │   ├── PhotoUpload.tsx          # Drag/drop photo upload
│   │   ├── GarmentCard.tsx          # Garment item card
│   │   ├── TryOnResult.tsx          # Result display + before/after slider
│   │   ├── SizeRecommendation.tsx   # Size output card
│   │   ├── FitFeedback.tsx          # Fit style label card
│   │   ├── SimilarItems.tsx         # Similar garment suggestions
│   │   ├── BodyMetricsForm.tsx      # Optional height/weight form
│   │   ├── LoadingState.tsx         # Processing animation
│   │   └── AdminUploadForm.tsx      # Admin garment upload form
│   ├── lib/
│   │   ├── api.ts                   # All API call functions
│   │   └── types.ts                 # TypeScript type definitions
│   └── public/
│       └── sample-garments/         # Demo garment images
│
├── backend/                         # FastAPI app
│   ├── main.py                      # FastAPI app entry point
│   ├── requirements.txt
│   ├── .env
│   ├── routers/
│   │   ├── tryon.py                 # POST /tryon endpoint
│   │   ├── garments.py              # GET/POST /garments endpoints
│   │   ├── body.py                  # POST /analyze-body endpoint
│   │   └── history.py               # GET /history endpoint
│   ├── services/
│   │   ├── body_analysis.py         # MediaPipe landmark + proportion logic
│   │   ├── fit_engine.py            # Fit calculation logic
│   │   ├── vton_service.py          # HuggingFace Spaces VTON caller
│   │   ├── segmentation.py          # Torso/body masking
│   │   ├── cloudinary_service.py    # Image upload/fetch
│   │   └── recommendation.py        # Similar items + size rec logic
│   ├── models/
│   │   ├── garment.py               # Garment MongoDB model
│   │   ├── tryon_result.py          # TryOn result MongoDB model
│   │   └── body_profile.py          # Body analysis result model
│   └── database/
│       └── connection.py            # MongoDB Atlas connection
│
└── README.md
```

---

## Environment Variables

Create `backend/.env`:
```
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/vton
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
HUGGINGFACE_SPACE=yisol/IDM-VTON
```

Create `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

---

# PHASE 0 — Project Scaffolding

**What you're doing:** Creating the full folder structure, installing all dependencies, and getting both servers running empty.

**Time estimate:** 1–2 hours

---

### Step 0.1 — Create the project

Open Antigravity IDE. Start a new workspace. Then paste this prompt:

---

**AGENT PROMPT 0.1**
```
Create a monorepo project called vton-system with two sub-projects.

First project: a Next.js 14 app inside a folder called frontend.
- Use TypeScript
- Use Tailwind CSS
- Use the App Router
- Do NOT use the src/ directory structure, keep it flat inside frontend/
- Create these empty folders: app/try-on, app/catalog, app/admin, components, lib, public/sample-garments

Second project: a Python FastAPI app inside a folder called backend.
- Create these folders: routers, services, models, database
- Create an empty main.py file
- Create a requirements.txt with these packages:
  fastapi
  uvicorn
  python-multipart
  mediapipe
  opencv-python-headless
  Pillow
  numpy
  pymongo
  python-dotenv
  cloudinary
  gradio_client
  rembg
  httpx
- Create a .env file with these placeholder keys:
  MONGODB_URI=
  CLOUDINARY_CLOUD_NAME=
  CLOUDINARY_API_KEY=
  CLOUDINARY_API_SECRET=
  HUGGINGFACE_SPACE=yisol/IDM-VTON

At the root level create a README.md that says "Virtual Try-On System".

Do not write any logic yet. Just scaffold the structure.
```

---

### Step 0.2 — Backend entry point

**AGENT PROMPT 0.2**
```
In backend/main.py, write the FastAPI app entry point.

It should:
- Create a FastAPI app instance with title "VTON API" and version "1.0.0"
- Add CORS middleware that allows all origins (we are in development)
- Import and include routers from routers/tryon.py, routers/garments.py, routers/body.py, routers/history.py with prefixes /tryon, /garments, /analyze-body, /history
- Add a root GET endpoint at "/" that returns {"status": "VTON API running"}
- Load environment variables from .env using python-dotenv at the top

Also create all four router files (tryon.py, garments.py, body.py, history.py) inside the routers folder.
Each router file should just define an APIRouter instance and have one placeholder GET endpoint that returns {"status": "ok"}.

The app should start without errors when running: uvicorn main:app --reload
```

---

### Step 0.3 — Database connection

**AGENT PROMPT 0.3**
```
In backend/database/connection.py, write the MongoDB connection logic.

Use pymongo and load the MONGODB_URI from environment variables.
Create a function called get_database() that returns the vton database.
Create a function called get_collection(name: str) that returns a named collection from that database.
Add a startup check that tests the connection and prints "MongoDB connected" or an error message.

Also create these model files:

backend/models/garment.py — a Pydantic BaseModel called GarmentModel with fields:
  id (str, optional, alias "_id")
  name (str)
  category (str) — tshirt, hoodie, jacket, shirt
  fit_type (str) — tight, regular, oversized
  render_mode (str) — overlay or replacement
  image_url (str)
  garment_image_url (str) — clean garment image for VTON input
  torso_ratio (float) — default 1.0
  shoulder_ratio (float) — default 1.0
  sleeve_ratio (float) — default 1.0
  drape_factor (float) — default 0.5
  created_at (datetime)

backend/models/tryon_result.py — a Pydantic BaseModel called TryOnResult with fields:
  id (str, optional)
  session_id (str)
  user_image_url (str)
  garment_id (str)
  result_image_url (str)
  size_recommendation (str)
  fit_label (str)
  body_proportions (dict)
  created_at (datetime)

backend/models/body_profile.py — a Pydantic BaseModel called BodyProfile with fields:
  shoulder_width_ratio (float)
  torso_length_ratio (float)
  sleeve_length_ratio (float)
  neck_width_ratio (float)
  estimated_size (str)
  height_cm (float, optional)
  weight_kg (float, optional)
```

---

### CHECKPOINT 0

Before moving to Phase 1, verify:
- [ ] Run `cd backend && pip install -r requirements.txt` — no errors
- [ ] Run `uvicorn main:app --reload` — see "VTON API running" at localhost:8000
- [ ] Run `cd frontend && npm install && npm run dev` — see Next.js default page at localhost:3000
- [ ] MongoDB Atlas: create a free cluster, get the connection string, paste into .env

---

---

# PHASE 1 — Body Analysis Service

**What you're doing:** Building the MediaPipe pipeline that extracts body proportions from a user photo.

**Time estimate:** 1 day

---

### Step 1.1 — Body analysis core

**AGENT PROMPT 1.1**
```
In backend/services/body_analysis.py, write the complete body analysis service.

This service takes an image (as a numpy array or file path) and returns a BodyProfile.

Use MediaPipe Pose to detect landmarks. Use the following landmark indices:
- LEFT_SHOULDER = 11
- RIGHT_SHOULDER = 12
- LEFT_HIP = 23
- RIGHT_HIP = 24
- LEFT_ELBOW = 13
- RIGHT_ELBOW = 14
- LEFT_WRIST = 15
- RIGHT_WRIST = 16
- NOSE = 0

Write a function called extract_body_proportions(image_path: str, height_cm: float = None, weight_kg: float = None) that:

1. Loads the image with OpenCV
2. Runs MediaPipe Pose with static_image_mode=True, min_detection_confidence=0.5
3. Gets landmarks in pixel coordinates (multiply normalized coords by image width/height)
4. Calculates these proportions as RATIOS (not real-world cm) relative to shoulder_width as the base unit:

   shoulder_width = distance(left_shoulder, right_shoulder)
   torso_length = distance(midpoint(shoulders), midpoint(hips))
   sleeve_length = distance(shoulder, wrist) for the more visible arm
   neck_width = estimated as 0.22 * shoulder_width (approximation)

   torso_length_ratio = torso_length / shoulder_width
   sleeve_length_ratio = sleeve_length / shoulder_width
   shoulder_width_ratio = 1.0 (this is always the base)

5. If height_cm and weight_kg are provided, calculate a BMI-based calibration factor:
   bmi = weight_kg / ((height_cm/100) ** 2)
   If bmi < 18.5: calibration = 0.9 (lean)
   If 18.5 <= bmi < 25: calibration = 1.0 (average)
   If 25 <= bmi < 30: calibration = 1.1 (slightly fuller)
   If bmi >= 30: calibration = 1.2 (fuller)
   Apply calibration to shoulder_width_ratio

6. Estimate size using this logic:
   If shoulder_width_ratio * calibration < 0.85: size = "XS"
   If shoulder_width_ratio * calibration < 1.0: size = "S"
   If shoulder_width_ratio * calibration < 1.15: size = "M"
   If shoulder_width_ratio * calibration < 1.3: size = "L"
   Else: size = "XL"

   Note: these thresholds compare relative proportions, not real cm.
   The shoulder_width_ratio is normalized per image so these thresholds
   need to be calibrated using the image pixel scale.
   Use shoulder_width_pixels / (image_width * 0.3) as the normalized ratio.

7. Return a BodyProfile with all the calculated values

8. Add a fallback: if MediaPipe fails to detect landmarks, raise a ValueError with message "Could not detect body landmarks. Please use a clear front-facing photo."

Also write a helper function called draw_landmarks_debug(image_path, output_path) that draws the detected landmarks on the image and saves it. This is for debugging only.
```

---

### Step 1.2 — Body analysis router

**AGENT PROMPT 1.2**
```
In backend/routers/body.py, write the /analyze-body endpoint.

Create a POST endpoint at /analyze-body that:
1. Accepts a multipart form with:
   - file: UploadFile (the user photo)
   - height_cm: float (optional, form field)
   - weight_kg: float (optional, form field)

2. Saves the uploaded file temporarily to /tmp/user_upload_{timestamp}.jpg

3. Calls extract_body_proportions from services/body_analysis.py

4. Returns the BodyProfile as JSON

5. Cleans up the temp file after processing

6. Returns a proper 400 error with the message if body landmark detection fails

Use FastAPI's HTTPException for errors. Use python-multipart for file handling.
Make sure the endpoint has CORS-compatible response headers.
```

---

### Step 1.3 — Test the body analysis

**AGENT PROMPT 1.3**
```
Write a test script at backend/test_body_analysis.py that:
1. Downloads this test image from the web: https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400
2. Saves it to /tmp/test_person.jpg
3. Calls extract_body_proportions with height_cm=175, weight_kg=70
4. Prints the resulting BodyProfile as formatted JSON
5. Calls draw_landmarks_debug to save a debug image to /tmp/debug_landmarks.jpg
6. Prints "SUCCESS" if everything worked, or prints the error if it failed

Run this script and show me the output.
```

---

### CHECKPOINT 1

- [ ] Run the test script — should print a BodyProfile with size estimate
- [ ] POST to localhost:8000/analyze-body with a photo — should return body proportions
- [ ] If MediaPipe fails on the test image, try a different clearer photo

---

---

# PHASE 2 — Garment Inventory System

**What you're doing:** Building the admin upload system and garment database so there are clothes to try on.

**Time estimate:** 1 day

---

### Step 2.1 — Garment router (full CRUD)

**AGENT PROMPT 2.1**
```
In backend/routers/garments.py, write the complete garments API.

Endpoints:

1. GET /garments
   - Returns all garments from MongoDB
   - Optional query params: category (filter by category), fit_type (filter by fit type)
   - Returns list of GarmentModel objects

2. GET /garments/{garment_id}
   - Returns single garment by MongoDB _id
   - Returns 404 if not found

3. POST /garments (admin upload)
   - Accepts multipart form with:
     - name: str
     - category: str (tshirt, hoodie, jacket, shirt)
     - fit_type: str (tight, regular, oversized)
     - render_mode: str (overlay, replacement)
     - torso_ratio: float (default 1.0)
     - shoulder_ratio: float (default 1.0)
     - sleeve_ratio: float (default 0.85)
     - drape_factor: float (default 0.5)
     - display_image: UploadFile (the garment on a model or flat)
     - garment_image: UploadFile (clean garment on white background — for VTON input)
   - Uploads both images to Cloudinary
   - Saves garment document to MongoDB
   - Returns the created GarmentModel

4. DELETE /garments/{garment_id}
   - Deletes garment from MongoDB
   - Returns {"deleted": true}

Import and use functions from services/cloudinary_service.py for image uploads.
Use get_collection("garments") from database/connection.py.
```

---

### Step 2.2 — Cloudinary service

**AGENT PROMPT 2.2**
```
In backend/services/cloudinary_service.py, write the Cloudinary integration.

Load CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET from environment and configure cloudinary.

Write these functions:

1. upload_image(file_path: str, folder: str = "vton") -> str
   - Uploads a local file to Cloudinary in the given folder
   - Returns the secure_url of the uploaded image
   - Raises an exception with a clear message if upload fails

2. upload_image_bytes(image_bytes: bytes, filename: str, folder: str = "vton") -> str
   - Same as above but accepts bytes instead of file path
   - Useful for uploading processed/rendered images

3. delete_image(public_id: str) -> bool
   - Deletes an image from Cloudinary by public_id
   - Returns True if successful

Also write a helper: get_public_id_from_url(url: str) -> str
that extracts the Cloudinary public_id from a secure_url.
```

---

### Step 2.3 — Seed demo garments

**AGENT PROMPT 2.3**
```
Write a seed script at backend/seed_garments.py that populates the database with 6 demo garments.

For each garment, download a free clothing image from Unsplash (use the Unsplash source API: https://source.unsplash.com/400x500/?{keyword}) and upload it to Cloudinary as both display_image and garment_image.

Seed these 6 garments:

1. name: "Classic White Tee", category: "tshirt", fit_type: "regular",
   render_mode: "replacement", torso_ratio: 1.0, shoulder_ratio: 1.0,
   sleeve_ratio: 0.7, drape_factor: 0.3
   keyword: "white+tshirt"

2. name: "Oversized Hoodie", category: "hoodie", fit_type: "oversized",
   render_mode: "overlay", torso_ratio: 1.3, shoulder_ratio: 1.15,
   sleeve_ratio: 0.9, drape_factor: 0.8
   keyword: "hoodie"

3. name: "Slim Fit Shirt", category: "shirt", fit_type: "tight",
   render_mode: "replacement", torso_ratio: 0.9, shoulder_ratio: 0.95,
   sleeve_ratio: 0.75, drape_factor: 0.2
   keyword: "dress+shirt"

4. name: "Bomber Jacket", category: "jacket", fit_type: "regular",
   render_mode: "overlay", torso_ratio: 1.1, shoulder_ratio: 1.05,
   sleeve_ratio: 0.85, drape_factor: 0.6
   keyword: "bomber+jacket"

5. name: "Crop Hoodie", category: "hoodie", fit_type: "oversized",
   render_mode: "overlay", torso_ratio: 0.85, shoulder_ratio: 1.1,
   sleeve_ratio: 0.8, drape_factor: 0.7
   keyword: "crop+hoodie"

6. name: "Denim Jacket", category: "jacket", fit_type: "regular",
   render_mode: "overlay", torso_ratio: 1.05, shoulder_ratio: 1.0,
   sleeve_ratio: 0.82, drape_factor: 0.5
   keyword: "denim+jacket"

After seeding, print each garment name and its MongoDB _id.
```

---

### CHECKPOINT 2

- [ ] Run seed script — 6 garments in MongoDB
- [ ] GET localhost:8000/garments — returns all 6
- [ ] GET localhost:8000/garments?category=hoodie — returns 2
- [ ] Cloudinary dashboard shows uploaded images

---

---

# PHASE 3 — Fit Engine

**What you're doing:** The intelligence layer. Pure Python math that compares body proportions to garment metadata and produces size recommendation, fit label, and visual adjustments.

**Time estimate:** 1 day

---

### Step 3.1 — Fit engine core

**AGENT PROMPT 3.1**
```
In backend/services/fit_engine.py, write the complete fit engine.

This is pure Python logic — no ML, no API calls.

Import BodyProfile from models/body_profile.py and GarmentModel from models/garment.py.

Write a dataclass called FitResult with fields:
  recommended_size: str          # XS, S, M, L, XL
  fit_label: str                 # "tight", "regular fit", "oversized"
  fit_score: float               # 0.0 to 1.0, how well the garment fits
  shoulder_offset: float         # pixels to shift garment horizontally (+ right, - left)
  torso_scale_factor: float      # scale multiplier for garment height
  sleeve_scale_factor: float     # scale multiplier for sleeve length
  shoulder_scale_factor: float   # scale multiplier for garment width
  fit_notes: list[str]           # human-readable notes like "Shoulders may feel tight"

Write the main function: calculate_fit(body: BodyProfile, garment: GarmentModel) -> FitResult

Logic:

1. SHOULDER FIT
   body_shoulder = body.shoulder_width_ratio
   garment_shoulder = garment.shoulder_ratio
   shoulder_delta = garment_shoulder - body_shoulder

   If shoulder_delta < -0.1: shoulders are tight (garment narrower than body)
   If shoulder_delta > 0.15: shoulders are dropped/oversized
   Else: regular shoulder fit

   shoulder_scale_factor = garment_shoulder / body_shoulder clamped between 0.85 and 1.3

2. TORSO FIT
   torso_delta = garment.torso_ratio - body.torso_length_ratio
   torso_scale_factor = garment.torso_ratio / body.torso_length_ratio clamped between 0.8 and 1.4

3. SLEEVE FIT
   sleeve_delta = garment.sleeve_ratio - body.sleeve_length_ratio
   sleeve_scale_factor = garment.sleeve_ratio / body.sleeve_length_ratio clamped between 0.75 and 1.2

4. FIT LABEL (based on drape_factor and deltas)
   If garment.drape_factor > 0.6 and shoulder_scale_factor > 1.1: "oversized"
   Elif shoulder_scale_factor < 0.95 and garment.drape_factor < 0.4: "tight fit"
   Else: "regular fit"

5. SIZE RECOMMENDATION
   Use body.estimated_size as the base.
   If shoulder_delta > 0.2: recommend one size down
   If shoulder_delta < -0.15: recommend one size up
   Else: keep body.estimated_size

   Size order: XS -> S -> M -> L -> XL

6. FIT SCORE
   A float from 0 to 1 representing how well this specific garment fits this body.
   Score = 1.0 - (abs(shoulder_delta) * 0.5 + abs(torso_delta) * 0.3 + abs(sleeve_delta) * 0.2)
   Clamp between 0.0 and 1.0

7. FIT NOTES (human-readable feedback)
   Build a list of short strings based on the deltas:
   - If shoulder tight: "Shoulders may feel snug"
   - If dropped: "Expect relaxed shoulder drop"
   - If sleeve short: "Sleeves may sit above wrist"
   - If sleeve long: "Sleeves will have extra length"
   - If torso short: "Cropped silhouette"
   - If torso long: "Extra length, may need tucking"
   - Always add one note about fit_label

Also write a function: get_similar_items(garment: GarmentModel, all_garments: list[GarmentModel], body: BodyProfile) -> list[GarmentModel]
   Returns up to 3 garments from all_garments (excluding the current one) that:
   - Have the same fit_type as the current garment OR the recommended fit based on body score
   - Have similar torso_ratio (within 0.2)
   - Sorted by fit_score (best fit first)
```

---

### Step 3.2 — Test the fit engine

**AGENT PROMPT 3.2**
```
Write a test at backend/test_fit_engine.py that:

1. Creates a mock BodyProfile representing:
   - A medium-build person
   - shoulder_width_ratio: 1.0
   - torso_length_ratio: 1.35
   - sleeve_length_ratio: 1.1
   - estimated_size: "M"

2. Creates 3 mock GarmentModels:
   - The oversized hoodie (torso_ratio: 1.3, shoulder_ratio: 1.15, drape_factor: 0.8)
   - The slim shirt (torso_ratio: 0.9, shoulder_ratio: 0.95, drape_factor: 0.2)
   - The bomber jacket (torso_ratio: 1.1, shoulder_ratio: 1.05, drape_factor: 0.6)

3. Runs calculate_fit for each garment and prints:
   - Garment name
   - fit_label
   - recommended_size
   - fit_score
   - fit_notes

Expected output should show the hoodie as "oversized", shirt as "tight fit", jacket as "regular fit".
```

---

### CHECKPOINT 3

- [ ] Test script runs and shows 3 different fit outputs
- [ ] fit_score is highest for the jacket (most regular fit)
- [ ] fit_notes contain sensible human-readable messages

---

---

# PHASE 4 — VTON Model Integration

**What you're doing:** Connecting to the OOTDiffusion model on HuggingFace Spaces. This is the core AI step that produces the try-on image.

**Time estimate:** 1 day

---

### Step 4.1 — HuggingFace VTON service

**AGENT PROMPT 4.1**
```
In backend/services/vton_service.py, write the HuggingFace Spaces VTON integration.

Use the gradio_client library.

The HuggingFace Space to use is: "levihsu/OOTDiffusion"
(This is free, public, no API key needed)

Write a function: run_vton(person_image_path: str, garment_image_path: str) -> str

This function should:

1. Connect to the Gradio space using Client("levihsu/OOTDiffusion")

2. Call the /run_ootd endpoint with these parameters:
   - vton_img: handle_file(person_image_path)
   - garm_img: handle_file(garment_image_path)
   - category: "Upper-body"
   - n_samples: 1
   - n_steps: 20
   - image_scale: 2.0
   - seed: -1

3. The result will be a list of image objects. Extract the first image filepath from result[0]

4. Copy the output image to /tmp/vton_output_{timestamp}.jpg

5. Return the path to the output image

6. Add a timeout of 180 seconds (3 minutes) — HuggingFace free tier can be slow

7. Add proper error handling:
   - If the space is sleeping (queue timeout): raise ValueError("VTON service is starting up, please try again in 60 seconds")
   - If the result is empty: raise ValueError("VTON model returned no output")
   - Any other error: re-raise with context

Also write a fallback function: run_vton_fallback(person_image_path: str, garment_image_path: str) -> str
This is a SIMPLE overlay fallback if the HuggingFace call fails:
- Load person image with Pillow
- Load garment image with Pillow
- Resize garment to fit the upper body region (top 60% of the image, full width)
- Paste with alpha blending at 0.85 opacity
- Save to /tmp/vton_fallback_{timestamp}.jpg
- Return the path
Note: this looks rough but ensures the system never fully fails.

Make run_vton try the HuggingFace call first, and if it fails, log the error and call run_vton_fallback instead. Add a flag to the returned data so the frontend can show a "Basic overlay mode" label when fallback is used.
```

---

### Step 4.2 — Segmentation service

**AGENT PROMPT 4.2**
```
In backend/services/segmentation.py, write the body segmentation service.

This service creates masks to enable realistic layering (neck above shirt, arms above garment).

Use rembg for background removal and OpenCV for mask operations.

Write these functions:

1. remove_background(image_path: str) -> tuple[np.ndarray, np.ndarray]
   - Uses rembg to remove background from a person image
   - Returns (person_rgba, alpha_mask) where person_rgba is RGBA and alpha_mask is the person silhouette

2. create_upper_body_mask(image_path: str, landmarks: dict) -> np.ndarray
   - Takes an image and MediaPipe landmark dict
   - Creates a mask for the upper body region (from shoulders to hips)
   - Returns a binary mask (255 = upper body, 0 = rest)
   - Use the shoulder and hip landmarks to define the region

3. composite_with_layering(
       person_image_path: str,
       vton_result_path: str,
       landmarks: dict
   ) -> np.ndarray
   - This is the main compositing function
   - Load both images
   - Extract neck region (above shoulders) from person image
   - Extract arm regions (outside shoulder-to-wrist lines) from person image
   - Composite: vton_result as base, then paste neck and arm regions on top
   - This creates the illusion of the person wearing the garment (not just overlaid on top)
   - Return the composited image as numpy array

4. save_image(image: np.ndarray, path: str) -> str
   - Saves numpy array image to path
   - Returns the path
```

---

### Step 4.3 — Full try-on router

**AGENT PROMPT 4.3**
```
In backend/routers/tryon.py, write the complete try-on endpoint.

Create a POST endpoint at /tryon that:

1. Accepts multipart form with:
   - person_image: UploadFile
   - garment_id: str
   - height_cm: float (optional)
   - weight_kg: float (optional)
   - session_id: str (optional, generate UUID if not provided)

2. Processing pipeline (in order):
   a. Save person_image to /tmp/
   b. Upload person_image to Cloudinary (for storage)
   c. Fetch garment from MongoDB by garment_id
   d. Download garment's garment_image_url to /tmp/garment_{id}.jpg
   e. Run body analysis: extract_body_proportions(person_image_path, height_cm, weight_kg)
   f. Run fit engine: calculate_fit(body_profile, garment)
   g. Run VTON: run_vton(person_image_path, garment_image_path)
   h. Run compositing: composite_with_layering(person_image_path, vton_result_path, landmarks)
   i. Upload final composited image to Cloudinary
   j. Get similar items from all garments
   k. Save TryOnResult to MongoDB
   l. Clean up all /tmp/ files

3. Return JSON response:
   {
     "session_id": "...",
     "result_image_url": "cloudinary_url",
     "original_image_url": "cloudinary_url",
     "garment": { ...garment object... },
     "body_profile": { ...body proportions... },
     "fit_result": {
       "recommended_size": "M",
       "fit_label": "regular fit",
       "fit_score": 0.82,
       "fit_notes": ["..."]
     },
     "similar_items": [ ...up to 3 garment objects... ],
     "processing_mode": "ai" or "fallback"
   }

4. Add proper error handling:
   - 400 if body detection fails
   - 404 if garment not found
   - 500 with clear message for other errors

5. Add processing time logging — log how long each step takes so we can identify bottlenecks.

This is the most important endpoint. Make it robust.
```

---

### CHECKPOINT 4

- [ ] POST to /tryon with a photo and garment_id — should return a result after 30-60s
- [ ] result_image_url is a valid Cloudinary URL showing the try-on
- [ ] fit_result contains recommendation and notes
- [ ] If HuggingFace is slow or sleeping, fallback kicks in
- [ ] All /tmp files are cleaned up after each request

---

---

# PHASE 5 — History & Recommendations

**Time estimate:** 2–3 hours

---

### Step 5.1 — History router

**AGENT PROMPT 5.1**
```
In backend/routers/history.py, write the history endpoints.

1. GET /history/{session_id}
   - Returns all TryOnResult records for a session_id
   - Sorted by created_at descending (newest first)
   - Returns up to 20 results
   - Returns 404 if no results found for session_id

2. DELETE /history/{session_id}
   - Deletes all records for a session_id
   - Returns {"deleted": count}

3. GET /history/{session_id}/latest
   - Returns the most recent TryOnResult for a session_id

A session_id is a UUID that the frontend generates and stores in localStorage.
No authentication is needed — sessions are anonymous and client-managed.
```

---

---

# PHASE 6 — Frontend

**What you're doing:** Building the entire user-facing React/Next.js application. This is what the recruiter will see.

**Time estimate:** 2–3 days

---

### Step 6.1 — Types and API client

**AGENT PROMPT 6.1**
```
In frontend/lib/types.ts, define all TypeScript types:

type Garment = {
  _id: string
  name: string
  category: string
  fit_type: string
  render_mode: string
  image_url: string
  torso_ratio: number
  shoulder_ratio: number
  sleeve_ratio: number
  drape_factor: number
}

type BodyProfile = {
  shoulder_width_ratio: number
  torso_length_ratio: number
  sleeve_length_ratio: number
  estimated_size: string
}

type FitResult = {
  recommended_size: string
  fit_label: string
  fit_score: number
  fit_notes: string[]
}

type TryOnResponse = {
  session_id: string
  result_image_url: string
  original_image_url: string
  garment: Garment
  body_profile: BodyProfile
  fit_result: FitResult
  similar_items: Garment[]
  processing_mode: "ai" | "fallback"
}

In frontend/lib/api.ts, write all API functions:

1. getGarments(category?: string, fit_type?: string): Promise<Garment[]>
2. getGarment(id: string): Promise<Garment>
3. analyzeBody(file: File, height?: number, weight?: number): Promise<BodyProfile>
4. runTryOn(personImage: File, garmentId: string, sessionId: string, height?: number, weight?: number): Promise<TryOnResponse>
5. getHistory(sessionId: string): Promise<TryOnResponse[]>
6. uploadGarment(formData: FormData): Promise<Garment>

Use fetch() with proper error handling. Read NEXT_PUBLIC_API_URL from process.env.
For runTryOn, use FormData to send multipart.
```

---

### Step 6.2 — Main upload page

**AGENT PROMPT 6.2**
```
In frontend/app/page.tsx, build the main landing page.

Design language: premium fashion e-commerce. Think Zara or SSENSE — minimal, high contrast, clean typography. Dark text on white. No gradients. No shadows. Refined spacing.

The page has these sections:

1. HERO SECTION
   - Navigation bar: logo "VTON" on left (bold, sans-serif), links "Catalog" and "History" on right
   - Large headline: "Try it on before you buy." (large, light weight)
   - Subtext: "Upload your photo. See any garment on you, instantly."
   - CTA button: "Upload Your Photo →" (black background, white text)

2. UPLOAD SECTION (shown after clicking CTA or scrolling)
   - Drag and drop zone: dashed border, "Drop your photo here or click to upload"
   - Accepted formats: JPG, PNG. Max 10MB
   - Photo guidelines (small text): "Front-facing photo works best. Upper body visible."
   - Optional fields (collapsible): Height (cm) and Weight (kg) text inputs
   - Preview: once photo is selected, show a preview thumbnail with a "Change photo" button

3. GARMENT SELECTION (shown after photo is uploaded)
   - Title: "Choose a garment"
   - Filter tabs: All / T-Shirts / Hoodies / Jackets / Shirts
   - Grid of GarmentCard components (3 columns on desktop, 2 on mobile)
   - Selected garment gets a visible selection ring

4. TRY-ON BUTTON
   - Only enabled when both photo and garment are selected
   - Label: "Generate Try-On"
   - Shows LoadingState component when processing

State management: use useState for selectedFile, selectedGarment, height, weight, isLoading, result.
When result is ready, navigate to /try-on?session={session_id}.

Generate and store session_id in localStorage on first visit. Reuse across sessions.
```

---

### Step 6.3 — Garment card component

**AGENT PROMPT 6.3**
```
In frontend/components/GarmentCard.tsx, build the garment card component.

Props:
  garment: Garment
  isSelected: boolean
  onClick: () => void

Design: clean product card.
- Square image (aspect ratio 1:1), object-fit: cover
- Garment name below (14px, medium weight)
- Category tag (small pill, gray background)
- Fit type label (small, colored: tight=blue, regular=green, oversized=orange)
- When isSelected: a 2px black border ring around the entire card, slight scale(1.02) transform
- Hover state: slight scale(1.01) transition

No shadows. No rounded corners on the outer card (sharp edges = fashion aesthetic).
Small border-radius only on the fit type pill.
```

---

### Step 6.4 — Loading state component

**AGENT PROMPT 6.4**
```
In frontend/components/LoadingState.tsx, build the processing loading screen.

This overlays the page or appears in a dedicated section while the VTON model runs.

Show a sequence of status messages that animate through automatically:
- 0–3s:  "Analyzing your body proportions..."
- 3–8s:  "Measuring shoulder and torso ratios..."
- 8–15s: "Adapting garment to your measurements..."
- 15–25s: "Running AI fitting model..."
- 25–45s: "Compositing final image..."
- 45s+:  "Almost there... (AI models can take up to 60s)"

Use a simple animated progress bar (not a spinner).
The bar fills based on elapsed time (reaches 90% at 45s, stays there until done).

Below the progress bar show the current status message.
Smooth crossfade between messages.

Clean, minimal design. Black text on white. No heavy animations.

Props:
  isVisible: boolean
  onCancel?: () => void (optional cancel button after 60s)
```

---

### Step 6.5 — Try-on results page

**AGENT PROMPT 6.5**
```
In frontend/app/try-on/page.tsx, build the results page.

This page reads session_id from the URL query params and fetches the latest result from /history/{session_id}/latest.

Layout (two-column on desktop, stacked on mobile):

LEFT COLUMN — Image comparison:
- Before/After slider component (see below)
- "Before" = original uploaded photo
- "After" = result_image_url
- Small label under image: processing_mode indicator ("AI Mode" or "Basic Overlay Mode")

RIGHT COLUMN — Fit intelligence panel:
- Section 1: "Your Size"
  - Large text showing recommended_size (e.g. "M")
  - Small label: "based on your body proportions"

- Section 2: "Fit Style"
  - Pill label showing fit_label (e.g. "Regular Fit")
  - Fit score bar: a horizontal bar from 0-100%, filled to fit_score * 100%
  - Label: "Fit confidence: 82%"

- Section 3: "Fit Notes"
  - Bullet list of fit_notes
  - Each note as a small line with a checkmark or info icon

- Section 4: "Similar Styles"
  - Horizontal scroll row of up to 3 GarmentCard components
  - Clicking one goes back to homepage with that garment pre-selected

- Action buttons:
  - "Try Another Garment" → back to homepage
  - "Download Image" → download the result image
  - "View History" → /history

Build the BeforeAfterSlider as an inline component:
- A draggable vertical divider overlaid on two stacked images
- Left side shows original, right side shows result
- Drag handle in the middle with left/right arrows
- Use CSS clip-path to reveal/hide each side based on slider position
- Accessible: keyboard-draggable with arrow keys
```

---

### Step 6.6 — Catalog page

**AGENT PROMPT 6.6**
```
In frontend/app/catalog/page.tsx, build the garment catalog page.

This is a standalone browsable page — the "shop" side of the experience.

Header: "Catalog" title, filter tabs (All / T-Shirts / Hoodies / Jackets / Shirts)

Grid: all garments in a responsive grid (4 columns desktop, 2 mobile)

Each garment card when clicked:
- Opens a side drawer (not a modal — a panel that slides in from the right)
- Drawer shows: large garment image, name, category, fit type label, all ratio metadata as a "technical fit data" section
- CTA button in drawer: "Try This On" → navigates to homepage with this garment pre-selected (pass garment_id as query param)

Keep the design consistent with homepage. Same typography, same color palette.
```

---

### Step 6.7 — Admin panel

**AGENT PROMPT 6.7**
```
In frontend/app/admin/page.tsx, build the admin garment upload panel.

Simple, functional, no login needed (it's a demo).

Layout:
- Title: "Admin Panel — Garment Management"
- Two sections side by side: Upload Form (left) and Existing Garments list (right)

UPLOAD FORM fields:
- Garment name (text input)
- Category (select: tshirt, hoodie, jacket, shirt)
- Fit type (select: tight, regular, oversized)
- Render mode (select: overlay, replacement)
- Torso ratio (number input, step 0.05, default 1.0)
- Shoulder ratio (number input, step 0.05, default 1.0)
- Sleeve ratio (number input, step 0.05, default 0.85)
- Drape factor (number input, step 0.1, default 0.5)
- Display image upload (for showing in the catalog)
- Garment image upload (clean garment on white, for VTON input)
- Submit button: "Upload Garment"

Show a small tooltip/helper text next to each ratio field explaining what it means.
Example: "Torso ratio: 1.3 = oversized/long torso, 0.9 = cropped"

EXISTING GARMENTS LIST:
- Shows all garments from GET /garments
- Each row: thumbnail, name, category, fit_type, delete button
- Confirm before deleting

Use the uploadGarment function from lib/api.ts.
Show success/error toast notifications after upload.
```

---

### CHECKPOINT 6

- [ ] Homepage loads, drag-drop works, garments display
- [ ] Select photo + garment → click Generate → loading state shows
- [ ] Results page shows try-on image + fit data
- [ ] Before/after slider is draggable
- [ ] Catalog page browses garments and opens drawer
- [ ] Admin page uploads and deletes garments

---

---

# PHASE 7 — Polish & UX Refinement

**Time estimate:** 1 day

---

### Step 7.1 — Mobile responsiveness

**AGENT PROMPT 7.1**
```
Review every page (homepage, try-on results, catalog, admin) and ensure they work on mobile (375px width).

Specific fixes needed:
1. Homepage: garment grid should be 2 columns on mobile
2. Try-on page: the two columns should stack vertically, image first, fit panel below
3. Catalog page: 2-column grid, drawer takes full width on mobile (bottom sheet style)
4. Navigation: on mobile, show a hamburger menu that reveals the nav links

Also add these UX polish items:
- Smooth page transitions (fade in on mount for each page)
- Image lazy loading with a skeleton placeholder on garment cards
- Error boundary: if the try-on API fails, show a friendly error message with a "Try Again" button
- Toast notification system (use a simple custom component, no library needed)
```

---

### Step 7.2 — Performance and UX details

**AGENT PROMPT 7.2**
```
Add these final polish items:

1. In the LoadingState component: add a tip that rotates every 8 seconds:
   - "Tip: Front-facing mirror selfies work best"
   - "Tip: Good lighting improves accuracy"
   - "Tip: Try oversized fits for a relaxed look"

2. In the try-on results page: add a "Share" button that copies a shareable link to clipboard
   (link format: /try-on?session={session_id})

3. Add a history page at /history:
   - Shows all past try-ons for the current session_id (from localStorage)
   - Grid of result thumbnails
   - Click to view full result

4. In GarmentCard: add a hover tooltip showing the fit notes preview

5. In the catalog drawer: show "Estimated fit for your body" section if a body analysis
   has been done this session (store body profile in localStorage after first analysis)

6. Add a favicon and page title for each route:
   - /: "VTON — Virtual Try-On"
   - /catalog: "Catalog — VTON"
   - /try-on: "Your Try-On — VTON"
   - /admin: "Admin — VTON"
```

---

---

# PHASE 8 — Deployment

**Time estimate:** 2–4 hours

---

### Step 8.1 — Prepare for deployment

**AGENT PROMPT 8.1**
```
Prepare both projects for deployment.

For the backend (Railway):
1. Create a Procfile at backend/Procfile:
   web: uvicorn main:app --host 0.0.0.0 --port $PORT

2. Create backend/runtime.txt:
   python-3.11.0

3. Update backend/main.py CORS settings:
   Allow origins: ["https://your-frontend.vercel.app", "http://localhost:3000"]
   (We will update the Vercel URL after deployment)

4. Add a health check endpoint: GET /health returns {"status": "healthy", "timestamp": datetime.now()}

For the frontend (Vercel):
1. Create frontend/vercel.json:
   {
     "env": {
       "NEXT_PUBLIC_API_URL": "https://your-railway-backend.up.railway.app"
     }
   }

2. Make sure all environment variables are referenced through process.env.NEXT_PUBLIC_API_URL
   and NOT hardcoded anywhere.

3. Add next.config.js with:
   - Image domains: cloudinary.com, res.cloudinary.com
   - Any other required config

4. Run next build locally and fix any TypeScript/build errors before deploying.
```

---

### Step 8.2 — Deployment steps (manual, follow in order)

```
DEPLOY BACKEND TO RAILWAY:
1. Go to railway.app → New Project → Deploy from GitHub
2. Select your repo, select the backend/ folder as root
3. Add environment variables in Railway dashboard (paste from your .env)
4. Railway will auto-detect Python and deploy
5. Copy the generated Railway URL

DEPLOY FRONTEND TO VERCEL:
1. Go to vercel.com → New Project → Import from GitHub
2. Select your repo, set root to frontend/
3. Add environment variable: NEXT_PUBLIC_API_URL = your Railway URL
4. Deploy
5. Copy the Vercel URL

UPDATE CORS:
1. Go back to Railway, update CORS_ORIGINS env var to include your Vercel URL
2. Redeploy backend

TEST DEPLOYED VERSION:
1. Visit your Vercel URL
2. Upload a photo, select a garment, run try-on
3. Verify results appear
```

---

### CHECKPOINT 8

- [ ] Backend responds at Railway URL — GET /health returns healthy
- [ ] Frontend loads at Vercel URL
- [ ] Full try-on flow works on deployed version
- [ ] CORS errors are gone
- [ ] Cloudinary images load from the Vercel frontend

---

---

# PHASE 9 — GitHub README & Demo Video

**This is what the recruiter will see first. Spend real time here.**

**Time estimate:** 2–3 hours

---

### Step 9.1 — README

**AGENT PROMPT 9.1**
```
Write a comprehensive README.md for the root of the project.

Structure:

1. Project name and one-line description
2. A "Live Demo" section with the Vercel URL and a demo GIF/screenshot placeholder
3. "What it does" — 4-5 bullet points, product-focused language
4. "How it works" — technical architecture in plain language:
   - Body analysis (MediaPipe)
   - Fit engine (pure Python geometry)
   - VTON model (OOTDiffusion via HuggingFace)
   - Segmentation layering (rembg + OpenCV)
5. Tech stack table
6. "Key engineering decisions" — 3-4 paragraphs explaining:
   - Why geometry-first instead of pure diffusion
   - The garment metadata system design
   - The two-mode rendering strategy (overlay vs replacement)
   - The fallback system for reliability
7. Local development setup (step by step)
8. API documentation (list all endpoints with request/response shapes)
9. Garment metadata guide (how to set the ratio values for a new garment)
10. Project structure diagram

Write it as if a senior engineer at a fashion tech company is evaluating you.
Show depth of thinking, not just features.
```

---

---

# Debugging Reference

### Common issues and fixes

**MediaPipe fails on photo:**
- Photo must be at least 300x300px
- Person must be at least 30% of frame height
- Check lighting — very dark photos fail detection
- Add print statements before/after landmark detection to identify failure point

**HuggingFace space sleeping:**
- Free spaces sleep after inactivity
- First request after sleep takes 3-5 minutes (waking up)
- Add a /warmup endpoint that pings the HuggingFace space at startup
- The fallback system handles this gracefully

**CORS errors in browser:**
- Check the CORS origins list in main.py
- Deployed frontend URL must be in the list
- Restart backend after changing env vars

**MongoDB connection timeout:**
- MongoDB Atlas free tier may need IP whitelist
- Add 0.0.0.0/0 to allowed IPs in Atlas → Network Access
- Check MONGODB_URI format includes the database name

**Cloudinary upload fails:**
- Verify all three env vars (cloud_name, api_key, api_secret)
- Check file size — Cloudinary free tier has 10MB limit per upload
- Use upload_image_bytes for in-memory images

**Before/after slider not working on mobile:**
- Add touch event handlers alongside mouse events
- Use pointer events API instead of mouse events for cross-platform

---

# Final Prompts for Polish

After completing all phases, use these three final prompts:

**FINAL PROMPT A — Code review**
```
Review the entire backend codebase for:
1. Any unhandled exceptions that could crash the server
2. Missing input validation on API endpoints
3. Any /tmp files that might not be cleaned up
4. Hardcoded values that should be in environment variables
5. Any endpoints that could be slow and need async optimization
List all issues found and fix the critical ones.
```

**FINAL PROMPT B — UI consistency check**
```
Review the entire frontend for:
1. Any hardcoded colors that should use Tailwind classes
2. Inconsistent spacing or font sizes across pages
3. Any missing loading or error states
4. Mobile breakpoints that are missing or broken
5. Any console.log statements that should be removed for production
Fix all issues found.
```

**FINAL PROMPT C — Demo preparation**
```
Prepare the app for a demo recording:
1. Pre-populate the admin panel with 6 high-quality garments if not already done
2. Set up a demo flow that shows:
   - Photo upload with body analysis
   - Garment selection with filters
   - Loading state with progress messages
   - Results with before/after slider and fit data
   - Similar items suggestions
3. Ensure the app is in a clean state (no old test data)
4. Test the full flow 3 times and confirm it works end to end
```

---

*Document version: 1.0 — Build this in order, phase by phase. Each checkpoint must pass before moving to the next phase.*
