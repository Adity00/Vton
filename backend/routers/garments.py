from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def garments_status():
    return {"status": "ok"}
