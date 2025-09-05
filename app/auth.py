"""Authentication and user management utilities.

This module provides helper functions for creating users, verifying
credentials, generating and validating one‑time passcodes (OTPs) and
retrieving user information.  It relies on the low‑level database
functions in :mod:`app.db` and stores its data in the tables defined
there.
"""
from __future__ import annotations

import hashlib
import secrets
import string
from datetime import datetime, timedelta
from typing import Optional

import sqlite3

from .db import get_db


def hash_password(password: str, salt: Optional[str] = None) -> tuple[str, str]:
    """Hash a password using SHA256 with an optional salt.

    If no salt is provided a new 32‑character hexadecimal salt is
    generated.  Returns a tuple of the password hash and the salt.  The
    salt is always included with the stored hash to allow the caller
    to verify the password later.
    """
    if salt is None:
        # Generate a cryptographically secure random salt (32 hex chars)
        salt = secrets.token_hex(16)
    hasher = hashlib.sha256()
    # Combine the salt and password to prevent rainbow table attacks
    hasher.update((salt + password).encode("utf-8"))
    return hasher.hexdigest(), salt


def generate_otp() -> str:
    """Generate a random six‑digit numeric one‑time passcode."""
    return ''.join(secrets.choice(string.digits) for _ in range(6))


def create_user(email: str, password: str, name: str) -> int:
    """Create a new user account and return its numeric ID.

    A :class:`ValueError` is raised if the email address is already
    registered.  Passwords are hashed with a per‑user salt.  Email
    addresses are normalised to lower case before storing.
    """
    conn = get_db()
    cur = conn.cursor()
    # Reject duplicate email addresses
    cur.execute("SELECT id FROM users WHERE email = ?", (email.lower(),))
    if cur.fetchone():
        conn.close()
        raise ValueError("Email already registered")
    pwd_hash, salt = hash_password(password)
    cur.execute(
        "INSERT INTO users (email, password_hash, salt, name) VALUES (?, ?, ?, ?)",
        (email.lower(), pwd_hash, salt, name),
    )
    user_id = cur.lastrowid
    conn.commit()
    conn.close()
    return user_id


def check_user_credentials(email: str, password: str) -> Optional[int]:
    """Verify a user's credentials and return their ID if correct.

    This function checks whether the given email exists in the database
    and whether the provided password matches the stored hash.  It
    also ensures that the user's email has been verified.  On
    success the user ID is returned; otherwise ``None`` is returned.
    """
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, password_hash, salt, email_verified FROM users WHERE email = ?",
        (email.lower(),),
    )
    row = cur.fetchone()
    if row is None:
        conn.close()
        return None
    pwd_hash, _ = hash_password(password, row["salt"])
    if pwd_hash == row["password_hash"] and row["email_verified"]:
        uid = row["id"]
    else:
        uid = None
    conn.close()
    return uid


def issue_otp(user_id: int) -> str:
    """Generate and store a one‑time passcode for the given user.

    The OTP is valid for 10 minutes.  Any previously issued OTPs for
    this user are removed.  Returns the generated code.  The caller
    should send this code to the user's email address.
    """
    code = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    conn = get_db()
    cur = conn.cursor()
    # Remove any existing OTPs for this user
    cur.execute("DELETE FROM otps WHERE user_id = ?", (user_id,))
    cur.execute(
        "INSERT INTO otps (user_id, code, expires_at) VALUES (?, ?, ?)",
        (user_id, code, expires_at.isoformat()),
    )
    conn.commit()
    conn.close()
    return code


def verify_otp(user_id: int, code: str) -> bool:
    """Verify a one‑time passcode for a user.

    If the code matches the stored value and has not expired, the OTP
    entry is removed and the user's email is marked as verified.  This
    function returns ``True`` on success and ``False`` on failure.
    """
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, expires_at FROM otps WHERE user_id = ? AND code = ?",
        (user_id, code),
    )
    row = cur.fetchone()
    if row:
        # Check expiration time
        expires_at = datetime.fromisoformat(row["expires_at"])
        if datetime.utcnow() <= expires_at:
            # Delete the OTP once it has been used
            cur.execute("DELETE FROM otps WHERE id = ?", (row["id"],))
            # Mark the user's email as verified
            cur.execute(
                "UPDATE users SET email_verified = 1 WHERE id = ?",
                (user_id,),
            )
            conn.commit()
            conn.close()
            return True
    conn.close()
    return False


def get_user(user_id: int) -> Optional[sqlite3.Row]:
    """Return a user row for the given ID or ``None`` if not found."""
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = cur.fetchone()
    conn.close()
    return row
