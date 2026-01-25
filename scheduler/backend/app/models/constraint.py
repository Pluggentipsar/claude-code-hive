"""
Constraint database model for storing scheduling rules.
"""

from sqlalchemy import Column, String, Integer, Boolean, Text, DateTime, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
import enum

from app.database import Base


class ConstraintType(str, enum.Enum):
    """Constraint type - hard vs soft."""

    HARD = "hard"  # MUST be satisfied (eg. care needs matching)
    SOFT = "soft"  # SHOULD be satisfied (eg. preference matching)


class ConstraintScope(str, enum.Enum):
    """Which entities the constraint applies to."""

    ALL = "all"
    SPECIFIC_STUDENTS = "students"
    SPECIFIC_STAFF = "staff"
    SPECIFIC_CLASSES = "classes"


class Constraint(Base):
    """
    Represents a scheduling constraint.

    Constraints can be hard (must satisfy) or soft (weighted preference).
    """

    __tablename__ = "constraints"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Constraint identification
    name = Column(String(200), nullable=False, unique=True)
    description = Column(Text, nullable=True)

    # Constraint type
    type = Column(SQLEnum(ConstraintType), nullable=False, index=True)

    # Priority (only for soft constraints)
    priority = Column(Integer, nullable=True)  # 1-10 (10 = highest)

    # Constraint definition (Python code or expression)
    constraint_code = Column(Text, nullable=False)

    # Scope
    applies_to = Column(SQLEnum(ConstraintScope), nullable=False, default=ConstraintScope.ALL)

    # Status
    active = Column(Boolean, default=True, nullable=False, index=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    def __repr__(self):
        return f"<Constraint(name='{self.name}', type={self.type.value}, priority={self.priority})>"
