"""Secrets vault — Fernet-encrypted secrets stored in Mongo.

On startup, the OpenRouter API key from the env is encrypted with the local
FERNET_MASTER and persisted to `db.secrets`. The plaintext env value can be
rotated out afterwards (or kept as a bootstrap fallback). Runtime code reads
the decrypted value on demand — the key is never returned by any API endpoint.
"""
from __future__ import annotations
import os
from typing import Optional
from cryptography.fernet import Fernet, InvalidToken


_fernet: Optional[Fernet] = None


def _get_fernet() -> Fernet:
    global _fernet
    if _fernet is None:
        key = os.environ.get("FERNET_MASTER")
        if not key:
            raise RuntimeError("FERNET_MASTER not set")
        _fernet = Fernet(key.encode() if isinstance(key, str) else key)
    return _fernet


def encrypt(value: str) -> str:
    return _get_fernet().encrypt(value.encode()).decode()


def decrypt(token: str) -> str:
    try:
        return _get_fernet().decrypt(token.encode()).decode()
    except (InvalidToken, ValueError):
        return ""


async def bootstrap(db):
    """Encrypt and persist the OpenRouter key from .env into Mongo if not already
    stored. Idempotent."""
    plaintext = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not plaintext:
        return
    existing = await db.secrets.find_one({"name": "openrouter"}, {"_id": 0})
    if existing:
        # verify decrypt works; if not, replace with current plaintext
        try:
            if decrypt(existing.get("ciphertext", "")):
                return
        except Exception:
            pass
    token = encrypt(plaintext)
    await db.secrets.update_one(
        {"name": "openrouter"},
        {"$set": {"name": "openrouter", "ciphertext": token}},
        upsert=True,
    )


async def get_openrouter_key(db) -> str:
    doc = await db.secrets.find_one({"name": "openrouter"}, {"_id": 0})
    if doc and doc.get("ciphertext"):
        pt = decrypt(doc["ciphertext"])
        if pt:
            return pt
    # fallback: env (bootstrap not yet run)
    return os.environ.get("OPENROUTER_API_KEY", "")


async def set_openrouter_key(db, plaintext: str) -> bool:
    if not plaintext or not plaintext.startswith("sk-"):
        return False
    token = encrypt(plaintext.strip())
    await db.secrets.update_one(
        {"name": "openrouter"},
        {"$set": {"name": "openrouter", "ciphertext": token}},
        upsert=True,
    )
    return True
