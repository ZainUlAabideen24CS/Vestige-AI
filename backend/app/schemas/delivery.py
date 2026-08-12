from datetime import date, datetime
from pydantic import BaseModel, ConfigDict


class DeliveryBase(BaseModel):
    project_id: int
    title: str
    description: str | None = None
    status: str = "pending"
    due_date: date | None = None


class DeliveryCreate(DeliveryBase):
    pass


class DeliveryUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    due_date: date | None = None


class DeliveryOut(DeliveryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    delivered_at: datetime | None
    created_at: datetime