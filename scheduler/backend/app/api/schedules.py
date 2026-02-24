"""
Legacy schedule routes — kept as stub to avoid import errors.

All scheduling is now handled by api/week_schedules.py.
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def schedules_deprecated():
    """Legacy endpoint. Use /api/v1/weeks/ instead."""
    return {"message": "This endpoint is deprecated. Use /api/v1/weeks/ instead."}
