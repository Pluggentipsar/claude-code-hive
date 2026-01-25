"""
Student (Elev) database model.
"""

from sqlalchemy import Column, String, Integer, Boolean, Text, DateTime, ForeignKey, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.database import Base, JSONType


class Student(Base):
    """
    Represents a student in the school.

    Includes care times, special needs, and staffing preferences.
    """

    __tablename__ = "students"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Basic information
    personal_number = Column(String(13), unique=True, nullable=False, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)

    # Class assignment
    class_id = Column(UUID(as_uuid=True), ForeignKey("classes.id"), nullable=True)
    grade = Column(Integer, nullable=False)  # 1-6

    # Care requirements
    has_care_needs = Column(Boolean, default=False, nullable=False)
    care_requirements = Column(
        JSONType, default=list, nullable=False
    )  # ["epilepsy", "diabetes", ...]

    # Staffing preferences (for comfort/security)
    preferred_staff = Column(
        JSONType, default=list, nullable=False
    )  # [staff_id1, staff_id2, ...]
    requires_double_staffing = Column(Boolean, default=False, nullable=False)

    # Additional notes
    notes = Column(Text, nullable=True)

    # Status
    active = Column(Boolean, default=True, nullable=False, index=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    school_class = relationship("SchoolClass", back_populates="students")
    care_times = relationship(
        "CareTime", back_populates="student", cascade="all, delete-orphan"
    )
    assignments = relationship("StaffAssignment", back_populates="student")

    def __repr__(self):
        return f"<Student(id={self.id}, name='{self.first_name} {self.last_name}', grade={self.grade})>"

    @property
    def full_name(self) -> str:
        """Return full name."""
        return f"{self.first_name} {self.last_name}"


class CareTime(Base):
    """
    Represents when a student needs care (omsorgstid).

    Can be recurring (weekly) or temporary (specific date range).
    """

    __tablename__ = "care_times"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Weekday (0=Monday, 6=Sunday)
    weekday = Column(Integer, nullable=False)  # 0-6

    # Time range
    start_time = Column(String(5), nullable=False)  # HH:MM format
    end_time = Column(String(5), nullable=False)  # HH:MM format

    # Validity period
    valid_from = Column(DateTime(timezone=True), nullable=False)
    valid_to = Column(DateTime(timezone=True), nullable=True)  # None = indefinite

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    student = relationship("Student", back_populates="care_times")

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
        return f"<CareTime(student_id={self.student_id}, {weekday_name} {self.start_time}-{self.end_time})>"
