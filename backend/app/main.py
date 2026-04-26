from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.security import HTTPBearer

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

AI-powered hospital availability intelligence for patients and hospital staff.

### Key capabilities
- **Symptom triage** — describe symptoms in plain language (English or Hindi); Gemini extracts the required specialty and urgency level
- **Medical citations** — Tavily searches PubMed, WHO, Mayo Clinic and returns citable sources
- **Hospital recommendations** — ranked by travel time, specialty match, bed availability, and ventilator count
- **Real-time availability** — hospital staff update bed counts via the secure dashboard; changes broadcast instantly via WebSocket
- **Audit trail** — every availability change is logged with old/new values and the user who made it

### Authentication
Protected endpoints require a **Bearer JWT** token obtained from `POST /api/v1/auth/login`.

```
Authorization: Bearer <token>
```

### Roles
| Role | Permissions |
|---|---|
| `hospital_staff` | Update availability for their own hospital only |
| `admin` | Update availability for any hospital; read all logs |

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
            {"name": "health", "description": "Service liveness check"},
            {"name": "auth", "description": "Register, login, and inspect the current user"},
            {"name": "patient", "description": "Symptom triage and hospital recommendations — public, no auth required"},
            {"name": "hospitals", "description": "Hospital directory — public read access"},
            {"name": "doctors", "description": "Doctor CRUD and room assignments — requires JWT"},
            {"name": "admin", "description": "Availability updates, audit logs, metrics, vector reindex — requires JWT"},
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

