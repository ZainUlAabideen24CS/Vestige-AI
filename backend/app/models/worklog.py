from datetime import datetime, date
from sqlalchemy import String, DateTime, Date, ForeignKey, Text, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column
from decimal import Decimal
from app.db.base import Base


class WorkLog(Base):
    __tablename__ = "work_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    log_date: Mapped[date] = mapped_column(Date)
    hours: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    summary: Mapped[str] = mapped_column(Text)
    technologies: Mapped[str | None] = mapped_column(String(500), nullable=True)
    blockers: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())