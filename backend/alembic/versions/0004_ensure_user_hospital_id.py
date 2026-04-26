"""Ensure users.hospital_id exists (repair legacy sqlite DBs)

Revision ID: 4b0c1d2e3f0a
Revises: 321a6e4df85d
Create Date: 2026-04-26
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "4b0c1d2e3f0a"
down_revision = "321a6e4df85d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    cols = {c["name"] for c in insp.get_columns("users")}
    if "hospital_id" in cols:
        return
    op.add_column("users", sa.Column("hospital_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_users_hospital_id",
        "users",
        "hospitals",
        ["hospital_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_users_hospital_id", "users", ["hospital_id"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    cols = {c["name"] for c in insp.get_columns("users")}
    if "hospital_id" not in cols:
        return
    op.drop_index("ix_users_hospital_id", table_name="users")
    op.drop_constraint("fk_users_hospital_id", "users", type_="foreignkey")
    op.drop_column("users", "hospital_id")
