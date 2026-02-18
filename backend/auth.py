import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
# from passlib.context import CryptContext (Removed)
import bcrypt
from pydantic import BaseModel

# --- Configuration ---
SECRET_KEY = os.getenv("SECRET_KEY", "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 day

# pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto") (Removed)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: str | None = None
    clinic_id: str | None = None
    doctor_id: str | None = None

class User(BaseModel):
    id: str
    username: str
    clinic_id: str
    doctor_id: str
    role: str

# --- Password Utilities ---

def verify_password(plain_password: str, hashed_password: str) -> bool:
    # For migration from plain text to hashed:
    # If the hash doesn't look like bcrypt (e.g. doesn't start with $2b$ or $2a$),
    # treat it as plain text. (TEMPORARY: Remove after all users are migrated)
    if not hashed_password.startswith("$2b$") and not hashed_password.startswith("$2a$"):
        return plain_password == hashed_password
    
    try:
        # bcrypt requires bytes
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception as e:
        print(f"Bcrypt verification failed: {e}")
        return False

def get_password_hash(password: str) -> str:
    # bcrypt.hashpw returns bytes, we decode to string for storage
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    return hashed.decode('utf-8')

# --- JWT Utilities ---

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        clinic_id: str = payload.get("clinic_id")
        doctor_id: str = payload.get("doctor_id")
        user_id: str = payload.get("user_id")
        role: str = payload.get("role", "doctor")

        if username is None or clinic_id is None:
            raise credentials_exception
        
        token_data = TokenData(username=username, clinic_id=clinic_id, doctor_id=doctor_id)
        
        # In a strict system, checking DB here is better.
        # For performance/MVP, we trust the signed token.
        return User(
            id=user_id,
            username=username,
            clinic_id=clinic_id,
            doctor_id=doctor_id,
            role=role
        )
        
    except JWTError:
        raise credentials_exception
