from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user, require_roles
from app.models.delivery import Delivery
from app.models.project import Project
from app.models.user import User
from app.schemas.delivery import DeliveryCreate, DeliveryUpdate, DeliveryOut

router = APIRouter(prefix="/deliveries", tags=["deliveries"])


@router.get("", response_model=list[DeliveryOut])
def list_deliveries(
    project_id: int | None = None,
    status: str | None = Query(None),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Delivery)
    if project_id:
        query = query.filter(Delivery.project_id == project_id)
    if status:
        query = query.filter(Delivery.status == status)
    return (
        query.order_by(Delivery.due_date.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{delivery_id}", response_model=DeliveryOut)
def get_delivery(
    delivery_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    delivery = db.get(Delivery, delivery_id)
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    return delivery


@router.post("", response_model=DeliveryOut, status_code=201)
def create_delivery(
    payload: DeliveryCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin", "manager")),
):
    if not db.get(Project, payload.project_id):
        raise HTTPException(status_code=400, detail="Project not found")

    delivery = Delivery(**payload.model_dump())
    db.add(delivery)
    db.commit()
    db.refresh(delivery)
    return delivery


@router.patch("/{delivery_id}", response_model=DeliveryOut)
def update_delivery(
    delivery_id: int,
    payload: DeliveryUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin", "manager")),
):
    delivery = db.get(Delivery, delivery_id)
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")

    data = payload.model_dump(exclude_unset=True)

    if data.get("status") == "delivered" and delivery.delivered_at is None:
        delivery.delivered_at = datetime.now(timezone.utc)

    for field, value in data.items():
        setattr(delivery, field, value)

    db.commit()
    db.refresh(delivery)
    return delivery


@router.delete("/{delivery_id}", status_code=204)
def delete_delivery(
    delivery_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin")),
):
    delivery = db.get(Delivery, delivery_id)
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    db.delete(delivery)
    db.commit()