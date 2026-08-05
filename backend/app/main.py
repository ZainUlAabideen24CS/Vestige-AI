from fastapi import FastAPI
from sqlalchemy import text
from app.db.session import engine
from app.routes import auth
from app.routes import auth, clients, projects, leads

app = FastAPI(title="Vestige AI")

app.include_router(auth.router)


@app.get("/health")
def health():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"api": "ok", "sqlserver": "ok"}



app.include_router(auth.router)
app.include_router(clients.router)
app.include_router(projects.router)
app.include_router(leads.router)