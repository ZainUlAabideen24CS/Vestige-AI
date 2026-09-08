from datetime import datetime
from sqlalchemy import Unicode, UnicodeText, Float, Integer, DateTime, Boolean, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class DialogueTurn(Base):
    __tablename__ = "dialogue_turns"

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id"), index=True)
    turn_order: Mapped[int] = mapped_column(Integer)

    speaker_label: Mapped[str] = mapped_column(Unicode(40))
    speaker_name: Mapped[str] = mapped_column(Unicode(150))
    speaker_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    name_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)

    text: Mapped[str] = mapped_column(UnicodeText)            # original language (may contain Urdu script)
    text_en: Mapped[str | None] = mapped_column(UnicodeText, nullable=True)

    start_time: Mapped[float] = mapped_column(Float)
    end_time: Mapped[float] = mapped_column(Float)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())