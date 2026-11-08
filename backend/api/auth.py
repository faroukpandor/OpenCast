"""
User Authentication module using FastAPI security utilities.
Simple, secure token-based authentication with salted PBKDF2 password hashing.
Endpoints for registration, login, logout, and current user profile.
Links verified streaming engineers to comments.
"""

import hashlib
import secrets
import hmac
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field

from database import get_db_connection

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)

class RegisterPayload(BaseModel):
    username: str = Field(..., min_length=3, max_length=30)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)

class LoginPayload(BaseModel):
    username_or_email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)

def hash_password(password: str, salt: Optional[str] = None) -> str:
    """Hashes a password with PBKDF2-HMAC-SHA256 and a 16-byte random salt."""
    if not salt:
        salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100000
    )
    return f"{salt}${key.hex()}"

def verify_password(password: str, stored_hash: str) -> bool:
    """Verifies password using constant-time comparison against stored salt$hash."""
    try:
        salt, key_hex = stored_hash.split("$")
        computed = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            100000
        ).hex()
        return hmac.compare_digest(key_hex, computed)
    except Exception:
        return False

async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """FastAPI security dependency to resolve user from Bearer token."""
    if not credentials:
        return None
    token = credentials.credentials
    db = await get_db_connection()
    try:
        cursor = await db.execute(
            "SELECT id, username, email, created_at FROM users WHERE token = ?;",
            (token,)
        )
        user = await cursor.fetchone()
        return dict(user) if user else None
    finally:
        await db.close()

@router.post("/register")
async def register(payload: RegisterPayload):
    """
    Registers a new user and returns a session token.
    """
    db = await get_db_connection()
    try:
        # Check if username or email already exists
        cursor = await db.execute(
            "SELECT id FROM users WHERE username = ? OR email = ?;",
            (payload.username, payload.email)
        )
        existing = await cursor.fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="Username or email already in use")

        hashed_pw = hash_password(payload.password)
        token = secrets.token_urlsafe(32)

        cursor = await db.execute(
            """
            INSERT INTO users (username, email, hashed_password, token, created_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP);
            """,
            (payload.username, payload.email, hashed_pw, token)
        )
        user_id = cursor.lastrowid
        await db.commit()

        return {
            "status": "success",
            "token": token,
            "user": {
                "id": user_id,
                "username": payload.username,
                "email": payload.email
            }
        }
    finally:
        await db.close()

@router.post("/login")
async def login(payload: LoginPayload):
    """
    Authenticates username/email and password, returning a session token.
    """
    db = await get_db_connection()
    try:
        cursor = await db.execute(
            "SELECT id, username, email, hashed_password, token FROM users WHERE username = ? OR email = ?;",
            (payload.username_or_email, payload.username_or_email)
        )
        user = await cursor.fetchone()
        if not user or not verify_password(payload.password, user["hashed_password"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Generate a new token on login
        new_token = secrets.token_urlsafe(32)
        await db.execute("UPDATE users SET token = ? WHERE id = ?;", (new_token, user["id"]))
        await db.commit()

        return {
            "status": "success",
            "token": new_token,
            "user": {
                "id": user["id"],
                "username": user["username"],
                "email": user["email"]
            }
        }
    finally:
        await db.close()

@router.post("/logout")
async def logout(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """
    Invalidates current user session token.
    """
    if credentials:
        db = await get_db_connection()
        try:
            await db.execute("UPDATE users SET token = NULL WHERE token = ?;", (credentials.credentials,))
            await db.commit()
        finally:
            await db.close()
    return {"status": "logged_out"}

@router.get("/me")
async def current_user_profile(user: Optional[dict] = Depends(get_current_user)):
    """
    Returns current authenticated profile.
    """
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {"authenticated": True, "user": user}
