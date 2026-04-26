"""add doctors and doctor_room_assignments tables

Revision ID: 0002_doctors
Revises: 0001_init
Create Date: 2026-04-26
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0002_doctors"
down_revision = "0001_init"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "doctors",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "hospital_id",
            sa.Integer(),
            sa.ForeignKey("hospitals.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("specialty", sa.String(100), nullable=False),
        sa.Column("phone", sa.String(64), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_doctors_hospital_id", "doctors", ["hospital_id"])
    op.create_index("ix_doctors_name", "doctors", ["name"])
    op.create_index("ix_doctors_specialty", "doctors", ["specialty"])

    op.create_table(
        "doctor_room_assignments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "doctor_id",
            sa.Integer(),
            sa.ForeignKey("doctors.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "hospital_id",
            sa.Integer(),
            sa.ForeignKey("hospitals.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("room_code", sa.String(64), nullable=False),
        sa.Column("room_type", sa.String(64), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "valid_from",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("valid_to", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_dra_doctor_id", "doctor_room_assignments", ["doctor_id"])
    op.create_index("ix_dra_hospital_id", "doctor_room_assignments", ["hospital_id"])


def downgrade() -> None:
    op.drop_index("ix_dra_hospital_id", table_name="doctor_room_assignments")
    op.drop_index("ix_dra_doctor_id", table_name="doctor_room_assignments")
    op.drop_table("doctor_room_assignments")

    op.drop_index("ix_doctors_specialty", table_name="doctors")
    op.drop_index("ix_doctors_name", table_name="doctors")
    op.drop_index("ix_doctors_hospital_id", table_name="doctors")
    op.drop_table("doctors")
