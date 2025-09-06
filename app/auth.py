# app/auth.py
import base64
import hashlib
import hmac
import os
import time
from typing import Optional, List

# Canonical secret; compatible alias to avoid old references breaking.
SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-me")
SECRET = SECRET_KEY  # backward-compat

# Cookie/settings
SESSION_COOKIE = "gg_session"
SESSION_TTL_SECONDS = 60 * 60 * 24 * 14  # 14 days

def _b64u(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")

def _b64u_to_bytes(s: str) -> bytes:
    pad = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + pad)

def _sign(value: str) -> str:
    """Return base64url(HMAC_SHA256(secret, value))."""
    mac = hmac.new(SECRET_KEY.encode(), value.encode(), hashlib.sha256).digest()
    return _b64u(mac)

def _verify(value: str, signature: str) -> bool:
    try:
        expected = _b64u(hmac.new(SECRET_KEY.encode(), value.encode(), hashlib.sha256).digest())
        # constant-time compare
        return hmac.compare_digest(expected, signature)
    except Exception:
        return False

def make_session_token(user_id: int, expires_at: Optional[int] = None) -> str:
    """Create a signed session token 'uid.expires.sig'."""
    if expires_at is None:
        expires_at = int(time.time()) + SESSION_TTL_SECONDS
    payload = f"{user_id}.{expires_at}"
    sig = _sign(payload)
    return f"{payload}.{sig}"

def parse_session_token(token: str) -> Optional[int]:
    """Return user_id if token is valid and not expired, else None."""
    try:
        uid_str, exp_str, sig = token.split(".")
        payload = f"{uid_str}.{exp_str}"
        if not _verify(payload, sig):
            return None
        if int(exp_str) < int(time.time()):
            return None
        return int(uid_str)
    except Exception:
        return None

def set_session_cookie(response, user_id: int) -> None:
    token = make_session_token(user_id)
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=SESSION_TTL_SECONDS,
        path="/",
    )

def clear_session_cookie(response) -> None:
    response.delete_cookie(SESSION_COOKIE, path="/")

def get_user_id_from_request(request) -> Optional[int]:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        return None
    return parse_session_token(token)

# Convenience guards used by templates/views
def is_owner(user_id: Optional[int], tree_owner_id: int) -> bool:
    return user_id is not None and int(user_id) == int(tree_owner_id)

def is_editor(user_id: Optional[int], editors: List[int]) -> bool:
    try:
        return user_id is not None and int(user_id) in [int(e) for e in editors]
    except Exception:
        return False
