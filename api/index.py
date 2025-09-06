"""Vercel entrypoint for FastAPI app with helpful fallbacks."""
import traceback
from fastapi import FastAPI

try:
    # Import your real FastAPI app
    from app.main import app as fastapi_app
    app = fastapi_app

    # Handy debug endpoints
    @app.get("/_health")
    def _health():
        return {"ok": True}

    @app.get("/__routes")
    def _routes():
        return {"routes": sorted({getattr(r, "path", str(r)) for r in app.router.routes})}

except Exception as exc:
    # If import fails, expose the error instead of a 500
    print("=== Failed to import app.main ===")
    traceback.print_exc()

    app = FastAPI()

    @app.get("/")
    def _fallback_root():
        return {"error": "Failed to import app.main", "see": "/__import_error"}

    @app.get("/__import_error")
    def _import_error():
        return {"error": "Failed to import app.main", "detail": str(exc)}
