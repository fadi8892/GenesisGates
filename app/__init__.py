"""Application package.

Importing this package initialises the SQLite database and exposes
common helpers for the rest of the project.  The FastAPI application
itself is defined in :mod:`app.main`.
"""
from .db import init_db  # noqa: F401

__all__ = ["init_db"]
