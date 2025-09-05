from __future__ import annotations
from typing import Optional, Dict, Any
from app.db import get_conn

def get_tree_by_id(tree_id: int) -> Optional[Dict[str, Any]]:
    conn = get_conn(); cur = conn.cursor()
    cur.execute("SELECT * FROM trees WHERE id=?", (tree_id,))
    row = cur.fetchone()
    conn.close()
    return row

def list_public_trees():
    conn = get_conn(); cur = conn.cursor()
    cur.execute("SELECT id, name, description, created_at FROM trees WHERE is_public=1 ORDER BY created_at DESC")
    rows = cur.fetchall()
    conn.close()
    return rows
