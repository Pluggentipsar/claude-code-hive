"""
Pydantic schemas for SchoolClass (Klass) API.
"""

from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from uuid import UUID

from app.models.school_class import GradeGroup


class SchoolClassCreate(BaseModel):
    """Schema for creating a school class."""

    name: str = Field(..., min_length=1, max_length=100, description="Class name (e.g., 'Klass 1', '1-3A')")
    grade_group: GradeGroup = Field(..., description="Grade grouping (grades_1_3 or grades_4_6)")
    primary_teacher_id: UUID | None = Field(None, description="UUID of primary teacher (optional)")
    academic_year: str = Field(..., description="Academic year (e.g., '2025/2026')")

    @field_validator('academic_year')
    @classmethod
    def validate_academic_year(cls, v: str) -> str:
        """Validate academic year format."""
        if not v or len(v) < 7:
            raise ValueError("Academic year must be in format 'YYYY/YYYY'")
        parts = v.split('/')
        if len(parts) != 2:
            raise ValueError("Academic year must be in format 'YYYY/YYYY'")
        try:
            year1 = int(parts[0])
            year2 = int(parts[1])
            if year2 != year1 + 1:
                raise ValueError("Academic year must span consecutive years (e.g., '2025/2026')")
        except ValueError as e:
            raise ValueError(f"Invalid academic year format: {e}")
        return v

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "name": "Klass 1",
                    "grade_group": "grades_1_3",
                    "academic_year": "2025/2026"
                }
            ]
        }
    }


class SchoolClassUpdate(BaseModel):
    """Schema for updating a school class."""

    name: str | None = Field(None, min_length=1, max_length=100)
    grade_group: GradeGroup | None = None
    primary_teacher_id: UUID | None = None
    academic_year: str | None = None
    active: bool | None = None

    @field_validator('academic_year')
    @classmethod
    def validate_academic_year(cls, v: str | None) -> str | None:
        """Validate academic year format if provided."""
        if v is None:
            return v
        parts = v.split('/')
        if len(parts) != 2:
            raise ValueError("Academic year must be in format 'YYYY/YYYY'")
        try:
            year1 = int(parts[0])
            year2 = int(parts[1])
            if year2 != year1 + 1:
                raise ValueError("Academic year must span consecutive years")
        except ValueError as e:
            raise ValueError(f"Invalid academic year format: {e}")
        return v


class TeacherInfo(BaseModel):
    """Minimal staff info for embedding in class response."""

    id: UUID
    first_name: str
    last_name: str
    full_name: str

    model_config = {"from_attributes": True}


class SchoolClassResponse(BaseModel):
    """Schema for school class response."""

    id: UUID
    name: str
    grade_group: GradeGroup
    primary_teacher_id: UUID | None
    primary_teacher: TeacherInfo | None
    academic_year: str
    active: bool
    created_at: datetime
    student_count: int = Field(0, description="Number of active students in class")

    model_config = {"from_attributes": True}
