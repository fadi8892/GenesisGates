"""FastAPI main app (ensures '/' exists and templates resolve)."""
from __future__ import annotations
import os, secrets
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.db import init_db

app = FastAPI()
init_db()

# Resolve paths relative to repo
BASE_DIR = Path(__file__).resolve().parents[1]
static_dir = str(BASE_DIR / "static")
templates_dir = str(BASE_DIR / "templates")

# Static & templates
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

SECRET_KEY = os.environ.get("SECRET_KEY") or secrets.token_hex(32)

# --------- Pages ---------
@app.get("/", response_class=HTMLResponse)
def home(request: Request, user_id: Optional[int] = Depends(get_current_user_id)):
    return templates.TemplateResponse("index.html", {"request": request, "user": user_id})

@app.get("/trees", response_class=HTMLResponse)
def public_trees(request: Request, user_id: Optional[int] = Depends(get_current_user_id)):
    trees = list_public_trees()
    return templates.TemplateResponse("dashboard.html", {
        "request": request, "user": user_id, "title": "Public Trees", "public_trees": trees
    })

@app.get("/dashboard", response_class=HTMLResponse)
def dashboard(request: Request, user_id: int = Depends(require_auth_user_id)):
    # Show user’s trees and a create form (reuse dashboard.html)
    conn = get_conn(); cur = conn.cursor()
    cur.execute("SELECT * FROM trees WHERE owner_id=? ORDER BY created_at DESC", (user_id,))
    my_trees = cur.fetchall()
    conn.close()
    return templates.TemplateResponse("dashboard.html", {
        "request": request, "user": user_id, "my_trees": my_trees, "title": "Dashboard"
    })

# --------- Tree viewing ---------
@app.get("/tree/{tree_id}", response_class=HTMLResponse)
def view_tree(request: Request, tree_id: int, user_id: Optional[int] = Depends(get_current_user_id)):
    tree = get_tree_by_id(tree_id)
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")
    if not tree.get("is_public", 0):
        if user_id is None:
            return RedirectResponse("/login?next=" + urllib.parse.quote(f"/tree/{tree_id}"), status_code=302)
        if not (is_owner(user_id, tree_id) or is_editor(user_id, tree_id)):
            raise HTTPException(status_code=403, detail="Not permitted")
    return templates.TemplateResponse("tree.html", {"request": request, "tree": tree, "user": user_id, "title": tree["name"]})

@app.post("/tree/{tree_id}/toggle-public")
def toggle_public(tree_id: int, user_id: int = Depends(require_auth_user_id)):
    if not is_owner(user_id, tree_id):
        raise HTTPException(status_code=403, detail="Only the owner can change visibility")
    conn = get_conn(); cur = conn.cursor()
    cur.execute("UPDATE trees SET is_public = 1 - IFNULL(is_public, 0) WHERE id=?", (tree_id,))
    conn.commit(); conn.close()
    return RedirectResponse(f"/tree/{tree_id}", status_code=302)

# Create tree (simple)
@app.post("/create-tree")
async def create_tree(request: Request, user_id: int = Depends(require_auth_user_id)):
    data = urllib.parse.parse_qs((await request.body()).decode())
    name = (data.get("name", [""])[0]).strip()
    desc = (data.get("description", [""])[0]).strip()
    if not name:
        raise HTTPException(status_code=400, detail="Tree name is required")
    conn = get_conn(); cur = conn.cursor()
    cur.execute("INSERT INTO trees(name, description, owner_id, is_public) VALUES(?,?,?,?)",
                (name, desc, user_id, 0))
    conn.commit()
    tree_id = cur.lastrowid
    conn.close()
    return RedirectResponse(f"/tree/{tree_id}", status_code=302)

# --------- Passwordless auth ---------
@app.get("/login", response_class=HTMLResponse)
def login_page(request: Request, next: str = "/dashboard", user_id: Optional[int] = Depends(get_current_user_id)):
    if user_id:
        return RedirectResponse(next, status_code=302)
    return templates.TemplateResponse("login.html", {"request": request, "next": next})

@app.post("/login", response_class=HTMLResponse)
async def request_code(request: Request):
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
async def verify_code(request: Request):
    data = urllib.parse.parse_qs((await request.body()).decode())
    email = data.get("email", [""])[0].strip().lower()
    code  = data.get("code", [""])[0].strip()
    next_url = data.get("next", ["/dashboard"])[0]

    conn = get_conn(); cur = conn.cursor()
    cur.execute("SELECT code, expires_at FROM login_codes WHERE email=? ORDER BY id DESC LIMIT 1", (email,))
    row = cur.fetchone()
    conn.close()

    if not row:
        return templates.TemplateResponse("verify.html", {"request": request, "email": email, "error": "No code requested for this email.", "next": next_url})

    if row["code"] != code:
        return templates.TemplateResponse("verify.html", {"request": request, "email": email, "error": "Invalid code.", "next": next_url})

    if datetime.fromisoformat(row["expires_at"]) < datetime.utcnow():
        return templates.TemplateResponse("verify.html", {"request": request, "email": email, "error": "Code expired. Request a new one.", "next": next_url})

    uid = get_user_id_by_email(email)
    resp = RedirectResponse(next_url, status_code=302)
    resp.set_cookie("session", create_signed_cookie(str(uid)), httponly=True, max_age=60*60*24*7)
    return resp

@app.get("/logout")
def logout():
    resp = RedirectResponse("/", status_code=302)
    resp.delete_cookie("session")
    return resp
<
@app.get("/_health")
def health():
    return {"ok": True}
