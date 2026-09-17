"""remove meeting date and action items

Revision ID: d3059bf9c553
Revises: xxxx_unicode_fix
Create Date: 2026-09-17
"""

import sqlalchemy as sa
from alembic import op


revision = "d3059bf9c553"
down_revision = "96174b549c9c"
branch_labels = None
depends_on = None


def upgrade():
    op.drop_column("meetings", "meeting_date")
    op.drop_column("meetings", "action_items")


def downgrade():
    op.add_column(
        "meetings",
        sa.Column("meeting_date", sa.DateTime(), nullable=True)
    )
    op.add_column(
        "meetings",
        sa.Column("action_items", sa.Text(), nullable=True)
    )