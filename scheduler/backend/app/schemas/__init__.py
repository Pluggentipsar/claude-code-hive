"""
Pydantic schemas for request/response validation.
"""

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
    BulkAbsenceCreate,
    BulkAbsenceResponse,
)
from app.schemas.auth import (
    UserCreate,
    UserResponse,
    LoginRequest,
    TokenResponse,
)
from app.schemas.week_schedule import (
    WeekScheduleCreate,
    WeekScheduleCopy,
    WeekScheduleUpdate,
    WeekScheduleResponse,
    StudentDayCreate,
    StudentDayUpdate,
    StudentDayResponse,
    DayAssignmentCreate,
    DayAssignmentUpdate,
    DayAssignmentResponse,
    StaffShiftCreate,
    StaffShiftUpdate,
    StaffShiftResponse,
    Warning,
    WarningsResponse,
    DayDataResponse,
)

__all__ = [
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
    "BulkAbsenceCreate",
    "BulkAbsenceResponse",
    # Auth
    "UserCreate",
    "UserResponse",
    "LoginRequest",
    "TokenResponse",
    # Week schedule
    "WeekScheduleCreate",
    "WeekScheduleCopy",
    "WeekScheduleUpdate",
    "WeekScheduleResponse",
    "StudentDayCreate",
    "StudentDayUpdate",
    "StudentDayResponse",
    "DayAssignmentCreate",
    "DayAssignmentUpdate",
    "DayAssignmentResponse",
    "StaffShiftCreate",
    "StaffShiftUpdate",
    "StaffShiftResponse",
    "Warning",
    "WarningsResponse",
    "DayDataResponse",
]