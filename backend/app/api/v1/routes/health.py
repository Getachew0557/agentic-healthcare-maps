from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter()


@router.get(
    "/health",
    summary="Health check",
    description="Returns `{status: ok}` when the API is running. Use this for load-balancer liveness probes.",
    responses={200: {"content": {"application/json": {"example": {"status": "ok"}}}}},
)
def health():
    return {"status": "ok"}
