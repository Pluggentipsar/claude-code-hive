"""
SchoolClass (Klass) database model.
"""

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.database import Base


class GradeGroup(str, enum.Enum):
    """Grade grouping for staffing purposes."""

    GRADES_1_3 = "grades_1_3"  # Årskurs 1-3 (lower grades)
    GRADES_4_6 = "grades_4_6"  # Årskurs 4-6 (upper grades)


class SchoolClass(Base):
    """
    Represents a class (klass) in the school.

    Classes have assigned teachers and schedules for team meetings (AL).
    """

    __tablename__ = "classes"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Basic information
    name = Column(String(100), nullable=False)  # "Klass 1", "Klass 2", etc.
    grade_group = Column(SQLEnum(GradeGroup), nullable=False, index=True)

    # Primary teacher
    primary_teacher_id = Column(UUID(as_uuid=True), ForeignKey("staff.id"), nullable=True)

    # Academic year
    academic_year = Column(String(20), nullable=False)  # "2025/2026"

    # Status
    active = Column(Boolean, default=True, nullable=False, index=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    primary_teacher = relationship("Staff", foreign_keys=[primary_teacher_id])
    students = relationship("Student", back_populates="school_class")
    team_meetings = relationship("TeamMeeting", back_populates="school_class")

    def __repr__(self):
        return f"<SchoolClass(id={self.id}, name='{self.name}', grade_group={self.grade_group.value})>"


class TeamMeeting(Base):
    """
    Represents a team meeting (AL - Arbetslagsmöte) for a class.

    During AL, teachers attend meetings and other staff must cover their students.
    """

    __tablename__ = "team_meetings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    class_id = Column(
        UUID(as_uuid=True),
        ForeignKey("classes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Weekday (0=Monday, 6=Sunday)
    weekday = Column(String(20), nullable=False)

    # Time range
    start_time = Column(String(5), nullable=False)  # HH:MM
    end_time = Column(String(5), nullable=False)  # HH:MM

    # Recurring schedule
    is_recurring = Column(Boolean, default=True, nullable=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    school_class = relationship("SchoolClass", back_populates="team_meetings")

    def __repr__(self):
        return f"<TeamMeeting(class_id={self.class_id}, {self.weekday} {self.start_time}-{self.end_time})>"
