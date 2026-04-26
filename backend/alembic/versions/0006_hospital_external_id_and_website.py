"""Add hospitals.external_id and hospitals.website

Revision ID: c3d4e5f6a7b8
Revises: a1b2c3d4e5f6
Create Date: 2026-04-26
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "c3d4e5f6a7b8"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("hospitals", sa.Column("external_id", sa.String(length=64), nullable=True))
    op.add_column("hospitals", sa.Column("website", sa.String(length=512), nullable=True))
    op.create_index("ix_hospitals_external_id", "hospitals", ["external_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_hospitals_external_id", table_name="hospitals")
    op.drop_column("hospitals", "website")
    op.drop_column("hospitals", "external_id")
