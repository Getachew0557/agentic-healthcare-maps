"""add chat_sessions, chat_messages, agent_traces tables

Revision ID: 0003_chat_traces
Revises: 0002_doctors
Create Date: 2026-04-26
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = "0003_chat_traces"
down_revision = "0002_doctors"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "chat_sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("session_token", sa.String(128), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_chat_sessions_token", "chat_sessions", ["session_token"], unique=True)

    op.create_table(
        "chat_messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(32), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("tool_calls", JSONB(), nullable=True),
        sa.Column("citations", JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_chat_messages_session_id", "chat_messages", ["session_id"])

    op.create_table(
        "agent_traces",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("message_id", sa.Integer(), sa.ForeignKey("chat_messages.id", ondelete="CASCADE"), nullable=True),
        sa.Column("tools_called", JSONB(), nullable=True),
        sa.Column("retrievals", JSONB(), nullable=True),
        sa.Column("final_answer_json", JSONB(), nullable=True),
        sa.Column("model", sa.String(64), nullable=True),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("safety_flags", JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_agent_traces_message_id", "agent_traces", ["message_id"])


def downgrade() -> None:
    op.drop_index("ix_agent_traces_message_id", table_name="agent_traces")
    op.drop_table("agent_traces")
    op.drop_index("ix_chat_messages_session_id", table_name="chat_messages")
    op.drop_table("chat_messages")
    op.drop_index("ix_chat_sessions_token", table_name="chat_sessions")
    op.drop_table("chat_sessions")
