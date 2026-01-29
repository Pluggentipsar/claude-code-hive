"""
Pydantic schemas for request/response validation.
"""

from app.schemas.schedule import (
    ScheduleCreate,
    ScheduleResponse,
    ScheduleDetailResponse,
    AssignmentResponse,
)
from app.schemas.student import (
    StudentCreate,
    StudentUpdate,
    StudentResponse,
    CareTimeCreate,
    CareTimeUpdate,
    CareTimeResponse,
)
from app.schemas.staff import (
    StaffCreate,
    StaffUpdate,
    StaffResponse,
    WorkHourCreate,
    WorkHourUpdate,
    WorkHourResponse,
    AbsenceCreate,
    AbsenceResponse,
)

__all__ = [
    # Schedule
    "ScheduleCreate",
    "ScheduleResponse",
    "ScheduleDetailResponse",
    "AssignmentResponse",
    # Student
    "StudentCreate",
    "StudentUpdate",
    "StudentResponse",
    "CareTimeCreate",
    "CareTimeUpdate",
    "CareTimeResponse",
    # Staff
    "StaffCreate",
    "StaffUpdate",
    "StaffResponse",
    "WorkHourCreate",
    "WorkHourUpdate",
    "WorkHourResponse",
    "AbsenceCreate",
    "AbsenceResponse",
]