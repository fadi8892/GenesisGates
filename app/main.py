"""FastAPI application definition and route handlers.

This module wires together the underlying database, authentication and
tree management helpers into a web interface powered by FastAPI.  It
defines all HTTP routes for registering users, verifying email
addresses, logging in, managing family trees, adding people and
relationships, managing tree editors and updating membership plans.
The HTML pages are rendered using Jinja2 templates located in the
``templates/`` directory, and the static assets (CSS) are served via
FastAPI's static file mount.
"""
from __future__ import annotations

import urllib.parse
from pathlib import Path
from typing import Callable, Optional

from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

import sqlite3  # needed for type hints of database rows

from .db import init_db
from .auth import (
    create_user,
    issue_otp,
    verify_otp,
    check_user_credentials,
    get_user,
)
from .tree_manager import (
    get_user_trees,
    create_tree,
    get_tree,
    user_can_edit_tree,
    build_tree_structure,
    add_person,
    add_relationship,
    list_tree_editors,
    add_tree_editor,
    remove_tree_editor,
    get_membership_features,
)
from .db import get_db  # needed for direct database queries in some handlers
from .utils import (
    render_template,
    create_signed_cookie,
    verify_signed_cookie,
)

# Initialise the database at import time.  If the database file
# already exists this will have no effect.
init_db()

app = FastAPI(title="Family Tree")

# Determine the project root and mount the static files directory
BASE_DIR = Path(__file__).resolve().parents[1]
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")


def get_current_user(request: Request) -> Optional[sqlite3.Row]:
    """Return the currently logged‑in user based on the session cookie.

    Session cookies are signed values containing the user's ID.  If the
    cookie is missing or invalid this function returns ``None``.
    """
    cookie = request.cookies.get("session")
    if not cookie:
        return None
    value = verify_signed_cookie(cookie)
    if value is None:
        return None
    try:
        user_id = int(value)
    except ValueError:
        return None
    return get_user(user_id)


def login_required(func: Callable) -> Callable:
    """Decorator that redirects to the login page when no user is logged in."""
    async def wrapper(request: Request, *args, **kwargs):
        user = get_current_user(request)
        if not user:
            return RedirectResponse("/login", status_code=status.HTTP_302_FOUND)
        return await func(request, *args, **kwargs, user=user)

    return wrapper


@app.get("/", response_class=HTMLResponse)
async def home(request: Request) -> HTMLResponse:
    """Render the landing page with marketing information."""
    user = get_current_user(request)
    return render_template(request, "index.html", {"user": user})


@app.get("/register", response_class=HTMLResponse)
async def register_get(request: Request) -> HTMLResponse:
    """Display the registration form."""
    user = get_current_user(request)
    if user:
        return RedirectResponse("/dashboard", status_code=status.HTTP_302_FOUND)
    return render_template(request, "register.html", {"user": None, "error": None})


@app.post("/register", response_class=HTMLResponse)
async def register_post(request: Request) -> HTMLResponse:
    """Handle registration form submission."""
    body_bytes = await request.body()
    form_data = urllib.parse.parse_qs(body_bytes.decode("utf-8"))
    email = form_data.get("email", [""])[0]
    name = form_data.get("name", [""])[0]
    password = form_data.get("password", [""])[0]
    confirm_password = form_data.get("confirm_password", [""])[0]
    if password != confirm_password:
        return render_template(
            request,
            "register.html",
            {"user": None, "error": "Passwords do not match"},
        )
    try:
        user_id = create_user(
            email=email.strip(), password=password.strip(), name=name.strip()
        )
    except ValueError as e:
        return render_template(
            request,
            "register.html",
            {"user": None, "error": str(e)},
        )
    # Issue an OTP and print it to the console.  In a real application
    # this would be emailed to the user.
    code = issue_otp(user_id)
    print(f"OTP for {email}: {code}")
    response = RedirectResponse("/verify-email", status_code=status.HTTP_302_FOUND)
    # Store the pending user ID in a signed cookie for 10 minutes
    response.set_cookie(
        key="pending",
        value=create_signed_cookie(str(user_id)),
        httponly=True,
        max_age=600,
        secure=False,
        samesite="lax",
    )
    return response


@app.get("/verify-email", response_class=HTMLResponse)
async def verify_email_get(request: Request) -> HTMLResponse:
    """Display the OTP verification page."""
    user = get_current_user(request)
    if user:
        return RedirectResponse("/dashboard", status_code=status.HTTP_302_FOUND)
    pending_cookie = request.cookies.get("pending")
    if not pending_cookie:
        return RedirectResponse("/register", status_code=status.HTTP_302_FOUND)
    pending_val = verify_signed_cookie(pending_cookie)
    if pending_val is None:
        return RedirectResponse("/register", status_code=status.HTTP_302_FOUND)
    return render_template(request, "verify.html", {"user": None, "error": None})


@app.post("/verify-email", response_class=HTMLResponse)
async def verify_email_post(request: Request) -> HTMLResponse:
    """Handle OTP verification."""
    body_bytes = await request.body()
    form_data = urllib.parse.parse_qs(body_bytes.decode("utf-8"))
    code = form_data.get("code", [""])[0]
    pending_cookie = request.cookies.get("pending")
    if not pending_cookie:
        return RedirectResponse("/register", status_code=status.HTTP_302_FOUND)
    pending_val = verify_signed_cookie(pending_cookie)
    if pending_val is None:
        return RedirectResponse("/register", status_code=status.HTTP_302_FOUND)
    user_id_int = int(pending_val)
    if verify_otp(user_id_int, code.strip()):
        response = RedirectResponse("/dashboard", status_code=status.HTTP_302_FOUND)
        # Persist login for one week
        response.set_cookie(
            key="session",
            value=create_signed_cookie(str(user_id_int)),
            httponly=True,
            max_age=60 * 60 * 24 * 7,
            secure=False,
            samesite="lax",
        )
        response.delete_cookie("pending")
        return response
    return render_template(
        request,
        "verify.html",
        {"user": None, "error": "Invalid or expired code"},
    )


@app.get("/login", response_class=HTMLResponse)
async def login_get(request: Request) -> HTMLResponse:
    """Display the login form."""
    user = get_current_user(request)
    if user:
        return RedirectResponse("/dashboard", status_code=status.HTTP_302_FOUND)
    return render_template(request, "login.html", {"user": None, "error": None})


@app.post("/login", response_class=HTMLResponse)
async def login_post(request: Request) -> HTMLResponse:
    """Handle login form submission."""
    body_bytes = await request.body()
    form_data = urllib.parse.parse_qs(body_bytes.decode("utf-8"))
    email = form_data.get("email", [""])[0]
    password = form_data.get("password", [""])[0]
    uid = check_user_credentials(email.strip(), password.strip())
    if uid is not None:
        response = RedirectResponse("/dashboard", status_code=status.HTTP_302_FOUND)
        # Persist session for one week
        response.set_cookie(
            key="session",
            value=create_signed_cookie(str(uid)),
            httponly=True,
            max_age=60 * 60 * 24 * 7,
            secure=False,
            samesite="lax",
        )
        return response
    return render_template(
        request,
        "login.html",
        {"user": None, "error": "Invalid credentials or email not verified"},
    )


@app.get("/logout")
async def logout(request: Request) -> Response:
    """Log the user out by clearing session cookies."""
    response = RedirectResponse("/", status_code=status.HTTP_302_FOUND)
    response.delete_cookie("session")
    response.delete_cookie("pending")
    return response


@app.get("/dashboard", response_class=HTMLResponse)
@login_required
async def dashboard(request: Request, user) -> HTMLResponse:  # type: ignore[override]
    """Display the user's dashboard with a list of their trees and plan features."""
    trees = get_user_trees(user["id"])
    features = get_membership_features(user["membership_plan"])
    return render_template(
        request,
        "dashboard.html",
        {
            "user": user,
            "trees": trees,
            "features": features,
            "error": None,
        },
    )


@app.post("/create-tree", response_class=HTMLResponse)
@login_required
async def create_tree_post(request: Request, user) -> HTMLResponse:  # type: ignore[override]
    """Handle creation of a new family tree."""
    body_bytes = await request.body()
    form_data = urllib.parse.parse_qs(body_bytes.decode("utf-8"))
    name = form_data.get("name", [""])[0]
    description = form_data.get("description", [""])[0]
    # Check plan limits for free users
    if user["membership_plan"] == "free":
        user_trees = get_user_trees(user["id"])
        if len(user_trees) >= 3:
            return render_template(
                request,
                "dashboard.html",
                {
                    "user": user,
                    "trees": user_trees,
                    "features": get_membership_features("free"),
                    "error": "Free plan allows up to 3 trees. Upgrade for more.",
                },
            )
    tree_id = create_tree(user["id"], name.strip(), description.strip())
    return RedirectResponse(f"/tree/{tree_id}", status_code=status.HTTP_302_FOUND)


@app.get("/tree/{tree_id}", response_class=HTMLResponse)
@login_required
async def view_tree(request: Request, tree_id: int, user) -> HTMLResponse:  # type: ignore[override]
    """Display a family tree along with its people and relationships."""
    tree = get_tree(tree_id)
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")
    # Check view rights: owner or invited editor
    if not user_can_edit_tree(user["id"], tree_id) and tree["owner_id"] != user["id"]:
        # View‑only rights: check if user is a viewer (non‑editor).  If the user
        # is not associated with the tree at all then deny access.
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            "SELECT 1 FROM tree_editors WHERE tree_id = ? AND user_id = ?",
            (tree_id, user["id"]),
        )
        invited = cur.fetchone()
        conn.close()
        if not invited:
            raise HTTPException(status_code=403, detail="Access denied")
    structure = build_tree_structure(tree_id)
    persons = structure["persons"]
    return render_template(
        request,
        "tree.html",
        {
            "user": user,
            "tree": tree,
            "structure": structure,
            "persons": persons,
            "can_edit": user_can_edit_tree(user["id"], tree_id),
        },
    )


@app.post("/tree/{tree_id}/add-person", response_class=HTMLResponse)
@login_required
async def add_person_post(request: Request, tree_id: int, user) -> HTMLResponse:  # type: ignore[override]
    """Add a new person to the tree."""
    if not user_can_edit_tree(user["id"], tree_id):
        raise HTTPException(status_code=403, detail="You do not have edit rights.")
    body_bytes = await request.body()
    form_data = urllib.parse.parse_qs(body_bytes.decode("utf-8"))
    first_name = form_data.get("first_name", [""])[0]
    last_name = form_data.get("last_name", [""])[0] or None
    birth_date = form_data.get("birth_date", [""])[0] or None
    death_date = form_data.get("death_date", [""])[0] or None
    gender = form_data.get("gender", [""])[0] or None
    biography = form_data.get("biography", [""])[0] or None
    add_person(
        tree_id,
        first_name.strip(),
        last_name.strip() if last_name else None,
        birth_date if birth_date else None,
        death_date if death_date else None,
        gender if gender else None,
        biography.strip() if biography else None,
    )
    return RedirectResponse(f"/tree/{tree_id}", status_code=status.HTTP_302_FOUND)


@app.post("/tree/{tree_id}/add-relationship", response_class=HTMLResponse)
@login_required
async def add_relationship_post(request: Request, tree_id: int, user) -> HTMLResponse:  # type: ignore[override]
    """Add a relationship between two people."""
    if not user_can_edit_tree(user["id"], tree_id):
        raise HTTPException(status_code=403, detail="You do not have edit rights.")
    body_bytes = await request.body()
    form_data = urllib.parse.parse_qs(body_bytes.decode("utf-8"))
    try:
        person_id = int(form_data.get("person_id", ["0"])[0])
        related_person_id = int(form_data.get("related_person_id", ["0"])[0])
    except ValueError:
        return RedirectResponse(f"/tree/{tree_id}", status_code=status.HTTP_302_FOUND)
    relation_type = form_data.get("relation_type", [""])[0]
    add_relationship(tree_id, person_id, related_person_id, relation_type)
    return RedirectResponse(f"/tree/{tree_id}", status_code=status.HTTP_302_FOUND)


@app.get("/tree/{tree_id}/editors", response_class=HTMLResponse)
@login_required
async def manage_editors(request: Request, tree_id: int, user) -> HTMLResponse:  # type: ignore[override]
    """View and manage editors for a tree."""
    tree = get_tree(tree_id)
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")
    if tree["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only the owner can manage editors")
    editors = list_tree_editors(tree_id)
    return render_template(
        request,
        "editors.html",
        {"user": user, "tree": tree, "editors": editors},
    )


@app.post("/tree/{tree_id}/add-editor", response_class=HTMLResponse)
@login_required
async def add_editor_post(request: Request, tree_id: int, user) -> HTMLResponse:  # type: ignore[override]
    """Add a new editor by email."""
    tree = get_tree(tree_id)
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")
    if tree["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only the owner can add editors")
    body_bytes = await request.body()
    form_data = urllib.parse.parse_qs(body_bytes.decode("utf-8"))
    email = form_data.get("email", [""])[0]
    add_tree_editor(tree_id, email.strip(), can_edit=True)
    return RedirectResponse(f"/tree/{tree_id}/editors", status_code=status.HTTP_302_FOUND)


@app.get("/tree/{tree_id}/remove-editor/{editor_id}", response_class=HTMLResponse)
@login_required
async def remove_editor(request: Request, tree_id: int, editor_id: int, user) -> HTMLResponse:  # type: ignore[override]
    """Remove an editor from the tree."""
    tree = get_tree(tree_id)
    if not tree or tree["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only the owner can remove editors")
    # Fetch the tree_editors row to obtain the associated user ID
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "SELECT user_id FROM tree_editors WHERE id = ? AND tree_id = ?",
        (editor_id, tree_id),
    )
    row = cur.fetchone()
    conn.close()
    if row:
        remove_tree_editor(tree_id, row["user_id"])
    return RedirectResponse(f"/tree/{tree_id}/editors", status_code=status.HTTP_302_FOUND)


@app.get("/subscribe", response_class=HTMLResponse)
@login_required
async def subscribe_get(request: Request, user) -> HTMLResponse:  # type: ignore[override]
    """Display available subscription plans."""
    return render_template(
        request,
        "subscribe.html",
        {"user": user, "current_plan": user["membership_plan"]},
    )


@app.post("/subscribe", response_class=HTMLResponse)
@login_required
async def subscribe_post(request: Request, user) -> HTMLResponse:  # type: ignore[override]
    """Handle subscription selection.  This is a mock – no payment processing occurs."""
    body_bytes = await request.body()
    form_data = urllib.parse.parse_qs(body_bytes.decode("utf-8"))
    plan = form_data.get("plan", [""])[0]
    if plan not in ("free", "premium"):
        raise HTTPException(status_code=400, detail="Invalid plan")
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "UPDATE users SET membership_plan = ? WHERE id = ?",
        (plan, user["id"]),
    )
    conn.commit()
    conn.close()
    return RedirectResponse("/dashboard", status_code=status.HTTP_302_FOUND)
