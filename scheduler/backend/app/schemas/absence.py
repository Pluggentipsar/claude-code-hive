"""
Absence impact analysis schemas for API responses.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field

from app.schemas.coverage import StudentSummary


class StaffSuggestion(BaseModel):
    """Suggested substitute staff member."""

    id: UUID
    full_name: str
    role: str
    care_certifications: List[str] = Field(default_factory=list)
    match_score: float = Field(..., ge=0, le=100, description="Match quality score (0-100)")
    available_hours: float = Field(..., ge=0, description="Available hours in week")
    matching_certifications: List[str] = Field(default_factory=list)
    reason: str = Field(..., description="Human-readable reason for suggestion")

    class Config:
        from_attributes = True


class AbsenceImpactResponse(BaseModel):
    """Response showing impact of an absence on scheduling."""

    can_generate: bool = Field(..., description="Whether schedule can still be generated")
    affected_students: List[StudentSummary] = Field(
        default_factory=list, description="Students affected by the absence"
    )
    alternative_staff: List[StaffSuggestion] = Field(
        default_factory=list, description="Suggested substitute staff"
    )
    severity: str = Field(
        ...,
        pattern="^(no_impact|minor|major|critical)$",
        description="Overall impact severity",
    )
    message: Optional[str] = Field(None, description="Human-readable impact message")

    class Config:
        from_attributes = True


class TestAbsenceRequest(BaseModel):
    """Request to test impact of an absence."""

    staff_id: UUID = Field(..., description="Staff member ID")
    absence_date: datetime = Field(..., description="Date of absence")
    start_time: Optional[str] = Field(
        None,
        pattern=r"^\d{2}:\d{2}$",
        description="Start time for partial absence (HH:MM)",
    )
    end_time: Optional[str] = Field(
        None,
        pattern=r"^\d{2}:\d{2}$",
        description="End time for partial absence (HH:MM)",
    )
    week_number: int = Field(..., ge=1, le=53, description="Week number")
    year: int = Field(..., ge=2020, le=2100, description="Year")

    class Config:
        from_attributes = True
