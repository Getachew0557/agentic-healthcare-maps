from __future__ import annotations

import asyncio
import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.security import HTTPBearer

from app.api.v1.router import api_router
from app.core.config import settings

logger = logging.getLogger(__name__)

# Ensure app.* log lines show in the Uvicorn terminal (root is often WARNING-only).
if not logging.getLogger().handlers:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s [%(name)s] %(message)s")
logging.getLogger("app").setLevel(logging.INFO)
logger.setLevel(logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("CHATMAP_DATABASE_URL (resolved): %s", settings.database_url)

    from app.db.migrate import run_alembic_upgrade

    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, run_alembic_upgrade)

    from app.services.realtime.ws_manager import redis_subscriber
    task = asyncio.create_task(redis_subscriber(settings.redis_url))
    logger.info("Redis availability subscriber started")

    # Build Chroma vector index in background (non-blocking)
    async def _build_index():
        try:
            import asyncio as _asyncio
            loop = _asyncio.get_event_loop()
            from app.services.vector.embeddings import index_all_hospitals
            count = await loop.run_in_executor(None, index_all_hospitals)
            logger.info("Chroma index built: %d hospitals", count)
        except Exception as exc:
            logger.warning("Chroma indexing failed (non-fatal): %s", exc)

    asyncio.create_task(_build_index())
    yield
    task.cancel()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Agentic Healthcare Maps API",
        version="1.0.0",
        description="""
## Agentic Healthcare Maps — Backend API

AI-powered hospital availability intelligence. **Total cost: $0.**

### Endpoints (39 total)
- **Patient** — symptom triage (Gemini + Tavily), ranked hospital recommendations with RAG re-ranking, doctor names + room numbers
- **Hospitals** — public directory with specialty/status/geo filters
- **Doctors** — CRUD + room assignment (anti-hallucination contract)
- **Admin — Hospital CRUD** — create, update, delete hospitals; hospital_staff self-service
- **Admin — Users** — list, update role, delete users
- **Admin — Governance** — audit logs, agent traces, chat sessions, metrics, vector reindex
- **Ingest** — upload CSV/JSON/Excel/PDF/Image with OCR (Tesseract)
- **Contact** — public contact form
- **Realtime** — WebSocket for live availability updates

### Authentication
```
Authorization: Bearer <token>
```
Obtain token from `POST /api/v1/auth/login`.

### Roles
| Role | Permissions |
|---|---|
| `hospital_staff` | Own hospital: update availability, manage doctors, update profile |
| `admin` | All hospitals: full CRUD, user management, governance |

### Anti-Hallucination Contract
Every response includes a `claims` array declaring the source of each field (`db`, `tool`, `fallback`, `unavailable`).
Doctor room numbers are only shown when they exist in the database — never invented.

### Decision-support disclaimer
This system provides decision-support only. It does not diagnose medical conditions.
        """,
        contact={
            "name": "Team Getachew0557",
            "url": "https://github.com/Getachew0557/agentic-healthcare-maps",
        },
        license_info={"name": "MIT"},
        lifespan=lifespan,
        openapi_tags=[
            {"name": "health", "description": "Service liveness check — DB + Redis status"},
            {"name": "auth", "description": "Register, login, get current user"},
            {"name": "contact", "description": "Public contact form — no auth required"},
            {"name": "patient", "description": "Symptom triage and hospital recommendations — public"},
            {"name": "hospitals", "description": "Hospital directory — public read access"},
            {"name": "doctors", "description": "Doctor CRUD and room assignments — requires JWT"},
            {"name": "admin", "description": "Hospital CRUD, user management, audit logs, metrics — requires JWT"},
            {"name": "ingest", "description": "File ingestion (CSV/JSON/Excel/PDF/Image) with OCR — admin only"},
            {"name": "realtime", "description": "WebSocket channel for live availability events"},
        ],
    )

    # Log before CORS so CORS is registered last and wraps the app + errors (500 then gets ACAO).
    @app.middleware("http")
    async def _log_api_requests(request, call_next):
        # Proves the browser/frontend is hitting the API. Includes CORS preflight (OPTIONS).
        if not request.url.path.startswith("/api/"):
            return await call_next(request)
        t0 = time.perf_counter()
        origin = request.headers.get("origin", "-")
        clen = request.headers.get("content-length", "-")
        q = request.url.query
        path_q = f"{request.url.path}?{q}" if q else request.url.path
        has_auth = "yes" if request.headers.get("authorization") else "no"
        logger.info(
            "→ %s %s | origin=%s | auth=%s | content-length=%s",
            request.method,
            path_q,
            origin,
            has_auth,
            clen,
        )
        try:
            response = await call_next(request)
        except Exception:
            logger.exception("✗ unhandled error for %s %s", request.method, path_q)
            raise
        ms = (time.perf_counter() - t0) * 1000.0
        logger.info(
            "← %s %s → %s (%.0fms)",
            request.method,
            path_q,
            response.status_code,
            ms,
        )
        return response

    # Last middleware = outermost: ensures Access-Control-* on all responses, including 500s.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allow_origins,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix="/api/v1")

    # Inject BearerAuth security scheme into OpenAPI spec
    def custom_openapi():
        if app.openapi_schema:
            return app.openapi_schema
        schema = get_openapi(
            title=app.title,
            version=app.version,
            description=app.description,
            contact=app.contact,
            license_info=app.license_info,
            tags=app.openapi_tags,
            routes=app.routes,
        )
        schema.setdefault("components", {})
        schema["components"]["securitySchemes"] = {
            "BearerAuth": {
                "type": "http",
                "scheme": "bearer",
                "bearerFormat": "JWT",
                "description": "Paste the JWT token from POST /api/v1/auth/login",
            }
        }
        app.openapi_schema = schema
        return schema

    app.openapi = custom_openapi  # type: ignore[method-assign]
    return app


app = create_app()

