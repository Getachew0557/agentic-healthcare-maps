from __future__ import annotations

from app.db.session import get_db
from fastapi import APIRouter
from sqlalchemy import text

router = APIRouter()


@router.get(
    "/health",
    summary="Health check",
    description="""
Returns the health status of the API and its dependencies.

- `status`: `ok` if all checks pass, `degraded` if some dependencies are unavailable
- `database`: `ok` | `error` — PostgreSQL connectivity check
- `redis`: `ok` | `unavailable` — Redis ping (non-fatal; app works without Redis)

Use this endpoint for load-balancer liveness and readiness probes.
    """,
    responses={
        200: {
            "content": {
                "application/json": {
                    "examples": {
                        "all_ok": {
                            "summary": "All systems healthy",
                            "value": {"status": "ok", "database": "ok", "redis": "ok"},
                        },
                        "redis_down": {
                            "summary": "Redis unavailable (non-fatal)",
                            "value": {
                                "status": "degraded",
                                "database": "ok",
                                "redis": "unavailable",
                            },
                        },
                        "db_down": {
                            "summary": "Database error",
                            "value": {"status": "degraded", "database": "error", "redis": "ok"},
                        },
                    }
                }
            }
        }
    },
)
def health():
    result: dict[str, str] = {}

    # --- PostgreSQL check ---
    try:
        db_gen = get_db()
        db = next(db_gen)
        db.execute(text("SELECT 1"))
        result["database"] = "ok"
        try:
            next(db_gen)
        except StopIteration:
            pass
    except Exception:
        result["database"] = "error"

    # --- Redis check (non-fatal) ---
    try:
        import redis as redis_lib
        from app.core.config import settings

        r = redis_lib.from_url(settings.redis_url, socket_connect_timeout=2)
        r.ping()
        result["redis"] = "ok"
    except Exception:
        result["redis"] = "unavailable"

    result["status"] = "ok" if result["database"] == "ok" else "degraded"
    return result
