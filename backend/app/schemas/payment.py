from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict


class PaymentBase(BaseModel):
    project_id: int
    amount: Decimal
    currency: str = "PKR"
    status: str = "pending"
    due_date: date | None = None
    invoice_number: str | None = None


class PaymentCreate(PaymentBase):
    pass


class PaymentUpdate(BaseModel):
    amount: Decimal | None = None
    currency: str | None = None
    status: str | None = None
    due_date: date | None = None
    invoice_number: str | None = None


class PaymentOut(PaymentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    paid_at: datetime | None
    created_at: datetime