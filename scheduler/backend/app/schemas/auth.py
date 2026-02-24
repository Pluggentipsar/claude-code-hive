"""
Pydantic schemas for authentication and user management.
"""

from pydantic import BaseModel, EmailStr, Field
from uuid import UUID
from datetime import datetime
from typing import Optional

from app.models.user import UserRole


class UserCreate(BaseModel):
    """Schema for creating a new user."""

    email: EmailStr
    password: str = Field(..., min_length=8)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    role: UserRole = UserRole.STAFF


class UserResponse(BaseModel):
    """Schema for user responses (excludes password)."""

    id: UUID
    email: str
    first_name: str
    last_name: str
    role: UserRole
    active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    """Schema for login requests."""

    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Schema for token responses."""

    access_token: str
    token_type: str = "bearer"
    user: UserResponse
