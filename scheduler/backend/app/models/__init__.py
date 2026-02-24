"""
Database models for Kålgårdens Schemaläggningssystem.

All models must be imported here for Alembic to detect them.
"""

from app.models.student import Student, CareTime
from app.models.staff import Staff, WorkHour, Absence, StaffRole, ScheduleType, AbsenceReason, StaffGradeGroup
from app.models.school_class import SchoolClass, TeamMeeting, GradeGroup
from app.models.schedule import (
    Schedule,
    StaffAssignment,
    SolverStatus,
    AssignmentType,
)
from app.models.constraint import Constraint, ConstraintType, ConstraintScope
from app.models.user import User, UserRole
from app.models.week_schedule import (
    WeekSchedule,
    StudentDay,
    DayAssignment,
    StaffShift,
    WeekStatus,
    DayAssignmentRole,
)

__all__ = [
    # Student related
    "Student",
    "CareTime",
    # Staff related
    "Staff",
    "WorkHour",
    "Absence",
    "StaffRole",
    "ScheduleType",
    "AbsenceReason",
    "StaffGradeGroup",
    # Class related
    "SchoolClass",
    "TeamMeeting",
    "GradeGroup",
    # Schedule related (legacy)
    "Schedule",
    "StaffAssignment",
    "SolverStatus",
    "AssignmentType",
    # Constraint related (legacy)
    "Constraint",
    "ConstraintType",
    "ConstraintScope",
    # User related
    "User",
    "UserRole",
    # Week schedule (new simplified model)
    "WeekSchedule",
    "StudentDay",
    "DayAssignment",
    "StaffShift",
    "WeekStatus",
    "DayAssignmentRole",
]
