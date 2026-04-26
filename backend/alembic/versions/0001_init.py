"""init tables

Revision ID: 0001_init
Revises:
Create Date: 2026-04-25
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0001_init"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "hospitals",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("address", sa.Text(), nullable=False, server_default=""),
        sa.Column("phone", sa.String(length=64), nullable=True),
        sa.Column("lat", sa.Float(), nullable=False),
        sa.Column("lng", sa.Float(), nullable=False),
        sa.Column("is_24x7", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="normal"),
        sa.Column("icu_total", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("icu_available", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("general_total", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("general_available", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("ventilators_available", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index("ix_hospitals_name", "hospitals", ["name"])

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False, server_default="hospital_staff"),
        sa.Column(
            "hospital_id",
            sa.Integer(),
            sa.ForeignKey("hospitals.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_hospital_id", "users", ["hospital_id"])

    op.create_table(
        "hospital_specialties",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "hospital_id",
            sa.Integer(),
            sa.ForeignKey("hospitals.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.UniqueConstraint("hospital_id", "name", name="uq_hospital_specialty"),
    )
    op.create_index("ix_hospital_specialties_hospital_id", "hospital_specialties", ["hospital_id"])
    op.create_index("ix_hospital_specialties_name", "hospital_specialties", ["name"])

    op.create_table(
        "availability_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "hospital_id",
            sa.Integer(),
            sa.ForeignKey("hospitals.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "updated_by_user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("field_name", sa.String(length=64), nullable=False),
        sa.Column("old_value", sa.String(length=64), nullable=False),
        sa.Column("new_value", sa.String(length=64), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )
    op.create_index("ix_availability_logs_hospital_id", "availability_logs", ["hospital_id"])
    op.create_index(
        "ix_availability_logs_updated_by_user_id", "availability_logs", ["updated_by_user_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_availability_logs_updated_by_user_id", table_name="availability_logs")
    op.drop_index("ix_availability_logs_hospital_id", table_name="availability_logs")
    op.drop_table("availability_logs")

    op.drop_index("ix_hospital_specialties_name", table_name="hospital_specialties")
    op.drop_index("ix_hospital_specialties_hospital_id", table_name="hospital_specialties")
    op.drop_table("hospital_specialties")

    op.drop_index("ix_users_hospital_id", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")

    op.drop_index("ix_hospitals_name", table_name="hospitals")
    op.drop_table("hospitals")
