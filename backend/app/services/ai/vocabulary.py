from sqlalchemy.orm import Session

from app.models.user import User
from app.models.client import Client
from app.models.project import Project
from app.models.project_member import ProjectMember

MAX_TERMS = 40


def build_vocabulary_hint(
    db: Session,
    project_id: int | None = None,
    client_id: int | None = None,
    extra_participants: str | None = None,
) -> str:
    """Build a Whisper prompt biasing transcription toward known names."""
    terms: list[str] = []

    # Names supplied on the upload form take priority
    if extra_participants:
        terms.extend(n.strip() for n in extra_participants.split(",") if n.strip())

    # Staff on the selected project, or all active staff
    if project_id:
        rows = (
            db.query(User.full_name)
            .join(ProjectMember, ProjectMember.user_id == User.id)
            .filter(ProjectMember.project_id == project_id)
            .filter(ProjectMember.removed_at.is_(None))
            .all()
        )
        terms.extend(r[0] for r in rows if r[0])

        project = db.get(Project, project_id)
        if project:
            terms.append(project.name)
            if project.manager_id:
                manager = db.get(User, project.manager_id)
                if manager:
                    terms.append(manager.full_name)
    else:
        rows = db.query(User.full_name).filter(User.is_active.is_(True)).all()
        terms.extend(r[0] for r in rows if r[0])

    # Client company and contact
    target_client_id = client_id
    if not target_client_id and project_id:
        project = db.get(Project, project_id)
        target_client_id = project.client_id if project else None

    if target_client_id:
        client = db.get(Client, target_client_id)
        if client:
            terms.append(client.company_name)
            if client.contact_name:
                terms.append(client.contact_name)

    # Deduplicate, preserve order, cap length
    seen: set[str] = set()
    unique: list[str] = []
    for t in terms:
        key = t.lower()
        if key not in seen:
            seen.add(key)
            unique.append(t)
        if len(unique) >= MAX_TERMS:
            break

    if not unique:
        return "A business meeting between a software agency and its client."

    return (
        "A business meeting between a software agency and its client. "
        f"Names and terms that may appear: {', '.join(unique)}."
    )