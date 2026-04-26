from __future__ import annotations

import logging
import os
import re
import subprocess
import sys

from sqlalchemy import create_engine, text

from app.core.config import BACKEND_ROOT, settings

logger = logging.getLogger(__name__)

# Head includes `0006_hospital_external_id_and_website`
_ALEMBIC_HEAD = "c3d4e5f6a7b8"


def _sqlite_bootstrap_stamp_if_needed() -> None:
    """
    If `app.db` has tables (e.g. from an old run) but no `alembic_version` row, Alembic
    will try 0001 again and fail with 'already exists'. Stamp to head, then `upgrade` is a no-op.
    """
    u = settings.database_url
    if "sqlite" not in u.split("://", 1)[0].lower() or ":///" not in u:
        return
    try:
        eng = create_engine(u)
        with eng.connect() as c:
            tables = c.execute(
                text("SELECT name FROM sqlite_master WHERE type IN ('table','view')")
            ).fetchall()
        names = {r[0] for r in tables}
    except OSError as exc:
        logger.warning("Could not read SQLite to decide stamp: %s", exc)
        return

    if "hospitals" in names and "alembic_version" not in names and names:
        logger.warning(
            "Database has data tables but no alembic_version; stamping to %s. "
            "If login still fails, stop the server, delete backend/app.db, and restart.",
            _ALEMBIC_HEAD,
        )
        env = {**os.environ, "CHATMAP_DATABASE_URL": settings.database_url}
        subprocess.run(
            [sys.executable, "-m", "alembic", "stamp", _ALEMBIC_HEAD],
            cwd=str(BACKEND_ROOT),
            env=env,
            check=False,
        )


def run_alembic_upgrade() -> None:
    _sqlite_bootstrap_stamp_if_needed()
    env = {**os.environ, "CHATMAP_DATABASE_URL": settings.database_url}
    r = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=str(BACKEND_ROOT),
        env=env,
        capture_output=True,
        text=True,
    )
    out = f"{r.stdout or ''}{r.stderr or ''}"
    if r.returncode == 0:
        logger.info("Database migrations OK (alembic upgrade head).")
        return
    # Repair: stamp then retry once (handles missing alembic_version mid-chain)
    if re.search(r"already exists|Duplicate table", out, re.I):
        logger.warning("Alembic reported existing tables; stamping %s and retrying once.", _ALEMBIC_HEAD)
        subprocess.run(
            [sys.executable, "-m", "alembic", "stamp", _ALEMBIC_HEAD],
            cwd=str(BACKEND_ROOT),
            env=env,
            check=False,
        )
        r2 = subprocess.run(
            [sys.executable, "-m", "alembic", "upgrade", "head"],
            cwd=str(BACKEND_ROOT),
            env=env,
            capture_output=True,
            text=True,
        )
        if r2.returncode == 0:
            logger.info("Database migrations OK after stamp repair.")
            return
        out = f"{r2.stdout or ''}{r2.stderr or ''}"
    logger.error("alembic output:\n%s", out)
    raise RuntimeError(
        "Run manually from the `backend` folder: python -m alembic upgrade head\n"
        "If errors persist, stop the API, delete backend\\app.db, and start again."
    )
