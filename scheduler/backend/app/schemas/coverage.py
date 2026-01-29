"""
Coverage analysis schemas for API responses.
"""

from datetime import datetime
from typing import List
from uuid import UUID
from pydantic import BaseModel, Field


class StudentSummary(BaseModel):
    """Summary information about a student."""

    id: UUID
    full_name: str
    grade: int
    requires_double_staffing: bool = False

    class Config:
        from_attributes = True


class TimeslotGap(BaseModel):
    """Represents a timeslot with insufficient staff coverage."""

    weekday: int = Field(..., ge=0, le=6, description="Day of week (0=Monday, 6=Sunday)")
    start_time: str = Field(..., pattern=r"^\d{2}:\d{2}$", description="Start time in HH:MM format")
    end_time: str = Field(..., pattern=r"^\d{2}:\d{2}$", description="End time in HH:MM format")
    required_staff: int = Field(..., ge=1, description="Number of staff required")
    available_staff: int = Field(..., ge=0, description="Number of staff available")
    affected_students: List[str] = Field(default_factory=list, description="UUIDs of affected students")
    severity: str = Field(..., pattern="^(critical|warning|ok)$", description="Gap severity level")

    class Config:
        from_attributes = True


class CoverageGapsResponse(BaseModel):
    """Complete coverage analysis response."""

    schedule_id: UUID
    total_gaps: int = Field(..., ge=0, description="Total number of gaps")
    critical_gaps: int = Field(..., ge=0, description="Number of critical gaps")
    understaffed_timeslots: List[TimeslotGap] = Field(
        default_factory=list, description="Timeslots with insufficient staff"
    )
    uncovered_students: List[StudentSummary] = Field(
        default_factory=list, description="Students with no staff assignments"
    )
    double_staffing_violations: List[StudentSummary] = Field(
        default_factory=list, description="Students requiring double staffing but only have single staff"
    )

    class Config:
        from_attributes = True
