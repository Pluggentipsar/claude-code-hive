"""
Staff (Personal) database model.
"""

from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.database import Base, JSONType


class StaffGradeGroup(str, enum.Enum):
    """Which grade group a staff member primarily works with."""

    GRADES_1_3 = "grades_1_3"
    GRADES_4_6 = "grades_4_6"


class StaffRole(str, enum.Enum):
    """Staff role types."""

    ASSISTANT = "elevassistent"
    TEACHER = "pedagog"
    LEISURE_EDUCATOR = "fritidspedagog"


class ScheduleType(str, enum.Enum):
    """Schedule pattern types."""

    TWO_WEEK_ROTATION = "two_week_rotation"  # Rullande tvåveckorsschema
    FIXED = "fixed"  # Fast schema varje vecka


class Staff(Base):
    """
    Represents a staff member (personal).

    Includes certifications, working hours, and availability.
    """

    __tablename__ = "staff"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Basic information
    personal_number = Column(String(13), unique=True, nullable=False, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)

    # Role
    role = Column(SQLEnum(StaffRole), nullable=False, index=True)

    # Competencies (care certifications)
    care_certifications = Column(
        JSONType, default=list, nullable=False
    )  # ["epilepsy", "diabetes", ...]

    # Schedule configuration
    schedule_type = Column(SQLEnum(ScheduleType), nullable=False, default=ScheduleType.FIXED)

    # Grade group — which stage the staff primarily works with (nullable = works both)
    grade_group = Column(SQLEnum(StaffGradeGroup), nullable=True, index=True)

    # Friday rotation group (1-4, nullable = not in rotation)
    friday_rotation_group = Column(Integer, nullable=True)

    # Default shifts per weekday (JSON): {"0": {"start": "07:00", "end": "16:00", "break": 30}, ...}
    default_shifts = Column(JSONType, default=dict, nullable=False)

    # Employment
    employment_start = Column(DateTime(timezone=True), nullable=False)

    # Status
    active = Column(Boolean, default=True, nullable=False, index=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    work_hours = relationship("WorkHour", back_populates="staff", cascade="all, delete-orphan")
    absences = relationship("Absence", back_populates="staff", cascade="all, delete-orphan")
    assignments = relationship("StaffAssignment", back_populates="staff")

    def __repr__(self):
        return f"<Staff(id={self.id}, name='{self.first_name} {self.last_name}', role={self.role.value})>"

    @property
    def full_name(self) -> str:
        """Return full name."""
        return f"{self.first_name} {self.last_name}"


class WorkHour(Base):
    """
    Represents a staff member's regular working hours.

    Supports two-week rotation schedules (week_number 1 or 2).
    """

    __tablename__ = "work_hours"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    staff_id = Column(
        UUID(as_uuid=True), ForeignKey("staff.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Weekday (0=Monday, 6=Sunday)
    weekday = Column(Integer, nullable=False)  # 0-6

    # Week number for rotation (1 or 2, or 0 for both weeks)
    week_number = Column(Integer, nullable=False, default=0)  # 0=both, 1=week1, 2=week2

    # Working hours
    start_time = Column(String(5), nullable=False)  # HH:MM
    end_time = Column(String(5), nullable=False)  # HH:MM

    # Lunch break
    lunch_start = Column(String(5), nullable=True)  # HH:MM
    lunch_end = Column(String(5), nullable=True)  # HH:MM

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    staff = relationship("Staff", back_populates="work_hours")

    def __repr__(self):
        weekday_name = [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
        ][self.weekday]
        week_str = f"W{self.week_number}" if self.week_number > 0 else "All"
        return f"<WorkHour(staff_id={self.staff_id}, {week_str} {weekday_name} {self.start_time}-{self.end_time})>"


class AbsenceReason(str, enum.Enum):
    """Absence reason types."""

    SICK = "sick"
    VACATION = "vacation"
    PARENTAL_LEAVE = "parental_leave"
    TRAINING = "training"
    OTHER = "other"


class Absence(Base):
    """
    Represents a staff member's absence.

    Can be full-day or partial-day absence.
    """

    __tablename__ = "absences"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    staff_id = Column(
        UUID(as_uuid=True), ForeignKey("staff.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Absence date
    absence_date = Column(DateTime(timezone=True), nullable=False, index=True)

    # Time range (None = full day)
    start_time = Column(String(5), nullable=True)  # HH:MM
    end_time = Column(String(5), nullable=True)  # HH:MM

    # Reason
    reason = Column(SQLEnum(AbsenceReason), nullable=False, default=AbsenceReason.SICK)

    # Timestamps
    reported_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    staff = relationship("Staff", back_populates="absences")

    def __repr__(self):
        time_str = f"{self.start_time}-{self.end_time}" if self.start_time else "Full day"
        return f"<Absence(staff_id={self.staff_id}, date={self.absence_date.date()}, {time_str}, reason={self.reason.value})>"
