"""Database helpers with Postgres (preferred) and SQLite fallback."""
from __future__ import annotations
import os, sqlite3
from pathlib import Path
from typing import Any, Dict, Iterable, Tuple, Optional

BASE_DIR = Path(__file__).resolve().parents[1]
DATABASE_URL = os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_URL") or os.environ.get("POSTGRES_PRISMA_URL")

def dictify(cursor, row):
    return {col[0]: row[idx] for idx, col in enumerate(cursor.description)}

# ------- Postgres path -------
_pg_conn = None
def _pg_get_conn():
    global _pg_conn
    if _pg_conn is None:
        import psycopg
        _pg_conn = psycopg.connect(DATABASE_URL, autocommit=True)
    return _pg_conn

# ------- SQLite path -------
def _default_sqlite_path() -> Path:
    if os.environ.get("VERCEL") == "1" or os.environ.get("VERCEL_ENV"):
        return Path("/tmp/data.sqlite")
    return BASE_DIR / "data.sqlite"

SQLITE_PATH = Path(os.environ.get("DB_PATH") or _default_sqlite_path())

def _sqlite_get_conn() -> sqlite3.Connection:
    SQLITE_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(SQLITE_PATH)
    conn.row_factory = dictify
    return conn

# Public API
def is_pg() -> bool:
    return bool(DATABASE_URL)

def get_conn():
    if is_pg():
        return _pg_get_conn()
    return _sqlite_get_conn()

def exec_sql(sql: str, args: Optional[Iterable[Any]] = None):
    conn = get_conn()
    if is_pg():
        cur = conn.cursor()
        cur.execute(sql, args or [])
        try:
            cols = [desc[0] for desc in cur.description] if cur.description else []
            rows = [dict(zip(cols, r)) for r in cur.fetchall()] if cols else []
        except Exception:
            rows = []
        cur.close()
        return rows
    else:
        cur = conn.cursor()
        cur.execute(sql, tuple(args or []))
        try:
            rows = cur.fetchall()
        except sqlite3.ProgrammingError:
            rows = []
        conn.commit()
        return rows

def init_db():
    # Create tables idempotently
    if is_pg():
        exec_sql("""
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          is_verified INTEGER NOT NULL DEFAULT 1,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )""")
        exec_sql("""
        CREATE TABLE IF NOT EXISTS trees (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          is_public INTEGER NOT NULL DEFAULT 0
        )""")
        exec_sql("""
        CREATE TABLE IF NOT EXISTS tree_editors (
          id SERIAL PRIMARY KEY,
          tree_id INTEGER NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          can_edit INTEGER NOT NULL DEFAULT 1,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          UNIQUE(tree_id, user_id)
        )""")
        exec_sql("""
        CREATE TABLE IF NOT EXISTS persons (
          id SERIAL PRIMARY KEY,
          tree_id INTEGER NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
          first_name TEXT NOT NULL,
          last_name TEXT,
          birth_date TEXT,
          death_date TEXT,
          gender TEXT
        )""")
        exec_sql("""
        CREATE TABLE IF NOT EXISTS relationships (
          id SERIAL PRIMARY KEY,
          tree_id INTEGER NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
          person_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
          related_person_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
          relation_type TEXT NOT NULL
        )""")
        exec_sql("""
        CREATE TABLE IF NOT EXISTS login_codes (
          id SERIAL PRIMARY KEY,
          email TEXT NOT NULL,
          code TEXT NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )""")
    else:
        conn = _sqlite_get_conn()
        cur = conn.cursor()
        cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          is_verified INTEGER NOT NULL DEFAULT 1,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )""")
        cur.execute("""
        CREATE TABLE IF NOT EXISTS trees (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          owner_id INTEGER NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          is_public INTEGER NOT NULL DEFAULT 0
        )""")
        cur.execute("""
        CREATE TABLE IF NOT EXISTS tree_editors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tree_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          can_edit INTEGER NOT NULL DEFAULT 1,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(tree_id, user_id)
        )""")
        cur.execute("""
        CREATE TABLE IF NOT EXISTS persons (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tree_id INTEGER NOT NULL,
          first_name TEXT NOT NULL,
          last_name TEXT,
          birth_date TEXT,
          death_date TEXT,
          gender TEXT
        )""")
        cur.execute("""
        CREATE TABLE IF NOT EXISTS relationships (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tree_id INTEGER NOT NULL,
          person_id INTEGER NOT NULL,
          related_person_id INTEGER NOT NULL,
          relation_type TEXT NOT NULL
        )""")
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
