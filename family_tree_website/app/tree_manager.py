"""Family tree management utilities.

This module contains functions for creating and manipulating family
trees, people and relationships.  It abstracts the SQL queries used
to persist data in the underlying SQLite database.  Functions in
this module are used by the FastAPI routes defined in :mod:`app.main`.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

import sqlite3

from .db import get_db
from .auth import get_user


def get_user_trees(user_id: int) -> List[sqlite3.Row]:
    """Return a list of trees owned by the given user.

    Each returned row includes a `person_count` column that contains the
    number of people stored in that tree.  Trees are ordered by
    creation time.
    """
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT t.*, (
            SELECT COUNT(*) FROM persons WHERE tree_id = t.id
        ) AS person_count
        FROM trees AS t
        WHERE t.owner_id = ?
        ORDER BY t.created_at
        """,
        (user_id,),
    )
    rows = cur.fetchall()
    conn.close()
    return rows


def get_tree(tree_id: int) -> Optional[sqlite3.Row]:
    """Return a single tree row by its ID or ``None`` if missing."""
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM trees WHERE id = ?", (tree_id,))
    row = cur.fetchone()
    conn.close()
    return row


def create_tree(owner_id: int, name: str, description: str) -> int:
    """Create a new family tree and return its ID."""
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO trees (name, description, owner_id) VALUES (?, ?, ?)",
        (name, description, owner_id),
    )
    tree_id = cur.lastrowid
    conn.commit()
    conn.close()
    return tree_id


def user_can_edit_tree(user_id: int, tree_id: int) -> bool:
    """Return ``True`` if the given user may edit the specified tree."""
    conn = get_db()
    cur = conn.cursor()
    # Check if the user owns the tree
    cur.execute("SELECT owner_id FROM trees WHERE id = ?", (tree_id,))
    tree = cur.fetchone()
    if not tree:
        conn.close()
        return False
    if tree["owner_id"] == user_id:
        conn.close()
        return True
    # Otherwise check if the user is listed as an editor
    cur.execute(
        "SELECT can_edit FROM tree_editors WHERE tree_id = ? AND user_id = ?",
        (tree_id, user_id),
    )
    row = cur.fetchone()
    conn.close()
    return bool(row and row["can_edit"])


def list_tree_editors(tree_id: int) -> List[sqlite3.Row]:
    """Return a list of editors (including owner) for a tree.

    The returned rows include the editor record ID, the user ID, name,
    email and whether the editor has edit rights.  The owner is
    implicitly considered an editor with full rights.
    """
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT te.id AS editor_id,
               u.id  AS user_id,
               u.name AS name,
               u.email AS email,
               te.can_edit AS can_edit
        FROM tree_editors AS te
        JOIN users AS u ON te.user_id = u.id
        WHERE te.tree_id = ?
        """,
        (tree_id,),
    )
    rows = cur.fetchall()
    conn.close()
    return rows


def add_tree_editor(tree_id: int, user_email: str, can_edit: bool = True) -> None:
    """Add a user to the list of editors for a tree.

    This function looks up the user by email and inserts or replaces
    an entry in the `tree_editors` table.  Owners cannot be added
    explicitly because they already have edit rights.  If the user
    does not exist nothing is done.
    """
    conn = get_db()
    cur = conn.cursor()
    # Look up the user by email
    cur.execute("SELECT id FROM users WHERE email = ?", (user_email.lower(),))
    user = cur.fetchone()
    if not user:
        conn.close()
        return
    user_id = user["id"]
    # Check if they are the owner
    cur.execute("SELECT owner_id FROM trees WHERE id = ?", (tree_id,))
    tree = cur.fetchone()
    if not tree or tree["owner_id"] == user_id:
        conn.close()
        return
    # Insert or replace the editor entry
    cur.execute(
        "INSERT OR REPLACE INTO tree_editors (tree_id, user_id, can_edit) VALUES (?, ?, ?)",
        (tree_id, user_id, 1 if can_edit else 0),
    )
    conn.commit()
    conn.close()


def remove_tree_editor(tree_id: int, user_id: int) -> None:
    """Remove a user from the list of editors for a tree."""
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "DELETE FROM tree_editors WHERE tree_id = ? AND user_id = ?",
        (tree_id, user_id),
    )
    conn.commit()
    conn.close()


def add_person(
    tree_id: int,
    first_name: str,
    last_name: Optional[str],
    birth_date: Optional[str],
    death_date: Optional[str],
    gender: Optional[str],
    biography: Optional[str],
) -> int:
    """Add a person to a tree and return the person's ID."""
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO persons (tree_id, first_name, last_name, birth_date, death_date, gender, biography)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (tree_id, first_name, last_name, birth_date, death_date, gender, biography),
    )
    person_id = cur.lastrowid
    conn.commit()
    conn.close()
    return person_id


def add_relationship(
    tree_id: int,
    person_id: int,
    related_person_id: int,
    relation_type: str,
) -> int:
    """Add a relationship between two people and return its ID."""
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO relationships (tree_id, person_id, related_person_id, relation_type)
        VALUES (?, ?, ?, ?)
        """,
        (tree_id, person_id, related_person_id, relation_type),
    )
    rel_id = cur.lastrowid
    conn.commit()
    conn.close()
    return rel_id


def get_tree_persons(tree_id: int) -> List[sqlite3.Row]:
    """Return all persons for the specified tree ordered by last and first name."""
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "SELECT * FROM persons WHERE tree_id = ? ORDER BY last_name, first_name",
        (tree_id,),
    )
    rows = cur.fetchall()
    conn.close()
    return rows


def get_tree_relationships(tree_id: int) -> List[sqlite3.Row]:
    """Return all relationships for the specified tree."""
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "SELECT * FROM relationships WHERE tree_id = ?",
        (tree_id,),
    )
    rows = cur.fetchall()
    conn.close()
    return rows


def build_tree_structure(tree_id: int) -> Dict[str, Any]:
    """Construct a nested representation of the family tree.

    The returned dictionary has two keys:
    * ``roots`` – a list of root nodes (people without parents) each
      containing nested ``children``.
    * ``persons`` – a mapping from person ID to person dictionary for
      easy lookup.

    Currently only parent/child relationships are visualised.  Other
    relationship types are present in the `relationships` list and may
    be used in the future to display spouses or siblings.
    """
    # Build a mapping of person ID to person data
    persons = {p["id"]: dict(p) for p in get_tree_persons(tree_id)}
    # Map from person ID to a list of child IDs
    children: Dict[int, List[int]] = {pid: [] for pid in persons}
    parents_present: set[int] = set()
    relationships = get_tree_relationships(tree_id)
    for rel in relationships:
        if rel["relation_type"] == "parent":
            parent_id = rel["person_id"]
            child_id = rel["related_person_id"]
            children.setdefault(parent_id, []).append(child_id)
            parents_present.add(child_id)
    # Identify root persons (those who are not listed as a child)
    roots = [pid for pid in persons if pid not in parents_present]
    # Recursive helper to build nested children
    def build_subtree(pid: int) -> Dict[str, Any]:
        node = persons[pid].copy()
        node["children"] = [build_subtree(cid) for cid in children.get(pid, [])]
        return node
    tree = [build_subtree(pid) for pid in roots]
    return {"roots": tree, "persons": persons, "relationships": relationships}


def get_membership_features(plan: str) -> Dict[str, str]:
    """Return a dictionary of plan features for the given plan name."""
    if plan == "premium":
        return {
            "Trees": "Unlimited trees with unlimited persons",
            "Media": "Unlimited photo and document uploads",
            "Collaboration": "Invite unlimited editors and viewers",
            "Analytics": "Timeline and map views for your ancestors",
            "Support": "Priority email support",
        }
    # Default to free plan
    return {
        "Trees": "Up to 3 trees with up to 200 persons each",
        "Media": "Up to 50 uploads per tree",
        "Collaboration": "Share your tree with up to 5 editors",
        "Analytics": "Basic tree and relationship view",
        "Support": "Community forums",
    }
