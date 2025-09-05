"""""Vercel entrypoint.

This module imports the FastAPI application from :mod:`app.main`.

Vercel's Python runtime will automatically detect the `app` variable as an ASGI application to handle requests.
"""

try:
    # Import the FastAPI app from the application package
    from app.main import app as fastapi_app
except Exception as exc:
    # If the import fails, raise a runtime error so Vercel will log it
    raise RuntimeError("Failed to import FastAPI application: %s" % (exc,))

# Expose the FastAPI application as `app` for Vercel's ASGI handler
app = fastapi_app
