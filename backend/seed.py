import random
from datetime import date, timedelta
from decimal import Decimal

from app.db.session import SessionLocal
from app.core.security import hash_password
from app.models.user import User
from app.models.lead import Lead
from app.models.client import Client
from app.models.project import Project

COMPANIES = [
    "Acme Corp", "Horizon Textiles", "Nova Logistics", "Bright Foods",
    "Zenith Motors", "Crescent Pharma", "Orbit Media", "Vertex Steel",
    "Lumen Energy", "Falcon Traders", "Delta Apparel", "Summit Builders",
    "Aurora Tech", "Pioneer Mills", "Quantum Retail",
]

INDUSTRIES = ["Manufacturing", "Logistics", "Retail", "Healthcare", "Media", "Construction"]
SOURCES = ["referral", "website", "linkedin", "cold-call", "event"]
STACKS = [
    "FastAPI, React, PostgreSQL",
    "Django, Vue, MySQL",
    "Node.js, Next.js, MongoDB",
    ".NET, Angular, SQL Server",
    "Laravel, React, MySQL",
]

db = SessionLocal()

users = []
for i, (name, email, role) in enumerate([
    ("Ayesha Khan", "ayesha@vestige.ai", "manager"),
    ("Bilal Ahmed", "bilal@vestige.ai", "employee"),
    ("Sana Malik", "sana@vestige.ai", "employee"),
    ("Usman Tariq", "usman@vestige.ai", "manager"),
]):
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        users.append(existing)
        continue
    u = User(
        email=email,
        full_name=name,
        hashed_password=hash_password("pass123"),
        role=role,
    )
    db.add(u)
    users.append(u)
db.commit()
for u in users:
    db.refresh(u)

for i in range(8):
    db.add(Lead(
        company_name=f"{random.choice(COMPANIES)} {random.randint(100, 999)}",
        contact_name=random.choice(["Ali", "Hina", "Omar", "Zara", "Faisal"]),
        contact_email=f"contact{i}@example.com",
        contact_phone=f"0300{random.randint(1000000, 9999999)}",
        source=random.choice(SOURCES),
        status=random.choice(["new", "contacted", "qualified"]),
        owner_id=random.choice(users).id,
    ))
db.commit()

clients = []
for name in COMPANIES:
    c = Client(
        company_name=name,
        contact_name=random.choice(["Ali Raza", "Hina Shah", "Omar Farooq", "Zara Iqbal"]),
        contact_email=f"info@{name.split()[0].lower()}.com",
        contact_phone=f"0321{random.randint(1000000, 9999999)}",
        industry=random.choice(INDUSTRIES),
        status=random.choice(["active", "active", "active", "inactive"]),
        account_manager_id=random.choice(users).id,
    )
    db.add(c)
    clients.append(c)
db.commit()
for c in clients:
    db.refresh(c)

for c in clients:
    for n in range(random.randint(1, 3)):
        start = date.today() - timedelta(days=random.randint(30, 300))
        db.add(Project(
            name=f"{c.company_name.split()[0]} {random.choice(['Portal', 'CRM', 'App', 'Dashboard', 'Migration'])}",
            description="Internal delivery project.",
            client_id=c.id,
            manager_id=random.choice(users).id,
            status=random.choice(["planning", "in_progress", "in_progress", "completed"]),
            tech_stack=random.choice(STACKS),
            start_date=start,
            end_date=start + timedelta(days=random.randint(60, 240)),
            budget=Decimal(random.randrange(200000, 5000000, 50000)),
        ))
db.commit()

print(f"Seeded: {len(users)} users, 8 leads, {len(clients)} clients, "
      f"{db.query(Project).count()} projects")
db.close()