from __future__ import annotations

"""
WebSocket connection manager + Redis pub/sub broadcast.

Architecture:
  - Hospital staff PATCH /admin/hospitals/{id}/availability
      → writes DB
      → calls broadcast_availability_update()
          → publishes JSON to Redis channel "availability"
          → ws_manager fans out to all connected WebSocket clients

If Redis is unavailable, broadcast falls back to direct in-process fan-out
(works fine for single-worker dev; use Redis for multi-worker prod).
"""

import asyncio
import json
import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)

# Channel name used for Redis pub/sub
REDIS_CHANNEL = "availability"


class ConnectionManager:
    """Tracks active WebSocket connections and fans out messages."""

    def __init__(self) -> None:
        self._connections: list[WebSocket] = []

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._connections.append(ws)
        logger.info("WS client connected. total=%d", len(self._connections))

    def disconnect(self, ws: WebSocket) -> None:
        self._connections = [c for c in self._connections if c is not ws]
        logger.info("WS client disconnected. total=%d", len(self._connections))

    async def broadcast(self, payload: dict[str, Any]) -> None:
        """Send JSON payload to every connected client. Dead connections are pruned."""
        if not self._connections:
            return
        message = json.dumps(payload)
        dead: list[WebSocket] = []
        for ws in list(self._connections):
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


# Singleton used across the app
manager = ConnectionManager()


# ---------------------------------------------------------------------------
# Redis pub/sub subscriber (runs as a background task on startup)
# ---------------------------------------------------------------------------

async def redis_subscriber(redis_url: str) -> None:
    """
    Long-running coroutine: subscribes to REDIS_CHANNEL and fans out
    every message to all connected WebSocket clients.

    If Redis is unavailable, backs off exponentially (max 60s) and retries silently.
    The app works fine without Redis — direct in-process broadcast handles single-worker.
    """
    import redis.asyncio as aioredis  # type: ignore[import]

    backoff = 5
    _logged_unavailable = False

    while True:
        try:
            client = aioredis.from_url(
                redis_url,
                decode_responses=True,
                socket_connect_timeout=3,
                socket_timeout=3,
            )
            await client.ping()  # fast fail if Redis is down
            backoff = 5  # reset on successful connect
            _logged_unavailable = False

            pubsub = client.pubsub()
            await pubsub.subscribe(REDIS_CHANNEL)
            logger.info("Redis subscriber connected on channel '%s'", REDIS_CHANNEL)

            async for message in pubsub.listen():
                if message["type"] == "message":
                    try:
                        payload = json.loads(message["data"])
                        await manager.broadcast(payload)
                    except Exception as exc:
                        logger.warning("Failed to broadcast Redis message: %s", exc)

        except Exception as exc:
            if not _logged_unavailable:
                logger.info(
                    "Redis unavailable (%s). WebSocket broadcast will use in-process fan-out only. "
                    "Start Redis to enable multi-worker pub/sub.",
                    type(exc).__name__,
                )
                _logged_unavailable = True
            await asyncio.sleep(backoff)
            backoff = min(backoff * 2, 60)  # exponential backoff, max 60s


# ---------------------------------------------------------------------------
# Publish helper (called from admin route after DB update)
# ---------------------------------------------------------------------------

async def broadcast_availability_update(
    *,
    hospital_id: int,
    icu_available: int,
    general_available: int,
    ventilators_available: int,
    status: str,
    redis_url: str | None = None,
) -> None:
    """
    Publish an availability update event.
    - If Redis URL provided → publish to Redis channel (multi-worker safe).
    - Always also fan out directly via in-process manager (covers single-worker dev).
    """
    payload: dict[str, Any] = {
        "event": "availability_update",
        "hospital_id": hospital_id,
        "icu_available": icu_available,
        "general_available": general_available,
        "ventilators_available": ventilators_available,
        "status": status,
    }

    # Direct in-process broadcast (always)
    await manager.broadcast(payload)

    # Redis publish (best-effort)
    if redis_url:
        try:
            import redis.asyncio as aioredis  # type: ignore[import]

            client = aioredis.from_url(redis_url, decode_responses=True)
            await client.publish(REDIS_CHANNEL, json.dumps(payload))
            await client.aclose()
        except Exception as exc:
            logger.warning("Redis publish failed (non-fatal): %s", exc)
