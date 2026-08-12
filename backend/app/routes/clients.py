from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user, require_roles
from app.models.client import Client
from app.models.user import User
from app.schemas.client import ClientCreate, ClientUpdate, ClientOut

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("", response_model=list[ClientOut])
def list_clients(
    q: str | None = Query(None, description="Search by company name"),
    status: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Client)
    if q:
        query = query.filter(Client.company_name.ilike(f"%{q}%"))
    if status:
        query = query.filter(Client.status == status)
    return query.order_by(Client.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{client_id}", response_model=ClientOut)
def get_client(client_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    client = db.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@router.post("", response_model=ClientOut, status_code=201)
def create_client(
    payload: ClientCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin", "manager")),
):
    data = payload.model_dump()
    if data.get("account_manager_id") is None and user.role == "manager":
        data["account_manager_id"] = user.id

    client = Client(**data)
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


@router.patch("/{client_id}", response_model=ClientOut)
def update_client(
    client_id: int,
    payload: ClientUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin", "manager")),
):
    client = db.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(client, field, value)

    db.commit()
    db.refresh(client)
    return client


@router.delete("/{client_id}", status_code=204)
def delete_client(
    client_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin")),
):
    client = db.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    db.delete(client)
    db.commit()