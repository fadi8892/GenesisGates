from __future__ import annotations
import base64, hmac, hashlib, os, time
from typing import Optional
from fastapi import Cookie, HTTPException, Depends
from app.db import get_conn

SECRET = os.environ.get("SECRET_KEY", "dev-secret-change-me")

def _sign(value: str) -> str:
    mac = hmac.new(SECRET.encode(), value.encode(), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(mac).decode().rstrip("=")

def create_signed_cookie(user_id: str, max_age: int = 60*60*24*7) -> str:
    ts = str(int(time.time()))
    payload = f"{user_id}.{ts}"
    sig = _sign(payload)
    return f"{payload}.{sig}"

def verify_signed_cookie(cookie: str) -> Optional[int]:
    try:
        user_id, ts, sig = cookie.split(".")
    except Exception:
        return None
    if _sign(f"{user_id}.{ts}") != sig:
        return None
    return int(user_id)

def get_current_user_id(session: Optional[str] = Cookie(default=None)) -> Optional[int]:
    if not session:
        return None
    return verify_signed_cookie(session)

def require_auth_user_id(session: Optional[str] = Cookie(default=None)) -> int:
    uid = get_current_user_id(session)
    if uid is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return uid

# User helpers
def get_user_id_by_email(email: str) -> Optional[int]:
    conn = get_conn(); cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE email=?", (email,))
    row = cur.fetchone()
    conn.close()
    return row["id"] if row else None

def get_or_create_user_by_email(email: str) -> int:
    uid = get_user_id_by_email(email)
    if uid: return uid
    conn = get_conn(); cur = conn.cursor()
    cur.execute("INSERT INTO users(email, is_verified) VALUES(?,1)", (email,))
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return new_id

# Ownership / editor checks
def is_owner(user_id: int, tree_id: int) -> bool:
    conn = get_conn(); cur = conn.cursor()
    cur.execute("SELECT 1 FROM trees WHERE id=? AND owner_id=?", (tree_id, user_id))
    ok = cur.fetchone() is not None
    conn.close()
    return ok

def is_editor(user_id: int, tree_id: int) -> bool:
    conn = get_conn(); cur = conn.cursor()
    cur.execute("SELECT 1 FROM tree_editors WHERE tree_id=? AND user_id=?", (tree_id, user_id))
    ok = cur.fetchone() is not None
    conn.close()
    return ok
