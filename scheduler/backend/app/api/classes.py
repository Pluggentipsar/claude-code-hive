"""
API endpoints for SchoolClass (Klass) management.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List

from app.database import get_db
from app.models.school_class import SchoolClass
from app.models.staff import Staff
from app.models.user import User
from app.schemas.school_class import (
    SchoolClassCreate,
    SchoolClassUpdate,
    SchoolClassResponse,
)
from app.api.deps import get_current_user, require_admin

router = APIRouter()


@router.post("/", response_model=SchoolClassResponse, status_code=201)
async def create_class(
    class_data: SchoolClassCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Create a new school class.

    Validates that primary_teacher_id exists if provided.
    """
    # Validate primary teacher if provided
    if class_data.primary_teacher_id:
        teacher = db.query(Staff).filter(Staff.id == class_data.primary_teacher_id).first()
        if not teacher:
            raise HTTPException(status_code=404, detail="Primary teacher not found")

    # Create class
    new_class = SchoolClass(
        name=class_data.name,
        grade_group=class_data.grade_group,
        primary_teacher_id=class_data.primary_teacher_id,
        academic_year=class_data.academic_year,
        active=True,
    )

    db.add(new_class)
    db.commit()
    db.refresh(new_class)

    # Count students
    student_count = len(new_class.students)

    # Build response
    response_data = SchoolClassResponse.model_validate(new_class)
    response_data.student_count = student_count

    return response_data


@router.get("/", response_model=List[SchoolClassResponse])
async def list_classes(
    active_only: bool = Query(True, description="Filter to active classes only"),
    academic_year: str | None = Query(None, description="Filter by academic year"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all school classes with optional filters.

    Returns:
        List of school classes with student counts.
    """
    query = db.query(SchoolClass)

    # Apply filters
    if active_only:
        query = query.filter(SchoolClass.active.is_(True))

    if academic_year:
        query = query.filter(SchoolClass.academic_year == academic_year)

    # Order by grade group and name
    query = query.order_by(SchoolClass.grade_group, SchoolClass.name)

    classes = query.all()

    # Build responses with student counts
    return [
        SchoolClassResponse.model_validate(school_class).model_copy(
            update={"student_count": len(school_class.students)}
        )
        for school_class in classes
    ]


@router.get("/{class_id}", response_model=SchoolClassResponse)
async def get_class(
    class_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get a single school class by ID.

    Args:
        class_id: UUID of the class

    Returns:
        School class details with student count

    Raises:
        404: Class not found
    """
    school_class = db.query(SchoolClass).filter(SchoolClass.id == class_id).first()

    if not school_class:
        raise HTTPException(status_code=404, detail="Class not found")

    # Build response
    response_data = SchoolClassResponse.model_validate(school_class)
    response_data.student_count = len(school_class.students)

    return response_data


@router.put("/{class_id}", response_model=SchoolClassResponse)
async def update_class(
    class_id: UUID,
    update_data: SchoolClassUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Update a school class.

    Args:
        class_id: UUID of the class
        update_data: Fields to update

    Returns:
        Updated class

    Raises:
        404: Class not found
        404: Primary teacher not found (if provided)
    """
    school_class = db.query(SchoolClass).filter(SchoolClass.id == class_id).first()

    if not school_class:
        raise HTTPException(status_code=404, detail="Class not found")

    # Validate primary teacher if being updated
    if update_data.primary_teacher_id is not None:
        teacher = db.query(Staff).filter(Staff.id == update_data.primary_teacher_id).first()
        if not teacher:
            raise HTTPException(status_code=404, detail="Primary teacher not found")

    # Update fields
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(school_class, field, value)

    db.commit()
    db.refresh(school_class)

    # Build response
    response_data = SchoolClassResponse.model_validate(school_class)
    response_data.student_count = len(school_class.students)

    return response_data


@router.delete("/{class_id}", status_code=204)
async def delete_class(
    class_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Soft delete a school class (set active=False).

    Note: Students in this class are not deleted, only dissociated.

    Args:
        class_id: UUID of the class

    Raises:
        404: Class not found
    """
    school_class = db.query(SchoolClass).filter(SchoolClass.id == class_id).first()

    if not school_class:
        raise HTTPException(status_code=404, detail="Class not found")

    # Soft delete
    school_class.active = False
    db.commit()

    return None
