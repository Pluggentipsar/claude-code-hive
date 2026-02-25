"""
Pydantic schemas for the simplified week schedule model.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID
from enum import Enum


class WeekStatusEnum(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"


class DayAssignmentRoleEnum(str, Enum):
    SCHOOL_SUPPORT = "school_support"
    DOUBLE_STAFFING = "double_staffing"
    EXTRA_CARE = "extra_care"


class WarningSeverity(str, Enum):
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


class WarningType(str, Enum):
    CONFLICT = "conflict"
    GAP = "gap"
    WORKLOAD = "workload"
    ABSENCE = "absence"
    VULNERABILITY = "vulnerability"


# --- WeekSchedule ---

class WeekScheduleCreate(BaseModel):
    year: int = Field(..., ge=2020, le=2100)
    week_number: int = Field(..., ge=1, le=53)
    notes: Optional[str] = None


class WeekScheduleCopy(BaseModel):
    target_year: int = Field(..., ge=2020, le=2100)
    target_week: int = Field(..., ge=1, le=53)


class WeekScheduleUpdate(BaseModel):
    status: Optional[WeekStatusEnum] = None
    notes: Optional[str] = None


class WeekScheduleResponse(BaseModel):
    id: UUID
    year: int
    week_number: int
    status: WeekStatusEnum
    notes: Optional[str]
    copied_from_id: Optional[UUID]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- StudentDay ---

class StudentDayCreate(BaseModel):
    student_id: UUID
    weekday: int = Field(..., ge=0, le=4)
    arrival_time: Optional[str] = Field(None, pattern=r'^\d{2}:\d{2}$')
    departure_time: Optional[str] = Field(None, pattern=r'^\d{2}:\d{2}$')
    fm_staff_id: Optional[UUID] = None
    em_staff_id: Optional[UUID] = None
    notes: Optional[str] = None


class AbsentTypeEnum(str, Enum):
    NONE = "none"
    FULL_DAY = "full_day"
    AM = "am"
    PM = "pm"


class StudentDayUpdate(BaseModel):
    arrival_time: Optional[str] = Field(None, pattern=r'^\d{2}:\d{2}$')
    departure_time: Optional[str] = Field(None, pattern=r'^\d{2}:\d{2}$')
    fm_staff_id: Optional[UUID] = None
    em_staff_id: Optional[UUID] = None
    notes: Optional[str] = None
    absent_type: Optional[AbsentTypeEnum] = None


class StudentDayResponse(BaseModel):
    id: UUID
    week_schedule_id: UUID
    student_id: UUID
    weekday: int
    arrival_time: Optional[str]
    departure_time: Optional[str]
    fm_staff_id: Optional[UUID]
    em_staff_id: Optional[UUID]
    notes: Optional[str]
    absent_type: str = "none"
    # Inline student info
    student_name: Optional[str] = None
    class_name: Optional[str] = None
    class_id: Optional[UUID] = None
    grade: Optional[int] = None
    has_care_needs: Optional[bool] = None
    # Inline staff names
    fm_staff_name: Optional[str] = None
    em_staff_name: Optional[str] = None

    class Config:
        from_attributes = True


# --- DayAssignment ---

class DayAssignmentCreate(BaseModel):
    student_id: UUID
    staff_id: UUID
    weekday: int = Field(..., ge=0, le=4)
    start_time: str = Field(..., pattern=r'^\d{2}:\d{2}$')
    end_time: str = Field(..., pattern=r'^\d{2}:\d{2}$')
    role: DayAssignmentRoleEnum
    notes: Optional[str] = None


class DayAssignmentUpdate(BaseModel):
    staff_id: Optional[UUID] = None
    start_time: Optional[str] = Field(None, pattern=r'^\d{2}:\d{2}$')
    end_time: Optional[str] = Field(None, pattern=r'^\d{2}:\d{2}$')
    role: Optional[DayAssignmentRoleEnum] = None
    notes: Optional[str] = None


class DayAssignmentResponse(BaseModel):
    id: UUID
    week_schedule_id: UUID
    student_id: UUID
    staff_id: UUID
    weekday: int
    start_time: str
    end_time: str
    role: DayAssignmentRoleEnum
    notes: Optional[str]
    # Inline names
    student_name: Optional[str] = None
    staff_name: Optional[str] = None

    class Config:
        from_attributes = True


# --- StaffShift ---

class StaffShiftCreate(BaseModel):
    staff_id: UUID
    weekday: int = Field(..., ge=0, le=4)
    start_time: str = Field(..., pattern=r'^\d{2}:\d{2}$')
    end_time: str = Field(..., pattern=r'^\d{2}:\d{2}$')
    break_minutes: int = Field(30, ge=0, le=120)
    notes: Optional[str] = None


class StaffShiftUpdate(BaseModel):
    start_time: Optional[str] = Field(None, pattern=r'^\d{2}:\d{2}$')
    end_time: Optional[str] = Field(None, pattern=r'^\d{2}:\d{2}$')
    break_minutes: Optional[int] = Field(None, ge=0, le=120)
    notes: Optional[str] = None


class StaffShiftResponse(BaseModel):
    id: UUID
    week_schedule_id: UUID
    staff_id: UUID
    weekday: int
    start_time: str
    end_time: str
    break_minutes: int
    notes: Optional[str]
    # Inline staff info
    staff_name: Optional[str] = None
    class_name: Optional[str] = None

    class Config:
        from_attributes = True


# --- Warning ---

class Warning(BaseModel):
    type: WarningType
    severity: WarningSeverity
    message: str
    staff_id: Optional[UUID] = None
    student_id: Optional[UUID] = None
    weekday: int
    time: Optional[str] = None


class WarningsResponse(BaseModel):
    warnings: list[Warning]
    summary: dict


# --- DayData (all data for one day in a single response) ---

class DayDataResponse(BaseModel):
    weekday: int
    student_days: list[StudentDayResponse]
    staff_shifts: list[StaffShiftResponse]
    day_assignments: list[DayAssignmentResponse]
    warnings: list[Warning]
