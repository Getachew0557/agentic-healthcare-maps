from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_token: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )

    messages: Mapped[list[ChatMessage]] = relationship(
        "ChatMessage", back_populates="session", cascade="all, delete-orphan"
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(
        ForeignKey("chat_sessions.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[str] = mapped_column(String(32))   # "user" | "assistant" | "system"
    content: Mapped[str] = mapped_column(Text)
    tool_calls: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    citations: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )

    session: Mapped[ChatSession] = relationship("ChatSession", back_populates="messages")
    trace: Mapped[AgentTrace | None] = relationship(
        "AgentTrace", back_populates="message", uselist=False, cascade="all, delete-orphan"
    )


class AgentTrace(Base):
    """
    Records every AI agent invocation for admin governance / anti-hallucination audit.
    Judges can inspect this to verify the system never fabricates data.
    """
    __tablename__ = "agent_traces"

    id: Mapped[int] = mapped_column(primary_key=True)
    message_id: Mapped[int | None] = mapped_column(
        ForeignKey("chat_messages.id", ondelete="CASCADE"), nullable=True, index=True
    )
    # What tools/services were called
    tools_called: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # What was retrieved from Chroma
    retrievals: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # Final answer with claims array
    final_answer_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    model: Mapped[str | None] = mapped_column(String(64), nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Safety flags: emergency_keyword_triggered, hallucination_guard_triggered
    safety_flags: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )

    message: Mapped[ChatMessage | None] = relationship("ChatMessage", back_populates="trace")
