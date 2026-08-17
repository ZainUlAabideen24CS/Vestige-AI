from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import (
    get_db,
    get_current_user,
    require_roles,
)

from app.core.permission import (
    accessible_project_ids,
)

from app.models.client import Client
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.user import User

from app.schemas.client import (
    ClientCreate,
    ClientUpdate,
    ClientOut,
)


router = APIRouter(
    prefix="/clients",
    tags=["clients"],
)


# ============================================================
# ACCESSIBLE CLIENT IDS
# ============================================================
def accessible_client_ids(
    db: Session,
    user: User,
) -> list[int] | None:
    """
    Return the client IDs the user is allowed to see.

    Rules:

        ADMIN
            -> all clients

        MANAGER
            -> clients they directly manage
            -> clients of projects they manage
            -> clients of projects they can access

        EMPLOYEE
            -> clients of projects they can access
    """

    # Admin can see everything.
    if user.role == "admin":
        return None

    client_ids: set[int] = set()

    # ---------------------------------------------------------
    # Directly managed clients
    # ---------------------------------------------------------

    if user.role == "manager":
        managed_clients = (
            db.query(Client.id)
            .filter(
                Client.account_manager_id == user.id
            )
            .all()
        )

        client_ids.update(
            row[0]
            for row in managed_clients
            if row[0] is not None
        )

    # ---------------------------------------------------------
    # Get all projects this user can access
    # ---------------------------------------------------------

    allowed_project_ids = accessible_project_ids(
        db,
        user,
    )

    if allowed_project_ids:
        project_clients = (
            db.query(Project.client_id)
            .filter(
                Project.id.in_(allowed_project_ids)
            )
            .distinct()
            .all()
        )

        client_ids.update(
            row[0]
            for row in project_clients
            if row[0] is not None
        )

    return list(client_ids)

    # ---------------------------------------------------------
    # EMPLOYEE
    # ---------------------------------------------------------

    allowed_project_ids = accessible_project_ids(
        db,
        user,
    )

    if not allowed_project_ids:
        return []

    employee_clients = (
        db.query(Project.client_id)
        .filter(
            Project.id.in_(allowed_project_ids)
        )
        .distinct()
        .all()
    )

    client_ids.update(
        row[0]
        for row in employee_clients
        if row[0] is not None
    )

    return list(client_ids)


# ============================================================
# LIST CLIENTS
# ============================================================

@router.get(
    "",
    response_model=list[ClientOut],
)
def list_clients(
    q: str | None = Query(
        None,
        description="Search by company name",
    ),
    status: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Client)

    # Search.
    if q:
        query = query.filter(
            Client.company_name.ilike(
                f"%{q}%"
            )
        )

    # Status filter.
    if status:
        query = query.filter(
            Client.status == status
        )

    # Permission filter.
    client_ids = accessible_client_ids(
        db,
        user,
    )

    # None = unrestricted.
    if client_ids is not None:

        if not client_ids:
            return []

        query = query.filter(
            Client.id.in_(client_ids)
        )

    return (
        query
        .order_by(Client.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


# ============================================================
# GET SINGLE CLIENT
# ============================================================

@router.get(
    "/{client_id}",
    response_model=ClientOut,
)
def get_client(
    client_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    client = db.get(
        Client,
        client_id,
    )

    if not client:
        raise HTTPException(
            status_code=404,
            detail="Client not found",
        )

    client_ids = accessible_client_ids(
        db,
        user,
    )

    if (
        client_ids is not None
        and client_id not in client_ids
    ):
        raise HTTPException(
            status_code=403,
            detail="Not permitted",
        )

    return client


# ============================================================
# CREATE CLIENT
# ============================================================

@router.post(
    "",
    response_model=ClientOut,
    status_code=201,
)
def create_client(
    payload: ClientCreate,
    db: Session = Depends(get_db),
    user: User = Depends(
        require_roles("admin", "manager")
    ),
):
    data = payload.model_dump()

    # If a manager does not explicitly choose
    # an account manager, assign the current manager.
    if (
        data.get("account_manager_id") is None
        and user.role == "manager"
    ):
        data["account_manager_id"] = user.id

    client = Client(
        **data
    )

    db.add(client)
    db.commit()
    db.refresh(client)

    return client


# ============================================================
# UPDATE CLIENT
# ============================================================

@router.patch(
    "/{client_id}",
    response_model=ClientOut,
)
def update_client(
    client_id: int,
    payload: ClientUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(
        require_roles("admin", "manager")
    ),
):
    client = db.get(
        Client,
        client_id,
    )

    if not client:
        raise HTTPException(
            status_code=404,
            detail="Client not found",
        )

    # ---------------------------------------------------------
    # Managers can only update clients under their supervision
    # ---------------------------------------------------------

    if user.role == "manager":

        allowed_clients = accessible_client_ids(
            db,
            user,
        )

        if (
            allowed_clients is None
            or client_id not in allowed_clients
        ):
            raise HTTPException(
                status_code=403,
                detail="Not permitted to update this client",
            )

    # ---------------------------------------------------------
    # Apply update
    # ---------------------------------------------------------

    data = payload.model_dump(
        exclude_unset=True
    )

    for field, value in data.items():
        setattr(
            client,
            field,
            value,
        )

    db.commit()
    db.refresh(client)

    return client


# ============================================================
# DELETE CLIENT
# ============================================================

@router.delete(
    "/{client_id}",
    status_code=204,
)
def delete_client(
    client_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(
        require_roles("admin")
    ),
):
    client = db.get(
        Client,
        client_id,
    )

    if not client:
        raise HTTPException(
            status_code=404,
            detail="Client not found",
        )

    db.delete(client)
    db.commit()

    return None