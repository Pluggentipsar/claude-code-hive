"""
FastAPI routes for staff management.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from datetime import datetime, timedelta

from app.database import get_db
from app.models import Staff, Absence, Schedule, Student
from app.models.staff import WorkHour
from app.schemas import (
    StaffCreate,
    StaffUpdate,
    StaffResponse,
    WorkHourCreate,
    WorkHourUpdate,
    WorkHourResponse,
    AbsenceCreate,
    AbsenceResponse,
)
from app.core import SchoolScheduler, SchedulingError

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

def _calculate_week_info(absence_date: datetime) -> tuple[int, int]:
    """
    Calculate week number and year from absence date.

    Args:
        absence_date: Date of the absence

    Returns:
        Tuple of (week_number, year)
    """
    # ISO week date - week 1 is the week with the first Thursday
    iso_calendar = absence_date.isocalendar()
    week_number = iso_calendar[1]
    year = iso_calendar[0]

    return week_number, year


@router.post("/{staff_id}/absences", response_model=AbsenceResponse, status_code=status.HTTP_201_CREATED)
async def create_absence(
    staff_id: UUID,
    absence_data: AbsenceCreate,
    auto_regenerate: bool = Query(
        True,
        description="Automatically regenerate affected schedules when absence is created"
    ),
    db: Session = Depends(get_db)
):
    """
    Register an absence for a staff member.

    Optionally triggers automatic schedule regeneration for the affected week.
    This ensures the schedule is updated to reflect the new absence.

    Args:
        staff_id: ID of the staff member
        absence_data: Absence details (date, time, reason)
        auto_regenerate: If True, regenerates schedules for affected weeks
        db: Database session

    Returns:
        Created absence record
    """
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

    # Auto-regenerate affected schedules if requested
    if auto_regenerate:
        week_number, year = _calculate_week_info(absence_data.absence_date)

        # Check if a schedule exists for this week
        existing_schedule = db.query(Schedule).filter(
            Schedule.week_number == week_number,
            Schedule.year == year
        ).first()

        if existing_schedule:
            try:
                # Fetch all data needed for regeneration
                students = db.query(Student).filter(Student.active.is_(True)).all()
                all_staff = db.query(Staff).filter(Staff.active.is_(True)).all()

                # Calculate week date range to get all absences
                year_start = datetime(year, 1, 1)
                days_to_monday = (7 - year_start.weekday()) % 7
                first_monday = year_start + timedelta(days=days_to_monday)
                week_start = first_monday + timedelta(weeks=week_number - 1)
                week_end = week_start + timedelta(days=7)

                # Get all absences for this week (including the one just created)
                absences = db.query(Absence).filter(
                    Absence.absence_date >= week_start,
                    Absence.absence_date < week_end
                ).all()

                # Regenerate schedule
                scheduler = SchoolScheduler(max_solve_time_seconds=60)
                new_schedule = scheduler.create_schedule(
                    students=students,
                    staff=all_staff,
                    week_number=week_number,
                    year=year,
                    absences=absences
                )

                # Delete old schedule and save new one
                db.delete(existing_schedule)
                db.flush()
                db.add(new_schedule)
                db.commit()

                print(f"[OK] Schedule regenerated for week {week_number}/{year} due to new absence")

            except SchedulingError as e:
                # Log error but don't fail the absence creation
                print(f"[WARNING] Could not regenerate schedule for week {week_number}/{year}: {str(e)}")
                # Rollback only the schedule changes, keep the absence
                db.rollback()
                db.add(absence)
                db.commit()
                db.refresh(absence)
            except Exception as e:
                # Log error but don't fail the absence creation
                print(f"[WARNING] Unexpected error regenerating schedule: {str(e)}")
                db.rollback()
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


# ============================================================================
# WORK HOUR MANAGEMENT
# ============================================================================

@router.post("/{staff_id}/work-hours", response_model=WorkHourResponse, status_code=status.HTTP_201_CREATED)
async def create_work_hour(
    staff_id: UUID,
    work_hour_data: WorkHourCreate,
    db: Session = Depends(get_db)
):
    """Create a work hour entry for a staff member."""
    # Verify staff exists
    staff = db.query(Staff).filter(Staff.id == staff_id).first()

    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Staff {staff_id} not found"
        )

    # Create work hour
    work_hour = WorkHour(
        staff_id=staff_id,
        **work_hour_data.model_dump()
    )

    db.add(work_hour)
    db.commit()
    db.refresh(work_hour)

    return work_hour


@router.get("/{staff_id}/work-hours", response_model=List[WorkHourResponse])
async def list_staff_work_hours(
    staff_id: UUID,
    db: Session = Depends(get_db)
):
    """List all work hours for a staff member."""
    # Verify staff exists
    staff = db.query(Staff).filter(Staff.id == staff_id).first()

    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Staff {staff_id} not found"
        )

    work_hours = db.query(WorkHour).filter(
        WorkHour.staff_id == staff_id
    ).order_by(
        WorkHour.week_number, WorkHour.weekday, WorkHour.start_time
    ).all()

    return work_hours


@router.put("/work-hours/{work_hour_id}", response_model=WorkHourResponse)
async def update_work_hour(
    work_hour_id: UUID,
    update_data: WorkHourUpdate,
    db: Session = Depends(get_db)
):
    """Update a work hour entry."""
    work_hour = db.query(WorkHour).filter(WorkHour.id == work_hour_id).first()

    if not work_hour:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Work hour {work_hour_id} not found"
        )

    # Update fields
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(work_hour, field, value)

    db.commit()
    db.refresh(work_hour)

    return work_hour


@router.delete("/work-hours/{work_hour_id}")
async def delete_work_hour(
    work_hour_id: UUID,
    db: Session = Depends(get_db)
):
    """Delete a work hour entry."""
    work_hour = db.query(WorkHour).filter(WorkHour.id == work_hour_id).first()

    if not work_hour:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Work hour {work_hour_id} not found"
        )

    db.delete(work_hour)
    db.commit()

    return {"message": "Work hour deleted successfully"}
