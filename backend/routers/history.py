from datetime import datetime
from typing import List
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends

from database.connection import get_collection
from dependencies.auth import get_current_user_id

router = APIRouter()


def _doc_to_response(doc: dict) -> dict:
    """Convert a raw MongoDB tryon_result document to a serializable dict."""
    doc["id"] = str(doc.pop("_id"))
    if "created_at" in doc and isinstance(doc["created_at"], datetime):
        doc["created_at"] = doc["created_at"].isoformat()
    return doc


# ---------------------------------------------------------------------------
# GET /history
# ---------------------------------------------------------------------------

@router.get("")
def get_user_history(user_id: str = Depends(get_current_user_id)):
    """
    Return all try-on results for the authenticated user,
    sorted by created_at descending (newest first).
    """
    col = get_collection("tryon_results")
    docs = list(
        col.find({"user_id": user_id})
           .sort("created_at", -1)
           .limit(20)
    )
    return [_doc_to_response(d) for d in docs]


# ---------------------------------------------------------------------------
# GET /history/{tryon_id}
# ---------------------------------------------------------------------------

@router.get("/{tryon_id}")
def get_tryon_result(tryon_id: str, user_id: str = Depends(get_current_user_id)):
    """Return a specific try-on result by ID for the authenticated user."""
    col = get_collection("tryon_results")
    try:
        oid = ObjectId(tryon_id)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid try-on ID format."
        )
    doc = col.find_one({"_id": oid, "user_id": user_id})
    if not doc:
        raise HTTPException(
            status_code=404,
            detail="Try-on result not found."
        )
    return _doc_to_response(doc)


# ---------------------------------------------------------------------------
# GET /history/latest
# ---------------------------------------------------------------------------

@router.get("/latest")
def get_latest_result(user_id: str = Depends(get_current_user_id)):
    """Return the most recent try-on result for the user."""
    col = get_collection("tryon_results")
    doc = col.find_one(
        {"user_id": user_id},
        sort=[("created_at", -1)]
    )
    if not doc:
        raise HTTPException(
            status_code=404,
            detail="No try-on history found."
        )
    return _doc_to_response(doc)


# ---------------------------------------------------------------------------
# DELETE /history
# ---------------------------------------------------------------------------

@router.delete("")
def delete_user_history(user_id: str = Depends(get_current_user_id)):
    """Delete all try-on records for the authenticated user."""
    col = get_collection("tryon_results")
    result = col.delete_many({"user_id": user_id})
    return {"deleted": result.deleted_count}
