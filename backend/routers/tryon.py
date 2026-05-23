from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def tryon_status():
    return {"status": "ok"}
