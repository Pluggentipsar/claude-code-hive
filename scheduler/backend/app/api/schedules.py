"""
FastAPI routes for schedule management.

Handles schedule generation, retrieval, and modifications.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import uuid

from app.database import get_db
from app.models import Schedule, Student, Staff, Absence, SolverStatus
from app.schemas.schedule import (
    ScheduleCreate,
    ScheduleResponse,
    ScheduleDetailResponse,
    AssignmentResponse,
)
from app.core import SchoolScheduler, SchedulingError
from app.services import AIAdvisorService

router = APIRouter()


@router.post("/generate", response_model=ScheduleDetailResponse, status_code=status.HTTP_201_CREATED)
async def generate_schedule(
    schedule_data: ScheduleCreate,
    db: Session = Depends(get_db)
):
    """
    Generate a new optimized schedule for a given week.

    This endpoint:
    1. Fetches active students and staff
    2. Fetches absences for the week
    3. Runs OR-Tools constraint solver
    4. Saves the generated schedule to database

    Args:
        schedule_data: Week number and year
        db: Database session

    Returns:
        Generated schedule with all assignments
    """
    # Validate week number
    if not (1 <= schedule_data.week_number <= 53):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Week number must be between 1 and 53"
        )

    # Check if schedule already exists
    existing = db.query(Schedule).filter_by(
        week_number=schedule_data.week_number,
        year=schedule_data.year
    ).first()

    if existing and not schedule_data.force_regenerate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Schedule for week {schedule_data.week_number}/{schedule_data.year} already exists. Use force_regenerate=true to overwrite."
        )

    # Get active students
    students = db.query(Student).filter(Student.active.is_(True)).all()

    if not students:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active students found"
        )

    # Get active staff
    staff = db.query(Staff).filter(Staff.active.is_(True)).all()

    if not staff:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active staff found"
        )

    # Get absences for this week
    # Calculate week date range
    from datetime import timedelta
    year_start = datetime(schedule_data.year, 1, 1)
    days_to_monday = (7 - year_start.weekday()) % 7
    first_monday = year_start + timedelta(days=days_to_monday)
    week_start = first_monday + timedelta(weeks=schedule_data.week_number - 1)
    week_end = week_start + timedelta(days=7)

    absences = db.query(Absence).filter(
        Absence.absence_date >= week_start,
        Absence.absence_date < week_end
    ).all()

    # Generate schedule using OR-Tools
    try:
        scheduler = SchoolScheduler(max_solve_time_seconds=schedule_data.max_solve_time or 60)

        schedule = scheduler.create_schedule(
            students=students,
            staff=staff,
            week_number=schedule_data.week_number,
            year=schedule_data.year,
            absences=absences
        )

        # Delete existing schedule if force regenerate
        if existing:
            db.delete(existing)
            db.flush()

        # Save to database
        db.add(schedule)
        db.commit()
        db.refresh(schedule)

        return schedule

    except SchedulingError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate schedule: {str(e)}"
        )


@router.get("/{schedule_id}", response_model=ScheduleDetailResponse)
async def get_schedule(
    schedule_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    """
    Get a schedule by ID with all assignments.

    Args:
        schedule_id: UUID of the schedule
        db: Database session

    Returns:
        Schedule with assignments
    """
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Schedule {schedule_id} not found"
        )

    return schedule


@router.get("/week/{year}/{week_number}", response_model=ScheduleDetailResponse)
async def get_schedule_by_week(
    year: int,
    week_number: int,
    db: Session = Depends(get_db)
):
    """
    Get schedule for a specific week.

    Args:
        year: Year
        week_number: Week number (1-53)
        db: Database session

    Returns:
        Schedule for the week
    """
    schedule = db.query(Schedule).filter(
        Schedule.year == year,
        Schedule.week_number == week_number
    ).first()

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No schedule found for week {week_number}/{year}"
        )

    return schedule


@router.get("/", response_model=List[ScheduleResponse])
async def list_schedules(
    skip: int = 0,
    limit: int = 20,
    year: Optional[int] = None,
    published_only: bool = False,
    db: Session = Depends(get_db)
):
    """
    List all schedules with pagination.

    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        year: Filter by year
        published_only: Only return published schedules
        db: Database session

    Returns:
        List of schedules
    """
    query = db.query(Schedule)

    if year:
        query = query.filter(Schedule.year == year)

    if published_only:
        query = query.filter(Schedule.is_published.is_(True))

    schedules = query.order_by(Schedule.year.desc(), Schedule.week_number.desc()).offset(skip).limit(limit).all()

    return schedules


@router.put("/{schedule_id}/publish")
async def publish_schedule(
    schedule_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    """
    Publish a schedule (make it visible to users).

    Args:
        schedule_id: UUID of the schedule
        db: Database session

    Returns:
        Success message
    """
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Schedule {schedule_id} not found"
        )

    if not schedule.hard_constraints_met:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot publish schedule - hard constraints not met"
        )

    schedule.is_published = True
    db.commit()

    return {"message": "Schedule published successfully"}


@router.delete("/{schedule_id}")
async def delete_schedule(
    schedule_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    """
    Delete a schedule.

    Args:
        schedule_id: UUID of the schedule
        db: Database session

    Returns:
        Success message
    """
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Schedule {schedule_id} not found"
        )

    if schedule.is_published:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete published schedule. Unpublish first."
        )

    db.delete(schedule)
    db.commit()

    return {"message": "Schedule deleted successfully"}


@router.post("/{schedule_id}/ai-suggestions")
async def get_ai_suggestions(
    schedule_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    """
    Get AI-powered suggestions for improving the schedule.

    Args:
        schedule_id: UUID of the schedule
        db: Database session

    Returns:
        AI-generated suggestions
    """
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Schedule {schedule_id} not found"
        )

    try:
        ai_service = AIAdvisorService()

        # Detect conflicts (simplified - would need proper conflict detection)
        conflicts = []
        if not schedule.hard_constraints_met:
            conflicts.append({
                'id': 'hard_constraints',
                'type': 'CONSTRAINT_VIOLATION',
                'message': 'Hard constraints not satisfied'
            })

        # Get available staff
        staff = db.query(Staff).filter(Staff.active.is_(True)).all()

        # Get absences
        absences = []  # Would need to calculate for the week

        suggestions = ai_service.suggest_conflict_resolution(
            schedule=schedule,
            conflicts=conflicts,
            available_staff=staff,
            absences=absences
        )

        return {"suggestions": suggestions}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate AI suggestions: {str(e)}"
        )


@router.get("/{schedule_id}/summary")
async def get_schedule_summary(
    schedule_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    """
    Get an AI-generated human-readable summary of the schedule.

    Args:
        schedule_id: UUID of the schedule
        db: Database session

    Returns:
        Summary text
    """
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Schedule {schedule_id} not found"
        )

    try:
        ai_service = AIAdvisorService()

        students = db.query(Student).filter(Student.active.is_(True)).all()
        staff = db.query(Staff).filter(Staff.active.is_(True)).all()

        summary = ai_service.generate_weekly_summary(
            schedule=schedule,
            students=students,
            staff=staff
        )

        return {"summary": summary}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate summary: {str(e)}"
        )
