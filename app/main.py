"""FastAPI main app (import-safe, DB-init on startup, public trees, email code login)."""
from __future__ import annotations

import os
import secrets
import urllib.parse
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Request, Depends, HTTPException, status
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

# app/main.py
from fastapi import FastAPI
from typing import List, Dict, Any

app = FastAPI(title="GenesisGates")

@app.get("/_health")
def _health() -> Dict[str, bool]:
    return {"ok": True}

@app.get("/__routes")
def __routes() -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for r in app.router.routes:
        methods = sorted(list(getattr(r, "methods", []) or []))
        path = getattr(r, "path", None) or str(getattr(r, "path_regex", ""))
        out.append({"path": str(path), "methods": methods, "name": getattr(r, "name", "")})
    return out

@app.get("/")
def home():
    return {"message": "GenesisGates API is running"}


# Local modules you already have (from our previous steps)
from app.db import init_db, get_conn
from app.auth import (
    create_signed_cookie,
    get_current_user_id,
    require_auth_user_id,
    get_or_create_user_by_email,
    get_user_id_by_email,
    is_owner,
    is_editor,
)
from app.tree_manager import get_tree_by_id, list_public_trees
from app.utils import gen_code, send_email_code

app = FastAPI()

# Paths
BASE_DIR = Path(__file__).resolve().parents[1]
STATIC_DIR = str(BASE_DIR / "static")
TEMPLATES_DIR = str(BASE_DIR / "templates")

# Static & templates
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
templates = Jinja2Templates(directory=TEMPLATES_DIR)

# Stable secret from env if provided
SECRET_KEY = os.environ.get("SECRET_KEY") or secrets.token_hex(32)

# Run DB migrations at startup (not at import time)
@app.on_event("startup")
def _startup() -> None:
    init_db()

# --- ops helpers ---
@app.get("/_health")
def _health() -> dict:
    return {"ok": True}

@app.get("/__routes")
def _routes() -> dict:
    return {"routes": sorted({getattr(r, "path", str(r)) for r in app.router.routes})}

# --- pages ---
@app.get("/", response_class=HTMLResponse)
def home(request: Request, user_id: Optional[int] = Depends(get_current_user_id)) -> HTMLResponse:
    return templates.TemplateResponse("index.html", {"request": request, "user": user_id, "title": "Home"})

@app.get("/trees", response_class=HTMLResponse)
def public_trees(request: Request, user_id: Optional[int] = Depends(get_current_user_id)) -> HTMLResponse:
    trees = list_public_trees()
    return templates.TemplateResponse("dashboard.html", {"request": request, "user": user_id, "public_trees": trees, "title": "Public Trees"})

@app.get("/dashboard", response_class=HTMLResponse)
def dashboard(request: Request, user_id: int = Depends(require_auth_user_id)) -> HTMLResponse:
    conn = get_conn(); cur = conn.cursor()
    cur.execute("SELECT * FROM trees WHERE owner_id=? ORDER BY created_at DESC", (user_id,))
    my_trees = cur.fetchall()
    conn.close()
    return templates.TemplateResponse("dashboard.html", {"request": request, "user": user_id, "my_trees": my_trees, "title": "Dashboard"})

# --- tree viewing & management ---
@app.get("/tree/{tree_id}", response_class=HTMLResponse)
def view_tree(request: Request, tree_id: int, user_id: Optional[int] = Depends(get_current_user_id)) -> HTMLResponse:
    tree = get_tree_by_id(tree_id)
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")
    if not tree.get("is_public", 0):
        if user_id is None:
            return RedirectResponse("/login?next=" + urllib.parse.quote(f"/tree/{tree_id}"), status_code=status.HTTP_302_FOUND)
        if not (is_owner(user_id, tree_id) or is_editor(user_id, tree_id)):
            raise HTTPException(status_code=403, detail="Not permitted")
    return templates.TemplateResponse("tree.html", {"request": request, "user": user_id, "tree": tree, "title": tree["name"]})

@app.post("/tree/{tree_id}/toggle-public")
def toggle_public(tree_id: int, user_id: int = Depends(require_auth_user_id)) -> RedirectResponse:
    if not is_owner(user_id, tree_id):
        raise HTTPException(status_code=403, detail="Only the owner can change visibility")
    conn = get_conn(); cur = conn.cursor()
    cur.execute("UPDATE trees SET is_public = 1 - IFNULL(is_public, 0) WHERE id=?", (tree_id,))
    conn.commit(); conn.close()
    return RedirectResponse(f"/tree/{tree_id}", status_code=status.HTTP_302_FOUND)

@app.post("/create-tree")
async def create_tree(request: Request, user_id: int = Depends(require_auth_user_id)) -> RedirectResponse:
    data = urllib.parse.parse_qs((await request.body()).decode())
    name = (data.get("name", [""])[0]).strip()
    desc = (data.get("description", [""])[0]).strip()
    if not name:
        raise HTTPException(status_code=400, detail="Tree name is required")
    conn = get_conn(); cur = conn.cursor()
    cur.execute("INSERT INTO trees(name, description, owner_id, is_public) VALUES(?,?,?,?)", (name, desc, user_id, 0))
    conn.commit()
    # get new id (works on sqlite; postgres fallback below)
    tree_id = getattr(cur, "lastrowid", None)
    if tree_id is None:
        cur.execute("SELECT id FROM trees WHERE owner_id=? ORDER BY id DESC LIMIT 1", (user_id,))
        row = cur.fetchone()
        tree_id = row["id"]
    conn.close()
    return RedirectResponse(f"/tree/{tree_id}", status_code=status.HTTP_302_FOUND)

# --- passwordless auth ---
@app.get("/login", response_class=HTMLResponse)
def login_page(request: Request, next: str = "/dashboard", user_id: Optional[int] = Depends(get_current_user_id)) -> HTMLResponse | RedirectResponse:
    if user_id:
        return RedirectResponse(next, status_code=status.HTTP_302_FOUND)
    return templates.TemplateResponse("login.html", {"request": request, "next": next})

@app.post("/login", response_class=HTMLResponse)
async def request_code(request: Request) -> HTMLResponse:
    data = urllib.parse.parse_qs((await request.body()).decode())
    email = data.get("email", [""])[0].strip().lower()
    next_url = data.get("next", ["/dashboard"])[0]
    if not email:
        return templates.TemplateResponse("login.html", {"request": request, "error": "Please enter your email.", "next": next_url})
    get_or_create_user_by_email(email)
    code = gen_code(6)
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    conn = get_conn(); cur = conn.cursor()
    cur.execute("INSERT INTO login_codes(email, code, expires_at) VALUES(?,?,?)", (email, code, expires_at.isoformat()))
    conn.commit(); conn.close()
    try:
        send_email_code(email, code)
    except Exception as e:
        return templates.TemplateResponse("login.html", {"request": request, "error": f"Failed to send email: {e}", "next": next_url})
    return templates.TemplateResponse("verify.html", {"request": request, "email": email, "next": next_url})

@app.post("/verify-code")
async def verify_code(request: Request) -> RedirectResponse | HTMLResponse:
    data = urllib.parse.parse_qs((await request.body()).decode())
    email = data.get("email", [""])[0].strip().lower()
    code  = data.get("code", [""])[0].strip()
    next_url = data.get("next", ["/dashboard"])[0]
    conn = get_conn(); cur = conn.cursor()
    cur.execute("SELECT code, expires_at FROM login_codes WHERE email=? ORDER BY id DESC LIMIT 1", (email,))
    row = cur.fetchone(); conn.close()
    if not row:
        return templates.TemplateResponse("verify.html", {"request": request, "email": email, "error": "No code requested for this email.", "next": next_url})
    if row["code"] != code:
        return templates.TemplateResponse("verify.html", {"request": request, "email": email, "error": "Invalid code.", "next": next_url})
    try:
        expires = datetime.fromisoformat(row["expires_at"])
    except Exception:
        expires = datetime.utcnow() - timedelta(days=1)
    if expires < datetime.utcnow():
        return templates.TemplateResponse("verify.html", {"request": request, "email": email, "error": "Code expired. Please request a new one.", "next": next_url})
    uid = get_user_id_by_email(email)
    resp = RedirectResponse(next_url, status_code=status.HTTP_302_FOUND)
    resp.set_cookie("session", create_signed_cookie(str(uid)), httponly=True, max_age=60 * 60 * 24 * 7)
    return resp

@app.get("/logout")
def logout() -> RedirectResponse:
    resp = RedirectResponse("/", status_code=status.HTTP_302_FOUND)
    resp.delete_cookie("session")
    return resp
