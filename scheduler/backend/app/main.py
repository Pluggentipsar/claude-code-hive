"""
FastAPI application entry point.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings

# Create FastAPI application
app = FastAPI(
    title=settings.project_name,
    version=settings.version,
    description="Hybrid scheduling system for Kålgårdens Anpassade Grundskola",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint - health check."""
    return {
        "name": settings.project_name,
        "version": settings.version,
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {"status": "healthy"}


# Import and include API routers
from app.api.schedules import router as schedules_router
from app.api.students import router as students_router
from app.api.staff import router as staff_router
from app.api.classes import router as classes_router
from app.api.import_export import router as import_export_router
from app.api.auth import router as auth_router
from app.api.week_schedules import router as week_schedules_router

app.include_router(auth_router, prefix=f"{settings.api_v1_prefix}/auth", tags=["auth"])
app.include_router(students_router, prefix=f"{settings.api_v1_prefix}/students", tags=["students"])
app.include_router(staff_router, prefix=f"{settings.api_v1_prefix}/staff", tags=["staff"])
app.include_router(classes_router, prefix=f"{settings.api_v1_prefix}/classes", tags=["classes"])
app.include_router(schedules_router, prefix=f"{settings.api_v1_prefix}/schedules", tags=["schedules"])
app.include_router(import_export_router, prefix=f"{settings.api_v1_prefix}/import-export", tags=["import-export"])
app.include_router(week_schedules_router, prefix=f"{settings.api_v1_prefix}", tags=["week-schedules"])


# Auto-create tables for SQLite (dev mode)
if settings.database_url.startswith("sqlite"):
    from app.database import init_db
    from app import models  # noqa: ensure all models are registered
    init_db()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
    )
