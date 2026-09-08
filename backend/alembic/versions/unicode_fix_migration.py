"""convert text columns to unicode (nvarchar) for urdu/unicode support

Revision ID: xxxx_unicode_fix
Revises: 6dbcd456acb5
Create Date: auto
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "xxxx_unicode_fix"
down_revision = "6dbcd456acb5"
branch_labels = None
depends_on = None


def upgrade():
    # dialogue_turns
    op.alter_column("dialogue_turns", "speaker_label", type_=sa.Unicode(40))
    op.alter_column("dialogue_turns", "speaker_name", type_=sa.Unicode(150))
    op.alter_column("dialogue_turns", "text", type_=sa.UnicodeText())
    op.alter_column("dialogue_turns", "text_en", type_=sa.UnicodeText())

    # meetings
    op.alter_column("meetings", "title", type_=sa.Unicode(300))
    op.alter_column("meetings", "audio_path", type_=sa.Unicode(500))
    op.alter_column("meetings", "transcript", type_=sa.UnicodeText())
    op.alter_column("meetings", "summary", type_=sa.UnicodeText())
    op.alter_column("meetings", "action_items", type_=sa.UnicodeText())
    op.alter_column("meetings", "participants", type_=sa.Unicode(500))


def downgrade():
    op.alter_column("dialogue_turns", "speaker_label", type_=sa.String(40))
    op.alter_column("dialogue_turns", "speaker_name", type_=sa.String(150))
    op.alter_column("dialogue_turns", "text", type_=sa.Text())
    op.alter_column("dialogue_turns", "text_en", type_=sa.Text())

    op.alter_column("meetings", "title", type_=sa.String(300))
    op.alter_column("meetings", "audio_path", type_=sa.String(500))
    op.alter_column("meetings", "transcript", type_=sa.Text())
    op.alter_column("meetings", "summary", type_=sa.Text())
    op.alter_column("meetings", "action_items", type_=sa.Text())
    op.alter_column("meetings", "participants", type_=sa.String(500))