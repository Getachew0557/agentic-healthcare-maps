from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

from app.api.v1.router import api_router
from app.core.config import settings

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
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
            {
                "name": "patient",
                "description": "Symptom triage and hospital recommendations — public",
            },
            {"name": "hospitals", "description": "Hospital directory — public read access"},
            {"name": "doctors", "description": "Doctor CRUD and room assignments — requires JWT"},
            {
                "name": "admin",
                "description": "Hospital CRUD, user management, audit logs, metrics — requires JWT",
            },
            {
                "name": "ingest",
                "description": "File ingestion (CSV/JSON/Excel/PDF/Image) with OCR — admin only",
            },
            {"name": "realtime", "description": "WebSocket channel for live availability events"},
        ],
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allow_origins,
        allow_credentials=True,
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
