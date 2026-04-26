from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class ChatSessionOut(BaseModel):
    id: int
    session_token: str
    created_at: datetime
    message_count: int = 0

    model_config = {"from_attributes": True}


class ChatMessageOut(BaseModel):
    id: int
    session_id: int
    role: str
    content: str
    tool_calls: dict | None = None
    citations: dict | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AgentTraceOut(BaseModel):
    id: int
    message_id: int | None
    tools_called: dict | None = None
    retrievals: dict | None = None
    final_answer_json: dict | None = None
    model: str | None = None
    latency_ms: int | None = None
    safety_flags: dict | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
