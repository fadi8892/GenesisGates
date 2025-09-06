"""Vercel entrypoint for FastAPI app."""
import traceback
from fastapi import FastAPI

try:
    from app.main import app as fastapi_app
    app = fastapi_app
except Exception as exc:
    # Log the import error so Vercel logs show the root cause
    traceback.print_exc()
    # Provide a minimal app so the function still responds
    app = FastAPI()

    @app.get("/__import_error")
    def import_error():
        return {"error": "Failed to import app.main", "detail": str(exc)}
