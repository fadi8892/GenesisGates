"""Vercel entrypoint for FastAPI, with robust pathing + diagnostics."""
import os, sys, traceback
from pathlib import Path
from fastapi import FastAPI

# --- Ensure the repo root is on sys.path so 'app' can be imported ---
API_DIR = Path(__file__).resolve().parent
REPO_ROOT = API_DIR.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

# api/index.py
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.main import app  # FastAPI instance named 'app'

try:
    from app.main import app as fastapi_app
    app = fastapi_app

    @app.get("/_health")
    def _health():
        return {"ok": True}

    @app.get("/__routes")
    def _routes():
        return {"routes": sorted({getattr(r, "path", str(r)) for r in app.router.routes})}

except Exception as exc:
    print("=== Failed to import app.main ===", file=sys.stderr)
    traceback.print_exc()

    app = FastAPI()

    @app.get("/")
    def _fallback_root():
        return {"error": "Failed to import app.main", "see": "/__import_error"}

    @app.get("/__import_error")
    def _import_error():
        return {
            "error": "Failed to import app.main",
            "exception": str(exc),
            "cwd": os.getcwd(),
            "files_in_cwd": sorted(os.listdir(".")),
            "repo_root": str(REPO_ROOT),
            "has_app_pkg": os.path.isdir(str(REPO_ROOT / "app")),
            "has_init": os.path.isfile(str(REPO_ROOT / "app" / "__init__.py")),
            "sys_path": sys.path,
        }
