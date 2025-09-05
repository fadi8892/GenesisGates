"""Vercel entrypoint.

This module imports the FastAPI application from :mod:`app.main` and
exposes it as an AWS Lambda compatible handler via the `Mangum` adapter.
Vercel's Python runtime will look for a global `handler` callable to
execute when your function is invoked.  When running locally you can
ignore this file; instead use `uvicorn app.main:app` to launch the
development server.
"""
from mangum import Mangum

try:
    # Import the FastAPI app from the application package
    from app.main import app
except Exception as exc:  # pragma: no cover - cannot be tested easily
    # If the import fails we raise a runtime error so Vercel will log it.
    raise RuntimeError("Failed to import FastAPI application: %s" % (exc,))

# The Mangum adapter converts the ASGI application into a handler that
# understands AWS Lambda's event and context.  Vercel's Python runtime
# is compatible with this interface.
handler = Mangum(app)
