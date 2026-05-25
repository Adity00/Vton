from datetime import datetime
from typing import List
from bson import ObjectId
from fastapi import APIRouter, HTTPException

from database.connection import get_collection

router = APIRouter()


def _doc_to_response(doc: dict) -> dict:
    """Convert a raw MongoDB tryon_result document to a serializable dict."""
    doc["id"] = str(doc.pop("_id"))
    if "created_at" in doc and isinstance(doc["created_at"], datetime):
        doc["created_at"] = doc["created_at"].isoformat()
    return doc


# ---------------------------------------------------------------------------
# GET /history/{session_id}
# ---------------------------------------------------------------------------

@router.get("/{session_id}")
def get_session_history(session_id: str):
    """
    Return all try-on results for a session_id (up to 20),
    sorted by created_at descending (newest first).
    """
    col = get_collection("tryon_results")
    docs = list(
        col.find({"session_id": session_id})
           .sort("created_at", -1)
           .limit(20)
    )
    if not docs:
        raise HTTPException(
            status_code=404,
            detail=f"No try-on history found for session '{session_id}'"
        )
    return [_doc_to_response(d) for d in docs]


# ---------------------------------------------------------------------------
# GET /history/{session_id}/latest
# ---------------------------------------------------------------------------

@router.get("/{session_id}/latest")
def get_latest_result(session_id: str):
    """Return the most recent try-on result for a session."""
    col = get_collection("tryon_results")
    doc = col.find_one(
        {"session_id": session_id},
        sort=[("created_at", -1)]
    )
    if not doc:
        raise HTTPException(
            status_code=404,
            detail=f"No try-on history found for session '{session_id}'"
        )
    return _doc_to_response(doc)


# ---------------------------------------------------------------------------
# DELETE /history/{session_id}
# ---------------------------------------------------------------------------

@router.delete("/{session_id}")
def delete_session_history(session_id: str):
    """Delete all try-on records for a session_id."""
    col = get_collection("tryon_results")
    result = col.delete_many({"session_id": session_id})
    return {"deleted": result.deleted_count, "session_id": session_id}
