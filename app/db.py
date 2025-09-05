"""Database helpers."""
from __future__ import annotations
import sqlite3, os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]

# If running on Vercel, write SQLite to /tmp (the only writable dir).
# Else, use a file in the project dir for local dev.
def _default_db_path() -> Path:
    if os.environ.get("VERCEL") == "1" or os.environ.get("VERCEL_ENV"):
        return Path("/tmp/data.sqlite")
    return BASE_DIR / "data.sqlite"

DB_PATH = Path(os.environ.get("DB_PATH") or _default_db_path())

def dict_factory(cursor, row):
    return {col[0]: row[idx] for idx, col in enumerate(cursor.description)}

def get_conn() -> sqlite3.Connection:
    # Ensure parent dir exists (works for /tmp and local)
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = dict_factory
    return conn

def init_db():
    conn = get_conn()
    cur = conn.cursor()
    # (keep the rest of your CREATE TABLE statements exactly as you have them)
    # ...
    conn.commit()
    conn.close()

    # Users
    cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      is_verified INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )""")

    # Trees (add is_public)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS trees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      owner_id INTEGER NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      is_public INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
    )""")

    # Editors
    cur.execute("""
    CREATE TABLE IF NOT EXISTS tree_editors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tree_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      can_edit INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(tree_id, user_id),
      FOREIGN KEY(tree_id) REFERENCES trees(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )""")

    # Persons
    cur.execute("""
    CREATE TABLE IF NOT EXISTS persons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tree_id INTEGER NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT,
      birth_date TEXT,
      death_date TEXT,
      gender TEXT,
      FOREIGN KEY(tree_id) REFERENCES trees(id) ON DELETE CASCADE
    )""")

    # Relationships
    cur.execute("""
    CREATE TABLE IF NOT EXISTS relationships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tree_id INTEGER NOT NULL,
      person_id INTEGER NOT NULL,
      related_person_id INTEGER NOT NULL,
      relation_type TEXT NOT NULL,
      FOREIGN KEY(tree_id) REFERENCES trees(id) ON DELETE CASCADE,
      FOREIGN KEY(person_id) REFERENCES persons(id) ON DELETE CASCADE,
      FOREIGN KEY(related_person_id) REFERENCES persons(id) ON DELETE CASCADE
    )""")

    # One-time login codes
    cur.execute("""
    CREATE TABLE IF NOT EXISTS login_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )""")

    conn.commit()
    conn.close()
