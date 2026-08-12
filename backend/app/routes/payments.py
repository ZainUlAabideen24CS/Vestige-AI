from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.deps import get_db, require_roles
from app.models.payment import Payment
from app.models.project import Project
from app.models.user import User
from app.schemas.payment import PaymentCreate, PaymentUpdate, PaymentOut

router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("", response_model=list[PaymentOut])
def list_payments(
    project_id: int | None = None,
    status: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin", "manager")),
):
    query = db.query(Payment)
    if project_id:
        query = query.filter(Payment.project_id == project_id)
    if status:
        query = query.filter(Payment.status == status)
    return query.order_by(Payment.due_date.asc()).offset(skip).limit(limit).all()


@router.get("/summary")
def payment_summary(
    project_id: int | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin", "manager")),
):
    query = db.query(Payment.status, func.sum(Payment.amount), func.count(Payment.id))
    if project_id:
        query = query.filter(Payment.project_id == project_id)
    rows = query.group_by(Payment.status).all()

    return {
        "by_status": [
            {"status": s, "total": float(total or 0), "count": count}
            for s, total, count in rows
        ],
        "total": float(sum((r[1] or 0) for r in rows)),
    }


@router.get("/{payment_id}", response_model=PaymentOut)
def get_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin", "manager")),
):
    payment = db.get(Payment, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment


@router.post("", response_model=PaymentOut, status_code=201)
def create_payment(
    payload: PaymentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin", "manager")),
):
    if not db.get(Project, payload.project_id):
        raise HTTPException(status_code=400, detail="Project not found")

    payment = Payment(**payload.model_dump())
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


@router.patch("/{payment_id}", response_model=PaymentOut)
def update_payment(
    payment_id: int,
    payload: PaymentUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin", "manager")),
):
    payment = db.get(Payment, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    data = payload.model_dump(exclude_unset=True)

    if data.get("status") == "paid" and payment.paid_at is None:
        payment.paid_at = datetime.now(timezone.utc)

    for field, value in data.items():
        setattr(payment, field, value)

    db.commit()
    db.refresh(payment)
    return payment


@router.delete("/{payment_id}", status_code=204)
def delete_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin")),
):
    payment = db.get(Payment, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    db.delete(payment)
    db.commit()