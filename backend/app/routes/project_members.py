from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import (
    get_db,
    get_current_user,
)
from app.core.permission import (
    can_access_project,
    can_manage_project_members,
)
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.user import User


router = APIRouter(
    prefix="/projects",
    tags=["project-members"],
)


# ============================================================
# REQUEST SCHEMAS
# ============================================================

class AssignEmployeeRequest(BaseModel):
    user_id: int


# ============================================================
# LIST PROJECT MEMBERS
# ============================================================

@router.get("/{project_id}/members")
def list_project_members(
    project_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Return active members of a project.

    Anyone who has access to the project can VIEW its members.

    Only:
        - admin
        - actual project manager

    can ADD or REMOVE members.

    IMPORTANT:
    projects.manager_id is the single source of truth
    for determining who the project manager is.
    """

    project = db.get(
        Project,
        project_id,
    )

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found",
        )

    # ---------------------------------------------------------
    # Check whether current user can view this project
    # ---------------------------------------------------------

    if not can_access_project(
        db,
        user,
        project_id,
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this project",
        )

    # ---------------------------------------------------------
    # Determine whether current user can manage members
    # ---------------------------------------------------------

    can_manage = can_manage_project_members(
        db,
        user,
        project_id,
    )

    # ---------------------------------------------------------
    # Get active memberships
    # ---------------------------------------------------------

    members = (
        db.query(ProjectMember, User)
        .join(
            User,
            User.id == ProjectMember.user_id,
        )
        .filter(
            ProjectMember.project_id == project_id
        )
        .filter(
            ProjectMember.removed_at.is_(None)
        )
        .all()
    )

    result = []

    # =========================================================
    # ACTUAL PROJECT MANAGER
    # =========================================================

    manager = None

    if project.manager_id:
        manager = db.get(
            User,
            project.manager_id,
        )

    if manager:
        result.append(
            {
                "membership_id": None,
                "user_id": manager.id,
                "full_name": manager.full_name,
                "email": manager.email,

                # IMPORTANT:
                # Manager status comes from projects.manager_id,
                # NOT project_members.role_on_project.
                "role_on_project": "manager",

                "assigned_at": None,

                # Manager cannot be removed.
                "can_remove": False,
            }
        )

    # =========================================================
    # ACTIVE PROJECT MEMBERS
    # =========================================================

    for membership, member in members:

        # -----------------------------------------------------
        # Never show actual manager as a normal member.
        # -----------------------------------------------------

        if member.id == project.manager_id:
            continue

        result.append(
            {
                "membership_id": membership.id,
                "user_id": member.id,
                "full_name": member.full_name,
                "email": member.email,

                # IMPORTANT:
                # Everyone except the actual project manager
                # is a normal member.
                "role_on_project": "member",

                "assigned_at": membership.assigned_at,

                # Only project manager/admin can remove members.
                "can_remove": can_manage,
            }
        )

    # =========================================================
    # RETURN
    # =========================================================

    return {
        "project_id": project_id,
        "manager_id": project.manager_id,
        "can_manage_members": can_manage,
        "members": result,
    }


# ============================================================
# ASSIGN EMPLOYEE TO PROJECT
# ============================================================

@router.post(
    "/{project_id}/members",
    status_code=201,
)
def assign_project_member(
    project_id: int,
    payload: AssignEmployeeRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Assign an employee to a project.

    Only:
        - admin
        - actual manager of this project

    can perform this action.
    """

    # ---------------------------------------------------------
    # Check management permission FIRST
    # ---------------------------------------------------------

    if not can_manage_project_members(
        db,
        user,
        project_id,
    ):
        raise HTTPException(
            status_code=403,
            detail="Only the project manager can manage project members",
        )

    # ---------------------------------------------------------
    # Get project
    # ---------------------------------------------------------

    project = db.get(
        Project,
        project_id,
    )

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found",
        )

    # ---------------------------------------------------------
    # Get employee
    # ---------------------------------------------------------

    employee = db.get(
        User,
        payload.user_id,
    )

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found",
        )

    # ---------------------------------------------------------
    # Employee must be active
    # ---------------------------------------------------------

    if not employee.is_active:
        raise HTTPException(
            status_code=400,
            detail="Employee is inactive",
        )

    # ---------------------------------------------------------
    # Do not create membership for project manager
    # ---------------------------------------------------------

    if employee.id == project.manager_id:
        raise HTTPException(
            status_code=400,
            detail="Project manager does not need a project membership",
        )

    # ---------------------------------------------------------
    # Check active membership
    # ---------------------------------------------------------

    existing = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.project_id == project_id
        )
        .filter(
            ProjectMember.user_id == employee.id
        )
        .filter(
            ProjectMember.removed_at.is_(None)
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Employee is already assigned to this project",
        )

    # ---------------------------------------------------------
    # Check previous membership
    # ---------------------------------------------------------

    previous_membership = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.project_id == project_id
        )
        .filter(
            ProjectMember.user_id == employee.id
        )
        .order_by(
            ProjectMember.id.desc()
        )
        .first()
    )

    # ---------------------------------------------------------
    # Reactivate previous membership
    # ---------------------------------------------------------

    if previous_membership:

        previous_membership.removed_at = None
        previous_membership.assigned_at = datetime.utcnow()
        previous_membership.role_on_project = "member"

        db.commit()
        db.refresh(previous_membership)

        return {
            "message": "Employee reassigned to project",
            "project_id": project_id,
            "user_id": employee.id,
            "membership_id": previous_membership.id,
            "role_on_project": "member",
        }

    # ---------------------------------------------------------
    # Create new membership
    # ---------------------------------------------------------

    membership = ProjectMember(
        project_id=project_id,
        user_id=employee.id,
        role_on_project="member",
    )

    db.add(membership)
    db.commit()
    db.refresh(membership)

    return {
        "message": "Employee assigned to project",
        "project_id": project_id,
        "user_id": employee.id,
        "membership_id": membership.id,
        "role_on_project": "member",
    }


# ============================================================
# REMOVE EMPLOYEE FROM PROJECT
# ============================================================

@router.delete(
    "/{project_id}/members/{user_id}",
)
def remove_project_member(
    project_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Remove an employee from a project.

    The membership record is preserved.
    removed_at is populated instead of deleting the record.

    Only:
        - admin
        - actual project manager

    can perform this action.
    """

    # ---------------------------------------------------------
    # Check management permission
    # ---------------------------------------------------------

    if not can_manage_project_members(
        db,
        user,
        project_id,
    ):
        raise HTTPException(
            status_code=403,
            detail="Only the project manager can manage project members",
        )

    # ---------------------------------------------------------
    # Get project
    # ---------------------------------------------------------

    project = db.get(
        Project,
        project_id,
    )

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found",
        )

    # ---------------------------------------------------------
    # Never remove the actual project manager
    # ---------------------------------------------------------

    if project.manager_id == user_id:
        raise HTTPException(
            status_code=400,
            detail="Project manager cannot be removed from the project",
        )

    # ---------------------------------------------------------
    # Find active membership
    # ---------------------------------------------------------

    membership = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.project_id == project_id
        )
        .filter(
            ProjectMember.user_id == user_id
        )
        .filter(
            ProjectMember.removed_at.is_(None)
        )
        .first()
    )

    if not membership:
        raise HTTPException(
            status_code=404,
            detail="Active project membership not found",
        )

    # ---------------------------------------------------------
    # Soft remove
    # ---------------------------------------------------------

    membership.removed_at = datetime.utcnow()

    db.commit()

    return {
        "message": "Employee removed from project",
        "project_id": project_id,
        "user_id": user_id,
    }