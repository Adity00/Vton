from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from routers import tryon, garments, body, history
from database.connection import check_connection


@asynccontextmanager
async def lifespan(app: FastAPI):
    check_connection()
    yield


app = FastAPI(title="VTON API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tryon.router, prefix="/tryon", tags=["tryon"])
app.include_router(garments.router, prefix="/garments", tags=["garments"])
app.include_router(body.router, prefix="/analyze-body", tags=["body"])
app.include_router(history.router, prefix="/history", tags=["history"])


@app.get("/")
def root():
    return {"status": "VTON API running"}


@app.get("/health")
def health():
    from datetime import datetime
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}
