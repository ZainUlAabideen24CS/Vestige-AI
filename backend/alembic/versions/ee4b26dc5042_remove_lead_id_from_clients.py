"""remove lead_id from clients

Revision ID: ee4b26dc5042
Revises: d3059bf9c553
Create Date: 2026-09-17 01:53:18.697147

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ee4b26dc5042'
down_revision: Union[str, Sequence[str], None] = 'd3059bf9c553'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None



def upgrade() -> None:
    op.drop_constraint(
        "FK__clients__lead_id__4222D4EF",
        "clients",
        type_="foreignkey",
    )
    op.drop_column("clients", "lead_id")


def downgrade() -> None:
    op.add_column(
        "clients",
        sa.Column("lead_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "FK__clients__lead_id__4222D4EF",
        "clients",
        "leads",
        ["lead_id"],
        ["id"],
    )