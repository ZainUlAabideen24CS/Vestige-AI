from datetime import datetime
from sqlalchemy import Unicode, UnicodeText, DateTime, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class Meeting(Base):
    __tablename__ = "meetings"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(Unicode(300))
    
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id"), nullable=True)
    client_id: Mapped[int | None] = mapped_column(ForeignKey("clients.id"), nullable=True)
    audio_path: Mapped[str | None] = mapped_column(Unicode(500), nullable=True)
    transcript: Mapped[str | None] = mapped_column(UnicodeText, nullable=True)
    summary: Mapped[str | None] = mapped_column(UnicodeText, nullable=True)
    
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    participants: Mapped[str | None] = mapped_column(Unicode(500), nullable=True)
    uploaded_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)  # ADD THIS