"""
Pydantic schemas for schedule endpoints.

Used for request/response validation.
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from uuid import UUID

from app.models import SolverStatus, AssignmentType


class ScheduleCreate(BaseModel):
    """Request schema for creating a schedule."""

    week_number: int = Field(..., ge=1, le=53, description="Week number (1-53)")
    year: int = Field(..., ge=2020, le=2100, description="Year")
    force_regenerate: bool = Field(default=False, description="Overwrite existing schedule")
    max_solve_time: Optional[int] = Field(default=60, description="Max solver time in seconds")
    slot_duration_minutes: Optional[int] = Field(default=None, description="Timeslot duration (15, 30, or 60 minutes). Defaults to server setting.")


class AssignmentResponse(BaseModel):
    """Response schema for a staff assignment."""

    id: UUID
    staff_id: UUID
    student_id: Optional[UUID]
    class_id: Optional[UUID]
    weekday: int
    start_time: str
    end_time: str
    assignment_type: AssignmentType
    is_manual_override: bool

    class Config:
        from_attributes = True


class ScheduleResponse(BaseModel):
    """Response schema for schedule (summary)."""

    id: UUID
    week_number: int
    year: int
    solver_status: SolverStatus
    objective_value: Optional[float]
    solve_time_ms: Optional[int]
    hard_constraints_met: bool
    soft_constraints_score: Optional[float]
    is_published: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ScheduleDetailResponse(ScheduleResponse):
    """Response schema for schedule with full details."""

    assignments: List[AssignmentResponse]

    class Config:
        from_attributes = True
