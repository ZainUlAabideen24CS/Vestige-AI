from fastapi import FastAPI
from sqlalchemy import text
from app.db.session import engine
from app.routes import auth
from app.routes import auth, clients, projects, leads
from fastapi.middleware.cors import CORSMiddleware

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
# app.include_router(leads.router)



app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

allow_origins=["http://localhost:5173", "http://localhost:5174"],