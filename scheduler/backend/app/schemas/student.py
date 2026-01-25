"""
Pydantic schemas for student endpoints.
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from uuid import UUID


class CareTimeBase(BaseModel):
    """Base schema for care time."""

    weekday: int = Field(..., ge=0, le=6, description="Weekday (0=Monday, 6=Sunday)")
    start_time: str = Field(..., pattern=r'^\d{2}:\d{2}$', description="Start time (HH:MM)")
    end_time: str = Field(..., pattern=r'^\d{2}:\d{2}$', description="End time (HH:MM)")


class StudentCreate(BaseModel):
    """Request schema for creating a student."""

    personal_number: str = Field(..., min_length=10, max_length=13)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    class_id: Optional[UUID] = None
    grade: int = Field(..., ge=1, le=6)
    has_care_needs: bool = False
    care_requirements: List[str] = []
    preferred_staff: List[str] = []
    requires_double_staffing: bool = False
    notes: Optional[str] = None


class StudentUpdate(BaseModel):
    """Request schema for updating a student."""

    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    class_id: Optional[UUID] = None
    grade: Optional[int] = Field(None, ge=1, le=6)
    has_care_needs: Optional[bool] = None
    care_requirements: Optional[List[str]] = None
    preferred_staff: Optional[List[str]] = None
    requires_double_staffing: Optional[bool] = None
    notes: Optional[str] = None
    active: Optional[bool] = None


class StudentResponse(BaseModel):
    """Response schema for student."""

    id: UUID
    personal_number: str
    first_name: str
    last_name: str
    class_id: Optional[UUID]
    grade: int
    has_care_needs: bool
    care_requirements: List[str]
    preferred_staff: List[str]
    requires_double_staffing: bool
    notes: Optional[str]
    active: bool
    created_at: datetime

    class Config:
        from_attributes = True
