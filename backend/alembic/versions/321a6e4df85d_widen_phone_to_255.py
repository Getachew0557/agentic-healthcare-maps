"""widen phone to 255

Revision ID: 321a6e4df85d
Revises: 0003_chat_traces
Create Date: 2026-04-26
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "321a6e4df85d"
down_revision = "0003_chat_traces"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "hospitals",
        "phone",
        existing_type=sa.String(length=64),
        type_=sa.String(length=255),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "hospitals",
        "phone",
        existing_type=sa.String(length=255),
        type_=sa.String(length=64),
        existing_nullable=True,
    )
