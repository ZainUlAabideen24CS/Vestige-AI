from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict


class LeadBase(BaseModel):
    company_name: str
    contact_name: str | None = None
    contact_email: EmailStr | None = None
    contact_phone: str | None = None
    source: str | None = None
    status: str = "new"
    notes: str | None = None


class LeadCreate(LeadBase):
    owner_id: int | None = None


class LeadUpdate(BaseModel):
    company_name: str | None = None
    contact_name: str | None = None
    contact_email: EmailStr | None = None
    contact_phone: str | None = None
    source: str | None = None
    status: str | None = None
    notes: str | None = None
    owner_id: int | None = None


class LeadOut(LeadBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int | None
    created_at: datetime