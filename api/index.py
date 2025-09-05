"""Vercel entrypoint.

This module imports the FastAPI application from :mod:`app.main`.

Vercel's Python runtime will automatically detect the `app` variable as an ASGI application to handle requests.
"""

try:
    from app.main import app as fastapi_app
except Exception as exc:
    raise RuntimeError("Failed to import FastAPI application: %s" % (exc,))

app = fastapi_app
