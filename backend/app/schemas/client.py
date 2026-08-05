from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict


class ClientBase(BaseModel):
    company_name: str
    contact_name: str | None = None
    contact_email: EmailStr | None = None
    contact_phone: str | None = None
    industry: str | None = None
    status: str = "active"
    notes: str | None = None


class ClientCreate(ClientBase):
    lead_id: int | None = None
    account_manager_id: int | None = None


class ClientUpdate(BaseModel):
    company_name: str | None = None
    contact_name: str | None = None
    contact_email: EmailStr | None = None
    contact_phone: str | None = None
    industry: str | None = None
    status: str | None = None
    notes: str | None = None
    account_manager_id: int | None = None


class ClientOut(ClientBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lead_id: int | None
    account_manager_id: int | None
    created_at: datetime