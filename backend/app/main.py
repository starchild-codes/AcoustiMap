"""FastAPI application entry point."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database.session import init_db
from app.api import projects, sites, recordings, configurations, analysis, exports


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    await init_db()
    yield


app = FastAPI(
    title="AcoustiMap Restore API",
    description="Real audio analysis pipeline for ecosystem restoration monitoring",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(projects.router)
app.include_router(sites.router)
app.include_router(recordings.router)
app.include_router(configurations.router)
app.include_router(analysis.router)
app.include_router(exports.router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
