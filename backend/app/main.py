from fastapi import FastAPI
from sqlalchemy import text
from fastapi.middleware.cors import CORSMiddleware

from app.db.session import engine
from app.routes import auth, clients, projects, ingest, search, dashboard,worklogs 

app = FastAPI(title="Vestige AI")


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Routers
app.include_router(auth.router)
app.include_router(clients.router)
app.include_router(projects.router)
app.include_router(ingest.router)
app.include_router(search.router)
app.include_router(dashboard.router)
app.include_router(worklogs.router)


@app.get("/health")
def health():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))

    return {
        "api": "ok",
        "sqlserver": "ok"
    }