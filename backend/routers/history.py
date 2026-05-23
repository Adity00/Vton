from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def history_status():
    return {"status": "ok"}
