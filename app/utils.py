"""Miscellaneous utilities for session management and templating.

This module defines helpers for working with signed cookies to
implement simple sessions, as well as setting up the Jinja2
environment for rendering HTML templates.  It is deliberately kept
free of any FastAPI specifics so that its functions can be reused
across different frameworks if needed.
"""
from __future__ import annotations

import hashlib
import secrets
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import Request
from fastapi.responses import HTMLResponse
from jinja2 import Environment, FileSystemLoader, select_autoescape

# The secret key used to sign session cookies.  In a production
# deployment you should set this from an environment variable so that
# it is stable across deployments.
SECRET_KEY = secrets.token_hex(32)

# Determine the project root so we can locate templates and static files
BASE_DIR = Path(__file__).resolve().parents[1]

# Configure Jinja2 to load templates from the templates/ directory and
# escape HTML by default.
templates = Environment(
    loader=FileSystemLoader(str(BASE_DIR / "templates")),
    autoescape=select_autoescape(["html", "xml"]),
)


def _sign(value: str) -> str:
    """Return a HMAC‑like signature for the given string value."""
    h = hashlib.sha256()
    h.update((SECRET_KEY + value).encode("utf-8"))
    return h.hexdigest()


def create_signed_cookie(value: str) -> str:
    """Return a cookie value of the form ``<value>|<signature>``."""
    return f"{value}|{_sign(value)}"


def verify_signed_cookie(cookie_value: str) -> Optional[str]:
    """Verify a signed cookie and return the original value if valid.

    If the signature does not match the stored value this function
    returns ``None``.  If the cookie is malformed it also returns
    ``None``.
    """
    try:
        value, sig = cookie_value.split("|", 1)
    except ValueError:
        return None
    if _sign(value) == sig:
        return value
    return None


def render_template(
    request: Request, template_name: str, context: Dict[str, Any]
) -> HTMLResponse:
    """Render a Jinja2 template and return an HTMLResponse.

    The provided context dictionary is passed directly into the
    template.  This helper wraps the rendered string in a FastAPI
    ``HTMLResponse`` so that your route handlers can return the result
    directly.
    """
    # Add the request itself to the context so templates can access
    # request.url and other properties if needed
    context = dict(context)
    context.setdefault("request", request)
    template = templates.get_template(template_name)
    content = template.render(**context)
    return HTMLResponse(content)
