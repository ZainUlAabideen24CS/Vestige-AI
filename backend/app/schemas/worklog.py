from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict


class WorkLogBase(BaseModel):
    project_id: int
    log_date: date
    summary: str
    hours: Decimal | None = None
    technologies: str | None = None
    blockers: str | None = None


class WorkLogCreate(WorkLogBase):
    pass


class WorkLogUpdate(BaseModel):
    log_date: date | None = None
    summary: str | None = None
    hours: Decimal | None = None
    technologies: str | None = None
    blockers: str | None = None


class WorkLogOut(WorkLogBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    user_name: str | None = None
    project_name: str | None = None
    created_at: datetime