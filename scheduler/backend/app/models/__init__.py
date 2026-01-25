"""
Database models for Kålgårdens Schemaläggningssystem.

All models must be imported here for Alembic to detect them.
"""

from app.models.student import Student, CareTime
from app.models.staff import Staff, WorkHour, Absence, StaffRole, ScheduleType, AbsenceReason
from app.models.school_class import SchoolClass, TeamMeeting, GradeGroup
from app.models.schedule import (
    Schedule,
    StaffAssignment,
    SolverStatus,
    AssignmentType,
)
from app.models.constraint import Constraint, ConstraintType, ConstraintScope

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
    # Class related
    "SchoolClass",
    "TeamMeeting",
    "GradeGroup",
    # Schedule related
    "Schedule",
    "StaffAssignment",
    "SolverStatus",
    "AssignmentType",
    # Constraint related
    "Constraint",
    "ConstraintType",
    "ConstraintScope",
]
