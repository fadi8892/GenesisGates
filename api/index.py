"""Vercel entrypoint for FastAPI app with helpful fallbacks."""
import os, sys, traceback
from fastapi import FastAPI

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
    # Print full traceback to Vercel logs and expose a detail endpoint
    print("=== Failed to import app.main ===", file=sys.stderr)
    traceback.print_exc()

    app = FastAPI()

    @app.get("/")
    def _fallback_root():
        return {"error": "Failed to import app.main", "see": "/__import_error"}

    @app.get("/__import_error")
    def _import_error():
        # Return rich diagnostics
        try:
            tb = traceback.format_exc()
        except Exception:
            tb = "no-traceback"
        return {
            "error": "Failed to import app.main",
            "exception": str(exc),
            "cwd": os.getcwd(),
            "files_in_cwd": sorted(os.listdir(".")),
            "python": sys.version,
            "sys_path": sys.path,
            "traceback": tb,
        }
