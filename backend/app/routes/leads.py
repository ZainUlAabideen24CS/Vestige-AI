from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user, require_roles
from app.models.lead import Lead
from app.models.client import Client
from app.models.user import User
from app.schemas.lead import LeadCreate, LeadUpdate, LeadOut
from app.schemas.client import ClientOut

router = APIRouter(prefix="/leads", tags=["leads"])


@router.get("", response_model=list[LeadOut])
def list_leads(
    q: str | None = Query(None),
    status: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Lead)
    if q:
        query = query.filter(Lead.company_name.ilike(f"%{q}%"))
    if status:
        query = query.filter(Lead.status == status)
    return query.order_by(Lead.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{lead_id}", response_model=LeadOut)
def get_lead(lead_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.post("", response_model=LeadOut, status_code=201)
def create_lead(
    payload: LeadCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin", "manager")),
):
    if payload.owner_id is not None and not db.get(User, payload.owner_id):
        raise HTTPException(status_code=400, detail="Owner not found")

    lead = Lead(**payload.model_dump())
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


@router.patch("/{lead_id}", response_model=LeadOut)
def update_lead(
    lead_id: int,
    payload: LeadUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin", "manager")),
):
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    data = payload.model_dump(exclude_unset=True)
    if data.get("owner_id") is not None and not db.get(User, data["owner_id"]):
        raise HTTPException(status_code=400, detail="Owner not found")

    for field, value in data.items():
        setattr(lead, field, value)

    db.commit()
    db.refresh(lead)
    return lead


@router.post("/{lead_id}/convert", response_model=ClientOut, status_code=201)
def convert_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin", "manager")),
):
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if lead.status == "converted":
        raise HTTPException(status_code=400, detail="Lead already converted")

    client = Client(
        company_name=lead.company_name,
        contact_name=lead.contact_name,
        contact_email=lead.contact_email,
        contact_phone=lead.contact_phone,
        notes=lead.notes,
        lead_id=lead.id,
        account_manager_id=lead.owner_id,
    )
    lead.status = "converted"
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


@router.delete("/{lead_id}", status_code=204)
def delete_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin")),
):
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    db.delete(lead)
    db.commit()