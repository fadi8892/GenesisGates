"""Database helpers.

This module encapsulates all low‑level operations related to the
SQLite database: opening connections, initialising the schema and
providing a row factory that yields dictionary‑like rows.  Higher
level business logic is separated into the :mod:`auth` and
:mod:`tree_manager` modules.
"""
from __future__ import annotations

import sqlite3
from pathlib import Path

import os
# Compute the path to the project root (one level above this file's directory).
BASE_DIR = Path(__file__).resolve().parents[1]
# Use /tmp directory for the database by default
DEFAULT_DB_FILENAME = "database.db"
DATABASE_PATH = Path(os.environ.get("DATABASE_DIR", "/tmp")) / DEFAULT_DB_FILENAME
# The database file will live in the project root as `database.db`.
# DATABASE_PATH = BASE_DIR / "database.db"


def get_db() -> sqlite3.Connection:
    """Return a SQLite connection with a dictionary row factory.

    Each call to this function opens a new connection.  Callers
    should close the returned connection when finished.  The row
    factory is configured so that rows behave like dictionaries,
    making it easier to work with the query results.
    """
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Initialise the database if it does not already exist.

    This function creates all of the tables needed by the application.
    It is idempotent: calling it multiple times will not harm
    existing data or re‑create tables unnecessarily.  The schema
    matches the description provided in the specification.
    """
    # If the database file already exists, we assume the schema is present.
 #   if DATABASE_PATH.exists():
 #    #   return
    conn = get_db()
    cur = conn.cursor()
    # Users table: stores accounts and verification status
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            salt TEXT NOT NULL,
            name TEXT NOT NULL,
            email_verified INTEGER NOT NULL DEFAULT 0,
            membership_plan TEXT NOT NULL DEFAULT 'free',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    # OTP table: stores verification codes
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS otps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            code TEXT NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """
    )
    # Trees table
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS trees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            owner_id INTEGER NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """
    )
    # Tree editors table
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS tree_editors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tree_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            can_edit INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(tree_id, user_id),
            FOREIGN KEY(tree_id) REFERENCES trees(id) ON DELETE CASCADE,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """
    )
    # Persons table
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS persons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tree_id INTEGER NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT,
            birth_date TEXT,
            death_date TEXT,
            gender TEXT,
            biography TEXT,
            FOREIGN KEY(tree_id) REFERENCES trees(id) ON DELETE CASCADE
        )
        """
    )
    # Relationships table
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS relationships (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tree_id INTEGER NOT NULL,
            person_id INTEGER NOT NULL,
            related_person_id INTEGER NOT NULL,
            relation_type TEXT NOT NULL,
            FOREIGN KEY(tree_id) REFERENCES trees(id) ON DELETE CASCADE,
            FOREIGN KEY(person_id) REFERENCES persons(id) ON DELETE CASCADE,
            FOREIGN KEY(related_person_id) REFERENCES persons(id) ON DELETE CASCADE
        )
        """
    )
    conn.commit()
    conn.close()
