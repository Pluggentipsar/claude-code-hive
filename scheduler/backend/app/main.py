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
    redirect_slashes=False,  # Allow both /staff and /staff/
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
from app.api import schedules, students, staff

app.include_router(students.router, prefix=f"{settings.api_v1_prefix}/students", tags=["students"])
app.include_router(staff.router, prefix=f"{settings.api_v1_prefix}/staff", tags=["staff"])
app.include_router(schedules.router, prefix=f"{settings.api_v1_prefix}/schedules", tags=["schedules"])


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
    )
