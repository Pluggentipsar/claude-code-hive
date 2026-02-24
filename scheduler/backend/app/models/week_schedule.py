"""
Simplified schedule models — "Digital Excel".

WeekSchedule, StudentDay, DayAssignment, StaffShift.
"""

from sqlalchemy import Column, String, Integer, Boolean, Text, DateTime, ForeignKey, UniqueConstraint, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.database import Base


class WeekStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"


class DayAssignmentRole(str, enum.Enum):
    SCHOOL_SUPPORT = "school_support"
    DOUBLE_STAFFING = "double_staffing"
    EXTRA_CARE = "extra_care"


class WeekSchedule(Base):
    """One row = one week's schedule."""

    __tablename__ = "week_schedules"
    __table_args__ = (
        UniqueConstraint("year", "week_number", name="uq_week_schedules_year_week"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    year = Column(Integer, nullable=False)
    week_number = Column(Integer, nullable=False)
    status = Column(SQLEnum(WeekStatus), nullable=False, default=WeekStatus.DRAFT)
    notes = Column(Text, nullable=True)
    copied_from_id = Column(UUID(as_uuid=True), ForeignKey("week_schedules.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    student_days = relationship("StudentDay", back_populates="week_schedule", cascade="all, delete-orphan")
    day_assignments = relationship("DayAssignment", back_populates="week_schedule", cascade="all, delete-orphan")
    staff_shifts = relationship("StaffShift", back_populates="week_schedule", cascade="all, delete-orphan")
    copied_from = relationship("WeekSchedule", remote_side=[id])

    def __repr__(self):
        return f"<WeekSchedule(year={self.year}, week={self.week_number}, status={self.status.value})>"


class StudentDay(Base):
    """One row = one student's day in a week schedule."""

    __tablename__ = "student_days"
    __table_args__ = (
        UniqueConstraint("week_schedule_id", "student_id", "weekday", name="uq_student_days_week_student_day"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    week_schedule_id = Column(
        UUID(as_uuid=True), ForeignKey("week_schedules.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False, index=True)
    weekday = Column(Integer, nullable=False)  # 0-4 Mon-Fri

    arrival_time = Column(String(5), nullable=True)   # HH:MM
    departure_time = Column(String(5), nullable=True)  # HH:MM
    fm_staff_id = Column(UUID(as_uuid=True), ForeignKey("staff.id"), nullable=True)
    em_staff_id = Column(UUID(as_uuid=True), ForeignKey("staff.id"), nullable=True)
    notes = Column(Text, nullable=True)
    absent_type = Column(String(10), nullable=False, default="none")  # none, full_day, am, pm

    # Relationships
    week_schedule = relationship("WeekSchedule", back_populates="student_days")
    student = relationship("Student", foreign_keys=[student_id])
    fm_staff = relationship("Staff", foreign_keys=[fm_staff_id])
    em_staff = relationship("Staff", foreign_keys=[em_staff_id])

    def __repr__(self):
        days = ["Mon", "Tue", "Wed", "Thu", "Fri"]
        return f"<StudentDay(student={self.student_id}, {days[self.weekday]} {self.arrival_time}-{self.departure_time})>"


class DayAssignment(Base):
    """Extra assignments for special needs students (1:1, double staffing, etc)."""

    __tablename__ = "day_assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    week_schedule_id = Column(
        UUID(as_uuid=True), ForeignKey("week_schedules.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False, index=True)
    staff_id = Column(UUID(as_uuid=True), ForeignKey("staff.id"), nullable=False, index=True)
    weekday = Column(Integer, nullable=False)  # 0-4

    start_time = Column(String(5), nullable=False)  # HH:MM
    end_time = Column(String(5), nullable=False)    # HH:MM
    role = Column(SQLEnum(DayAssignmentRole), nullable=False)
    notes = Column(Text, nullable=True)

    # Relationships
    week_schedule = relationship("WeekSchedule", back_populates="day_assignments")
    student = relationship("Student", foreign_keys=[student_id])
    staff = relationship("Staff", foreign_keys=[staff_id])

    def __repr__(self):
        days = ["Mon", "Tue", "Wed", "Thu", "Fri"]
        return f"<DayAssignment(staff={self.staff_id}, student={self.student_id}, {days[self.weekday]} {self.start_time}-{self.end_time})>"


class StaffShift(Base):
    """One row = one staff member's shift on a specific day."""

    __tablename__ = "staff_shifts"
    __table_args__ = (
        UniqueConstraint("week_schedule_id", "staff_id", "weekday", name="uq_staff_shifts_week_staff_day"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    week_schedule_id = Column(
        UUID(as_uuid=True), ForeignKey("week_schedules.id", ondelete="CASCADE"), nullable=False, index=True
    )
    staff_id = Column(UUID(as_uuid=True), ForeignKey("staff.id"), nullable=False, index=True)
    weekday = Column(Integer, nullable=False)  # 0-4

    start_time = Column(String(5), nullable=False)  # HH:MM
    end_time = Column(String(5), nullable=False)    # HH:MM
    break_minutes = Column(Integer, nullable=False, default=30)
    notes = Column(Text, nullable=True)

    # Relationships
    week_schedule = relationship("WeekSchedule", back_populates="staff_shifts")
    staff = relationship("Staff", foreign_keys=[staff_id])

    def __repr__(self):
        days = ["Mon", "Tue", "Wed", "Thu", "Fri"]
        return f"<StaffShift(staff={self.staff_id}, {days[self.weekday]} {self.start_time}-{self.end_time})>"
