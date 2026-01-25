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
)
from app.schemas.staff import (
    StaffCreate,
    StaffUpdate,
    StaffResponse,
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
    # Staff
    "StaffCreate",
    "StaffUpdate",
    "StaffResponse",
    "AbsenceCreate",
    "AbsenceResponse",
]