from __future__ import annotations

"""
Agent trace logger — records every AI invocation for admin governance.

Usage:
    from app.services.trace_logger import log_trace
    await log_trace(db, tools_called={...}, final_answer={...}, ...)
"""

import logging
import time
from typing import Any

logger = logging.getLogger(__name__)


def log_trace(
    *,
    tools_called: dict[str, Any],
    retrievals: dict[str, Any] | None = None,
    final_answer_json: dict[str, Any],
    model: str = "gemini-3-flash-preview",
    latency_ms: int = 0,
    safety_flags: dict[str, Any] | None = None,
    db=None,
) -> None:
    """
    Persist an agent trace to the agent_traces table.
    Non-fatal — if DB write fails, logs a warning and continues.
    """
    if db is None:
        return
    try:
        from app.models.chat import AgentTrace
        trace = AgentTrace(
            tools_called=tools_called,
            retrievals=retrievals or {},
            final_answer_json=final_answer_json,
            model=model,
            latency_ms=latency_ms,
            safety_flags=safety_flags or {},
        )
        db.add(trace)
        db.commit()
    except Exception as exc:
        logger.warning("Failed to log agent trace (non-fatal): %s", exc)
        try:
            db.rollback()
        except Exception:
            pass
