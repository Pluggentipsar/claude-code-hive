"""
User model for authentication and authorization.
"""

from sqlalchemy import Column, String, Boolean, DateTime, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
import enum

from app.database import Base


class UserRole(str, enum.Enum):
    """User role types for RBAC."""

    ADMIN = "admin"
    TEACHER = "teacher"
    STAFF = "staff"


class User(Base):
    """
    Represents a system user with authentication credentials.
    """

    __tablename__ = "users"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Authentication
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)

    # Profile
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)

    # Authorization
    role = Column(SQLEnum(UserRole), nullable=False, default=UserRole.STAFF)

    # Status
    active = Column(Boolean, default=True, nullable=False, index=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', role={self.role.value})>"

    @property
    def full_name(self) -> str:
        """Return full name."""
        return f"{self.first_name} {self.last_name}"
