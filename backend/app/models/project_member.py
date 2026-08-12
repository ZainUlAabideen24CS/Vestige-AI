from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class ProjectMember(Base):
    __tablename__ = "project_members"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    role_on_project: Mapped[str] = mapped_column(String(20), default="member")
    assigned_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    removed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)