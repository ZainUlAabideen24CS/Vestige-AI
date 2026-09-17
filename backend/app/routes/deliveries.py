from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.core.permission import (
    can_view_delivery,
    can_manage_delivery,
    can_delete_delivery,
)

from app.models.delivery import Delivery
from app.models.project import Project
from app.models.user import User

from app.schemas.delivery import (
    DeliveryCreate,
    DeliveryUpdate,
    DeliveryOut,
)


router = APIRouter(
    prefix="/deliveries",
    tags=["deliveries"],
)


# ============================================================
# LIST DELIVERIES
# ============================================================

@router.get("", response_model=list[DeliveryOut])
def list_deliveries(
    project_id: int | None = None,
    status: str | None = None,
    skip: int = 0,
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):

    query = db.query(Delivery)

    # Project-specific request
    if project_id is not None:

        if not can_view_delivery(
            db,
            user,
            project_id,
        ):
            raise HTTPException(
                status_code=403,
                detail="You do not have access to deliveries for this project",
            )

        query = query.filter(
            Delivery.project_id == project_id
        )

    # Only Admin can request all deliveries
    else:

        if user.role != "admin":
            raise HTTPException(
                status_code=403,
                detail="Project ID is required",
            )

    if status:
        query = query.filter(
            Delivery.status == status
        )

    return (
        query
        .order_by(Delivery.due_date.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )


# ============================================================
# GET SINGLE DELIVERY
# ============================================================

@router.get(
    "/{delivery_id}",
    response_model=DeliveryOut,
)
def get_delivery(
    delivery_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):

    delivery = db.get(
        Delivery,
        delivery_id,
    )

    if not delivery:
        raise HTTPException(
            status_code=404,
            detail="Delivery not found",
        )

    if not can_view_delivery(
        db,
        user,
        delivery.project_id,
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this delivery",
        )

    return delivery


# ============================================================
# CREATE DELIVERY
# ============================================================

@router.post(
    "",
    response_model=DeliveryOut,
    status_code=201,
)
def create_delivery(
    payload: DeliveryCreate,
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

    if not can_manage_delivery(
        db,
        user,
        payload.project_id,
    ):
        raise HTTPException(
            status_code=403,
            detail="Only Admin or the Project Manager can create deliveries for this project",
        )

    delivery = Delivery(
        **payload.model_dump()
    )

    # Automatically set delivered_at when delivery
    # is created directly as delivered
    if delivery.status == "delivered":
        delivery.delivered_at = datetime.now(timezone.utc)

    db.add(delivery)
    db.commit()
    db.refresh(delivery)

    return delivery


# ============================================================
# DELETE DELIVERY
# ============================================================

@router.delete(
    "/{delivery_id}",
    status_code=204,
)
def delete_delivery(
    delivery_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):

    delivery = db.get(
        Delivery,
        delivery_id,
    )

    if not delivery:
        raise HTTPException(
            status_code=404,
            detail="Delivery not found",
        )

    if not can_delete_delivery(
        db,
        user,
        delivery.project_id,
    ):
        raise HTTPException(
            status_code=403,
            detail="Only Admin can delete deliveries",
        )

    db.delete(delivery)
    db.commit()

    return None