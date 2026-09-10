"""add password reset fields to users

Revision ID: 96174b549c9c
Revises: d5847b549b25
Create Date: 2026-09-09 09:57:12.968748
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "96174b549c9c"
down_revision: Union[str, Sequence[str], None] = "d5847b549b25"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # Existing users will get False automatically
    op.add_column(
        "users",
        sa.Column(
            "must_reset_password",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )

    op.add_column(
        "users",
        sa.Column(
            "reset_token",
            sa.String(length=255),
            nullable=True,
        ),
    )

    op.add_column(
        "users",
        sa.Column(
            "reset_token_expires",
            sa.DateTime(),
            nullable=True,
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_column("users", "reset_token_expires")
    op.drop_column("users", "reset_token")
    op.drop_column("users", "must_reset_password")