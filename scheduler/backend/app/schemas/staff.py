"""
Pydantic schemas for staff endpoints.
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, date
from uuid import UUID

from app.models import StaffRole, ScheduleType, AbsenceReason


class StaffCreate(BaseModel):
    """Request schema for creating staff."""

    personal_number: str = Field(..., min_length=10, max_length=13)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    role: StaffRole
    care_certifications: List[str] = []
    schedule_type: ScheduleType = ScheduleType.FIXED


class StaffUpdate(BaseModel):
    """Request schema for updating staff."""

    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    role: Optional[StaffRole] = None
    care_certifications: Optional[List[str]] = None
    schedule_type: Optional[ScheduleType] = None
    active: Optional[bool] = None


class StaffResponse(BaseModel):
    """Response schema for staff."""

    id: UUID
    personal_number: str
    first_name: str
    last_name: str
    role: StaffRole
    care_certifications: List[str]
    schedule_type: ScheduleType
    employment_start: datetime
    active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class WorkHourCreate(BaseModel):
    """Schema for creating work hours."""

    weekday: int = Field(..., ge=0, le=6, description="Weekday (0=Monday, 6=Sunday)")
    week_number: int = Field(0, ge=0, le=2, description="Week number (0=both, 1=week1, 2=week2)")
    start_time: str = Field(..., pattern=r'^\d{2}:\d{2}$', description="Start time (HH:MM)")
    end_time: str = Field(..., pattern=r'^\d{2}:\d{2}$', description="End time (HH:MM)")
    lunch_start: Optional[str] = Field(None, pattern=r'^\d{2}:\d{2}$', description="Lunch start (HH:MM)")
    lunch_end: Optional[str] = Field(None, pattern=r'^\d{2}:\d{2}$', description="Lunch end (HH:MM)")


class WorkHourUpdate(BaseModel):
    """Schema for updating work hours."""

    weekday: Optional[int] = Field(None, ge=0, le=6)
    week_number: Optional[int] = Field(None, ge=0, le=2)
    start_time: Optional[str] = Field(None, pattern=r'^\d{2}:\d{2}$')
    end_time: Optional[str] = Field(None, pattern=r'^\d{2}:\d{2}$')
    lunch_start: Optional[str] = Field(None, pattern=r'^\d{2}:\d{2}$')
    lunch_end: Optional[str] = Field(None, pattern=r'^\d{2}:\d{2}$')


class WorkHourResponse(BaseModel):
    """Schema for work hour response."""

    id: UUID
    staff_id: UUID
    weekday: int
    week_number: int
    start_time: str
    end_time: str
    lunch_start: Optional[str]
    lunch_end: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class AbsenceCreate(BaseModel):
    """Request schema for creating absence."""

    staff_id: UUID
    absence_date: date
    start_time: Optional[str] = Field(None, pattern=r'^\d{2}:\d{2}$')
    end_time: Optional[str] = Field(None, pattern=r'^\d{2}:\d{2}$')
    reason: AbsenceReason = AbsenceReason.SICK


class AbsenceResponse(BaseModel):
    """Response schema for absence."""

    id: UUID
    staff_id: UUID
    absence_date: datetime
    start_time: Optional[str]
    end_time: Optional[str]
    reason: AbsenceReason
    reported_at: datetime

    class Config:
        from_attributes = True
