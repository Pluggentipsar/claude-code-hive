"""
FastAPI routes for staff management.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from datetime import datetime

from app.database import get_db
from app.models import Staff, Absence
from app.schemas import (
    StaffCreate,
    StaffUpdate,
    StaffResponse,
    AbsenceCreate,
    AbsenceResponse,
)

router = APIRouter()


# ============================================================================
# STAFF CRUD
# ============================================================================

@router.post("/", response_model=StaffResponse, status_code=status.HTTP_201_CREATED)
async def create_staff(
    staff_data: StaffCreate,
    db: Session = Depends(get_db)
):
    """Create a new staff member."""
    # Check if staff with this personal number already exists
    existing = db.query(Staff).filter_by(personal_number=staff_data.personal_number).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Staff with personal number {staff_data.personal_number} already exists"
        )

    staff = Staff(
        **staff_data.model_dump(),
        employment_start=datetime.now()
    )
    db.add(staff)
    db.commit()
    db.refresh(staff)

    return staff


@router.get("/", response_model=List[StaffResponse])
async def list_staff(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """List all staff members."""
    query = db.query(Staff)

    if active_only:
        query = query.filter(Staff.active == True)

    staff = query.order_by(Staff.last_name, Staff.first_name).offset(skip).limit(limit).all()

    return staff


@router.get("/{staff_id}", response_model=StaffResponse)
async def get_staff(
    staff_id: UUID,
    db: Session = Depends(get_db)
):
    """Get a staff member by ID."""
    staff = db.query(Staff).filter(Staff.id == staff_id).first()

    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Staff {staff_id} not found"
        )

    return staff


@router.put("/{staff_id}", response_model=StaffResponse)
async def update_staff(
    staff_id: UUID,
    staff_data: StaffUpdate,
    db: Session = Depends(get_db)
):
    """Update a staff member."""
    staff = db.query(Staff).filter(Staff.id == staff_id).first()

    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Staff {staff_id} not found"
        )

    # Update fields
    update_data = staff_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(staff, field, value)

    db.commit()
    db.refresh(staff)

    return staff


@router.delete("/{staff_id}")
async def delete_staff(
    staff_id: UUID,
    db: Session = Depends(get_db)
):
    """Soft delete a staff member (set active=False)."""
    staff = db.query(Staff).filter(Staff.id == staff_id).first()

    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Staff {staff_id} not found"
        )

    staff.active = False
    db.commit()

    return {"message": "Staff deactivated successfully"}


# ============================================================================
# ABSENCE MANAGEMENT
# ============================================================================

@router.post("/{staff_id}/absences", response_model=AbsenceResponse, status_code=status.HTTP_201_CREATED)
async def create_absence(
    staff_id: UUID,
    absence_data: AbsenceCreate,
    db: Session = Depends(get_db)
):
    """Register an absence for a staff member."""
    # Verify staff exists
    staff = db.query(Staff).filter(Staff.id == staff_id).first()

    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Staff {staff_id} not found"
        )

    # Create absence
    absence = Absence(
        staff_id=staff_id,
        absence_date=datetime.combine(absence_data.absence_date, datetime.min.time()),
        start_time=absence_data.start_time,
        end_time=absence_data.end_time,
        reason=absence_data.reason,
    )

    db.add(absence)
    db.commit()
    db.refresh(absence)

    return absence


@router.get("/{staff_id}/absences", response_model=List[AbsenceResponse])
async def list_staff_absences(
    staff_id: UUID,
    db: Session = Depends(get_db)
):
    """List all absences for a staff member."""
    # Verify staff exists
    staff = db.query(Staff).filter(Staff.id == staff_id).first()

    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Staff {staff_id} not found"
        )

    absences = db.query(Absence).filter(Absence.staff_id == staff_id).order_by(
        Absence.absence_date.desc()
    ).all()

    return absences


@router.delete("/absences/{absence_id}")
async def delete_absence(
    absence_id: UUID,
    db: Session = Depends(get_db)
):
    """Delete an absence record."""
    absence = db.query(Absence).filter(Absence.id == absence_id).first()

    if not absence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Absence {absence_id} not found"
        )

    db.delete(absence)
    db.commit()

    return {"message": "Absence deleted successfully"}
