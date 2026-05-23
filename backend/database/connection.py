import os
from pymongo import MongoClient
from pymongo.database import Database
from pymongo.collection import Collection
from dotenv import load_dotenv

load_dotenv()

_client: MongoClient = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        uri = os.getenv("MONGODB_URI")
        if not uri:
            raise ValueError("MONGODB_URI is not set in environment variables")
        _client = MongoClient(uri, serverSelectionTimeoutMS=5000)
    return _client


def get_database() -> Database:
    client = get_client()
    return client["vton"]


def get_collection(name: str) -> Collection:
    db = get_database()
    return db[name]


def check_connection():
    """Test MongoDB connectivity on startup."""
    try:
        uri = os.getenv("MONGODB_URI")
        if not uri:
            print("[WARN] MONGODB_URI not set. Set it in backend/.env to enable database features.")
            return
        client = get_client()
        client.admin.command("ping")
        print("[OK] MongoDB connected")
    except Exception as e:
        print(f"[WARN] MongoDB connection failed: {e}")
        print("   Running without DB - set MONGODB_URI in backend/.env")
