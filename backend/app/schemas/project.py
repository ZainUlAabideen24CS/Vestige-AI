from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel, ConfigDict


class ProjectBase(BaseModel):
    name: str
    description: str | None = None
    status: str = "planning"
    tech_stack: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    budget: Decimal | None = None


class ProjectCreate(ProjectBase):
    client_id: int
    manager_id: int | None = None


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: str | None = None
    tech_stack: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    budget: Decimal | None = None
    manager_id: int | None = None


class ProjectOut(ProjectBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    client_id: int
    manager_id: int | None
    created_at: datetime