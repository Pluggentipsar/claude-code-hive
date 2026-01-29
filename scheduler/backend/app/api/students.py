"""
FastAPI routes for student management.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.database import get_db
from app.models import Student
from app.models.student import CareTime
from app.schemas import (
    StudentCreate, StudentUpdate, StudentResponse,
    CareTimeCreate, CareTimeUpdate, CareTimeResponse
)

router = APIRouter()


@router.post("/", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
async def create_student(
    student_data: StudentCreate,
    db: Session = Depends(get_db)
):
    """Create a new student."""
    # Check if student with this personal number already exists
    existing = db.query(Student).filter_by(personal_number=student_data.personal_number).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Student with personal number {student_data.personal_number} already exists"
        )

    student = Student(**student_data.model_dump())
    db.add(student)
    db.commit()
    db.refresh(student)

    return student


@router.get("/", response_model=List[StudentResponse])
async def list_students(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """List all students."""
    query = db.query(Student)

    if active_only:
        query = query.filter(Student.active == True)

    students = query.order_by(Student.last_name, Student.first_name).offset(skip).limit(limit).all()

    return students


@router.get("/{student_id}", response_model=StudentResponse)
async def get_student(
    student_id: UUID,
    db: Session = Depends(get_db)
):
    """Get a student by ID."""
    student = db.query(Student).filter(Student.id == student_id).first()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student {student_id} not found"
        )

    return student


@router.put("/{student_id}", response_model=StudentResponse)
async def update_student(
    student_id: UUID,
    student_data: StudentUpdate,
    db: Session = Depends(get_db)
):
    """Update a student."""
    student = db.query(Student).filter(Student.id == student_id).first()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student {student_id} not found"
        )

    # Update fields
    update_data = student_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(student, field, value)

    db.commit()
    db.refresh(student)

    return student


@router.delete("/{student_id}")
async def delete_student(
    student_id: UUID,
    db: Session = Depends(get_db)
):
    """Soft delete a student (set active=False)."""
    student = db.query(Student).filter(Student.id == student_id).first()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student {student_id} not found"
        )

    student.active = False
    db.commit()

    return {"message": "Student deactivated successfully"}


# ============================================================================
# CARE TIME MANAGEMENT
# ============================================================================

@router.post("/{student_id}/care-times", response_model=CareTimeResponse, status_code=status.HTTP_201_CREATED)
async def create_care_time(
    student_id: UUID,
    care_time_data: CareTimeCreate,
    db: Session = Depends(get_db)
):
    """Create a care time for a student."""
    # Verify student exists
    student = db.query(Student).filter(Student.id == student_id).first()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student {student_id} not found"
        )

    # Create care time
    care_time = CareTime(
        student_id=student_id,
        **care_time_data.model_dump()
    )

    db.add(care_time)
    db.commit()
    db.refresh(care_time)

    return care_time


@router.get("/{student_id}/care-times", response_model=List[CareTimeResponse])
async def list_student_care_times(
    student_id: UUID,
    db: Session = Depends(get_db)
):
    """List all care times for a student."""
    # Verify student exists
    student = db.query(Student).filter(Student.id == student_id).first()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student {student_id} not found"
        )

    care_times = db.query(CareTime).filter(
        CareTime.student_id == student_id
    ).order_by(
        CareTime.weekday, CareTime.start_time
    ).all()

    return care_times


@router.put("/care-times/{care_time_id}", response_model=CareTimeResponse)
async def update_care_time(
    care_time_id: UUID,
    update_data: CareTimeUpdate,
    db: Session = Depends(get_db)
):
    """Update a care time."""
    care_time = db.query(CareTime).filter(CareTime.id == care_time_id).first()

    if not care_time:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Care time {care_time_id} not found"
        )

    # Update fields
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(care_time, field, value)

    db.commit()
    db.refresh(care_time)

    return care_time


@router.delete("/care-times/{care_time_id}")
async def delete_care_time(
    care_time_id: UUID,
    db: Session = Depends(get_db)
):
    """Delete a care time."""
    care_time = db.query(CareTime).filter(CareTime.id == care_time_id).first()

    if not care_time:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Care time {care_time_id} not found"
        )

    db.delete(care_time)
    db.commit()

    return {"message": "Care time deleted successfully"}
