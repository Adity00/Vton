from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from bson import ObjectId

from services.auth_service import SECRET_KEY, ALGORITHM
from models.user import TokenData
from database.connection import get_collection

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

async def get_current_user_id(token: str = Depends(oauth2_scheme)) -> str:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("user_id")
        if user_id is None:
            raise credentials_exception
        token_data = TokenData(user_id=user_id)
    except JWTError:
        raise credentials_exception
        
    users = get_collection("users")
    user = users.find_one({"_id": ObjectId(token_data.user_id)})
    if user is None:
        raise credentials_exception
        
    return str(user["_id"])

async def get_current_user_doc(token: str = Depends(oauth2_scheme)) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("user_id")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    users = get_collection("users")
    user = users.find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise credentials_exception
        
    return user
