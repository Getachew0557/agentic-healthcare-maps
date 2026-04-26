from __future__ import annotations

from app.services.realtime.ws_manager import manager
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()


@router.websocket("/ws/availability")
async def availability_ws(websocket: WebSocket) -> None:
    """
    WebSocket endpoint.  Clients connect here to receive live availability
    updates whenever hospital staff update bed counts via the dashboard.

    Event payload shape:
    {
        "event": "availability_update",
        "hospital_id": 12,
        "icu_available": 3,
        "general_available": 14,
        "ventilators_available": 2,
        "status": "busy"
    }
    """
    await manager.connect(websocket)
    try:
        # Keep connection alive; we only push from server → client
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
