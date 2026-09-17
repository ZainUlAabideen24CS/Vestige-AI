from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.core.permission import (
    can_view_payment,
    can_manage_payment,
    can_delete_payment,
)

from app.models.payment import Payment
from app.models.project import Project
from app.models.user import User

from app.schemas.payment import (
    PaymentCreate,
    PaymentUpdate,
    PaymentOut,
)


router = APIRouter(
    prefix="/payments",
    tags=["payments"],
)


# ============================================================
# LIST PAYMENTS
# ============================================================

@router.get("", response_model=list[PaymentOut])
def list_payments(
    project_id: int | None = None,
    status: str | None = None,
    skip: int = 0,
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):

    query = db.query(Payment)

    # Project-specific request
    if project_id is not None:

        if not can_view_payment(
            db,
            user,
            project_id,
        ):
            raise HTTPException(
                status_code=403,
                detail="You do not have access to payments for this project",
            )

        query = query.filter(
            Payment.project_id == project_id
        )

    # Only Admin can request all payments
    else:

        if user.role != "admin":
            raise HTTPException(
                status_code=403,
                detail="Project ID is required",
            )

    if status:
        query = query.filter(
            Payment.status == status
        )

    return (
        query
        .order_by(Payment.due_date.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )


# ============================================================
# PAYMENT SUMMARY
# ============================================================

@router.get("/summary")
def payment_summary(
    project_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):

    if not can_view_payment(
        db,
        user,
        project_id,
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have access to payment information for this project",
        )

    rows = (
        db.query(
            Payment.status,
            func.sum(Payment.amount),
            func.count(Payment.id),
        )
        .filter(Payment.project_id == project_id)
        .group_by(Payment.status)
        .all()
    )

    return [
        {
            "status": status,
            "total_amount": total_amount or 0,
            "count": count,
        }
        for status, total_amount, count in rows
    ]


# ============================================================
# GET SINGLE PAYMENT
# ============================================================

@router.get("/{payment_id}", response_model=PaymentOut)
def get_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):

    payment = db.get(
        Payment,
        payment_id,
    )

    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Payment not found",
        )

    if not can_view_payment(
        db,
        user,
        payment.project_id,
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this payment",
        )

    return payment


# ============================================================
# CREATE PAYMENT
# ============================================================

@router.post(
    "",
    response_model=PaymentOut,
    status_code=201,
)
def create_payment(
    payload: PaymentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = db.get(
        Project,
        payload.project_id,
    )

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found",
        )

    if not can_manage_payment(
        db,
        user,
        payload.project_id,
    ):
        raise HTTPException(
            status_code=403,
            detail="Only Admin or the Account Manager can create payments for this project",
        )

    payment = Payment(
        **payload.model_dump()
    )

    # Automatically set paid_at when payment
    # is created directly as paid
    if payment.status == "paid":
        payment.paid_at = datetime.now(timezone.utc)

    db.add(payment)
    db.commit()
    db.refresh(payment)

    return payment

# ============================================================
# UPDATE PAYMENT
# ============================================================

@router.patch(
    "/{payment_id}",
    response_model=PaymentOut,
)
def update_payment(
    payment_id: int,
    payload: PaymentUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):

    payment = db.get(
        Payment,
        payment_id,
    )

    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Payment not found",
        )

    if not can_manage_payment(
        db,
        user,
        payment.project_id,
    ):
        raise HTTPException(
            status_code=403,
            detail="Only Admin or the Account Manager can edit this payment",
        )

    data = payload.model_dump(
        exclude_unset=True
    )

    # Automatically set paid_at
    if (
        data.get("status") == "paid"
        and payment.paid_at is None
    ):
        payment.paid_at = datetime.now(
            timezone.utc
        )

    for field, value in data.items():
        setattr(
            payment,
            field,
            value,
        )

    db.commit()
    db.refresh(payment)

    return payment


# ============================================================
# DELETE PAYMENT
# ============================================================

@router.delete(
    "/{payment_id}",
    status_code=204,
)
def delete_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):

    payment = db.get(
        Payment,
        payment_id,
    )

    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Payment not found",
        )

    if not can_delete_payment(
        db,
        user,
        payment.project_id,
    ):
        raise HTTPException(
            status_code=403,
            detail="Only Admin can delete payments",
        )

    db.delete(payment)
    db.commit()

    return None