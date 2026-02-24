"""
FastAPI routes for staff management.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from datetime import datetime, timedelta, timezone

from app.database import get_db
from app.models import Staff, Absence, Schedule, Student
from app.models.staff import WorkHour
from app.models.user import User
from app.schemas import (
    StaffCreate,
    StaffUpdate,
    StaffResponse,
    WorkHourCreate,
    WorkHourUpdate,
    WorkHourResponse,
    AbsenceCreate,
    AbsenceResponse,
    BulkAbsenceCreate,
    BulkAbsenceResponse,
)
from datetime import date as date_type
from app.api.deps import get_current_user, require_admin

router = APIRouter()


# ============================================================================
# STAFF CRUD
# ============================================================================

@router.post("/", response_model=StaffResponse, status_code=status.HTTP_201_CREATED)
async def create_staff(
    staff_data: StaffCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
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
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
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


def _regenerate_week_schedule(db: Session, absence_date) -> bool:
    """
    No-op — scheduling is now manual via the week_schedules API.
    Kept as stub since absence creation code calls this.
    """
    return False


@router.post("/{staff_id}/absences", response_model=AbsenceResponse, status_code=status.HTTP_201_CREATED)
async def create_absence(
    staff_id: UUID,
    absence_data: AbsenceCreate,
    auto_regenerate: bool = Query(
        True,
        description="Automatically regenerate affected schedules when absence is created"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
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
        absence_date=datetime.combine(absence_data.absence_date, datetime.min.time(), tzinfo=timezone.utc),
        start_time=absence_data.start_time,
        end_time=absence_data.end_time,
        reason=absence_data.reason,
    )

    db.add(absence)
    db.commit()
    db.refresh(absence)

    # Auto-regenerate affected schedules if requested
    if auto_regenerate:
        _regenerate_week_schedule(db, absence_data.absence_date)

    return absence


@router.post("/{staff_id}/absences/bulk", response_model=BulkAbsenceResponse, status_code=status.HTTP_201_CREATED)
async def create_bulk_absences(
    staff_id: UUID,
    data: BulkAbsenceCreate,
    auto_regenerate: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Create absences for a date range (one per weekday by default).
    Skips weekends unless include_weekends is True.
    Skips dates that already have an absence for this staff member.
    Regenerates affected schedules once per week.
    """
    staff = db.query(Staff).filter(Staff.id == staff_id).first()
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Staff {staff_id} not found"
        )

    # Collect existing absence dates for this staff member in the range
    existing_absences = db.query(Absence.absence_date).filter(
        Absence.staff_id == staff_id,
        Absence.absence_date >= datetime.combine(data.start_date, datetime.min.time(), tzinfo=timezone.utc),
        Absence.absence_date <= datetime.combine(data.end_date, datetime.min.time(), tzinfo=timezone.utc),
    ).all()
    existing_dates = {a.absence_date.date() if hasattr(a.absence_date, 'date') else a.absence_date for a in existing_absences}

    created = []
    skipped_weekends = 0
    skipped_existing = 0
    affected_weeks = set()

    current = data.start_date
    one_day = timedelta(days=1)

    while current <= data.end_date:
        weekday = current.weekday()  # 0=Mon, 6=Sun

        # Skip weekends if not included
        if weekday >= 5 and not data.include_weekends:
            skipped_weekends += 1
            current += one_day
            continue

        # Skip if absence already exists
        if current in existing_dates:
            skipped_existing += 1
            current += one_day
            continue

        absence = Absence(
            staff_id=staff_id,
            absence_date=datetime.combine(current, datetime.min.time(), tzinfo=timezone.utc),
            start_time=data.start_time,
            end_time=data.end_time,
            reason=data.reason,
        )
        db.add(absence)
        created.append(absence)

        week_number, _ = _calculate_week_info(current)
        affected_weeks.add((current, week_number))

        current += one_day

    db.commit()
    for absence in created:
        db.refresh(absence)

    # Regenerate once per affected week
    regenerated_weeks = []
    if auto_regenerate:
        seen_weeks = set()
        for absence_date, week_num in affected_weeks:
            if week_num not in seen_weeks:
                seen_weeks.add(week_num)
                if _regenerate_week_schedule(db, absence_date):
                    regenerated_weeks.append(week_num)

    return BulkAbsenceResponse(
        created=created,
        count=len(created),
        skipped_weekends=skipped_weekends,
        skipped_existing=skipped_existing,
        regenerated_weeks=sorted(regenerated_weeks),
    )


@router.get("/{staff_id}/absences", response_model=List[AbsenceResponse])
async def list_staff_absences(
    staff_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
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
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
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
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
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
