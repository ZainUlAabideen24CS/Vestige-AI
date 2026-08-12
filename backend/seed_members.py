import random
from app.db.session import SessionLocal
from app.models.user import User
from app.models.project import Project
from app.models.project_member import ProjectMember

db = SessionLocal()

if db.query(ProjectMember).count() > 0:
    print("Members already exist. Delete them first if you want to reseed.")
else:
    managers = db.query(User).filter(User.role == "manager").all()
    employees = db.query(User).filter(User.role == "employee").all()
    projects = db.query(Project).all()

    count = 0
    for p in projects:
        if managers:
            db.add(ProjectMember(project_id=p.id, user_id=random.choice(managers).id,
                                 role_on_project="manager"))
            count += 1
        for u in random.sample(employees, min(len(employees), random.randint(1, 2))):
            db.add(ProjectMember(project_id=p.id, user_id=u.id, role_on_project="member"))
            count += 1

    db.commit()
    print(f"Created {count} memberships across {len(projects)} projects")

db.close()