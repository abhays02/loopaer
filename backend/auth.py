"""In-house JWT auth — signup / login / me. No third-party OAuth."""
from __future__ import annotations
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, Header
from passlib.context import CryptContext
from jose import jwt, JWTError
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, EmailStr


pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGO = "HS256"
TOKEN_TTL = timedelta(days=14)


def _secret() -> str:
    # Reuse the fernet master as the JWT secret — separately safe since both
    # are private to the backend. Add a namespace to avoid cross-use.
    return "loopaer-jwt::" + os.environ.get("FERNET_MASTER", "dev")


class SignupBody(BaseModel):
    email: str
    password: str
    name: Optional[str] = None


class LoginBody(BaseModel):
    email: str
    password: str


def _validate_email(email: str) -> str:
    e = (email or "").strip().lower()
    if "@" not in e or "." not in e.split("@")[-1] or len(e) < 5:
        raise HTTPException(400, "invalid email")
    return e


def hash_pw(pw: str) -> str:
    return pwd.hash(pw)


def verify_pw(pw: str, ph: str) -> bool:
    try:
        return pwd.verify(pw, ph)
    except Exception:
        return False


def make_token(user_id: str, email: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": user_id, "email": email, "iat": now, "exp": now + TOKEN_TTL}
    return jwt.encode(payload, _secret(), algorithm=ALGO)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, _secret(), algorithms=[ALGO])
    except JWTError:
        return None


async def ensure_indexes(db: AsyncIOMotorDatabase):
    try:
        await db.users.create_index("email", unique=True)
    except Exception:
        pass


async def signup(db: AsyncIOMotorDatabase, body: SignupBody) -> dict:
    if len(body.password) < 6:
        raise HTTPException(400, "password must be at least 6 characters")
    email = _validate_email(body.email)
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(409, "email already registered")
    user = {
        "id": f"u_{uuid.uuid4().hex[:10]}",
        "email": email,
        "name": (body.name or email.split("@")[0]).strip(),
        "password_hash": hash_pw(body.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)
    return {
        "user": {"id": user["id"], "email": user["email"], "name": user["name"]},
        "token": make_token(user["id"], user["email"]),
    }


async def login(db: AsyncIOMotorDatabase, body: LoginBody) -> dict:
    email = _validate_email(body.email)
    doc = await db.users.find_one({"email": email})
    if not doc or not verify_pw(body.password, doc.get("password_hash", "")):
        raise HTTPException(401, "invalid credentials")
    return {
        "user": {"id": doc["id"], "email": doc["email"], "name": doc.get("name", "")},
        "token": make_token(doc["id"], doc["email"]),
    }


async def current_user(
    authorization: Optional[str] = Header(default=None),
    db=None,
) -> Optional[dict]:
    """Non-strict: returns user dict if valid token, else None. Routes decide
    whether to require it. Attach via server.py's Depends()."""
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    payload = decode_token(token)
    if not payload:
        return None
    return {"id": payload.get("sub"), "email": payload.get("email")}
