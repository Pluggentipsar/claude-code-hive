"""
Week schedule API — the "Digital Excel" endpoints.
"""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import (
    Student, Staff, SchoolClass,
    WeekSchedule, StudentDay, DayAssignment, StaffShift,
    WeekStatus,
)
from app.models.student import CareTime
from app.models.staff import WorkHour, StaffRole, StaffGradeGroup
from app.schemas.week_schedule import (
    WeekScheduleCreate, WeekScheduleCopy, WeekScheduleUpdate, WeekScheduleResponse,
    StudentDayCreate, StudentDayUpdate, StudentDayResponse,
    DayAssignmentCreate, DayAssignmentUpdate, DayAssignmentResponse,
    StaffShiftCreate, StaffShiftUpdate, StaffShiftResponse,
    DayDataResponse, WarningsResponse,
)
from app.services.schedule_validator import validate_day, validate_week

router = APIRouter()


# ============================================================
# Week schedule CRUD
# ============================================================

@router.post("/weeks/", response_model=WeekScheduleResponse, status_code=201)
def create_week(data: WeekScheduleCreate, db: Session = Depends(get_db)):
    """Create a new week schedule, auto-populating from student/staff defaults."""
    # Check uniqueness
    existing = db.query(WeekSchedule).filter(
        WeekSchedule.year == data.year, WeekSchedule.week_number == data.week_number
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Veckoschema finns redan för denna vecka")

    ws = WeekSchedule(
        year=data.year,
        week_number=data.week_number,
        notes=data.notes,
    )
    db.add(ws)
    db.flush()

    # Auto-populate student_days from student defaults
    _populate_student_days(db, ws)
    # Auto-populate staff_shifts from staff defaults
    _populate_staff_shifts(db, ws)
    db.flush()
    # Auto-assign FM/EM staff based on grade group and workload balance
    _auto_assign_staff(db, ws)

    db.commit()
    db.refresh(ws)
    return ws


@router.post("/weeks/{week_id}/copy", response_model=WeekScheduleResponse, status_code=201)
def copy_week(week_id: UUID, data: WeekScheduleCopy, db: Session = Depends(get_db)):
    """Copy a week schedule to a new target week."""
    source = db.query(WeekSchedule).get(week_id)
    if not source:
        raise HTTPException(status_code=404, detail="Källvecka hittades inte")

    existing = db.query(WeekSchedule).filter(
        WeekSchedule.year == data.target_year,
        WeekSchedule.week_number == data.target_week,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Målvecka finns redan")

    new_ws = WeekSchedule(
        year=data.target_year,
        week_number=data.target_week,
        copied_from_id=source.id,
    )
    db.add(new_ws)
    db.flush()

    # Copy student_days
    for sd in source.student_days:
        db.add(StudentDay(
            week_schedule_id=new_ws.id,
            student_id=sd.student_id,
            weekday=sd.weekday,
            arrival_time=sd.arrival_time,
            departure_time=sd.departure_time,
            fm_staff_id=sd.fm_staff_id,
            em_staff_id=sd.em_staff_id,
            notes=sd.notes,
            absent_type=sd.absent_type or "none",
        ))

    # Copy day_assignments
    for da in source.day_assignments:
        db.add(DayAssignment(
            week_schedule_id=new_ws.id,
            student_id=da.student_id,
            staff_id=da.staff_id,
            weekday=da.weekday,
            start_time=da.start_time,
            end_time=da.end_time,
            role=da.role,
            notes=da.notes,
        ))

    # Copy staff_shifts
    for ss in source.staff_shifts:
        db.add(StaffShift(
            week_schedule_id=new_ws.id,
            staff_id=ss.staff_id,
            weekday=ss.weekday,
            start_time=ss.start_time,
            end_time=ss.end_time,
            break_minutes=ss.break_minutes,
            notes=ss.notes,
        ))

    db.commit()
    db.refresh(new_ws)
    return new_ws


@router.delete("/weeks/{week_id}", status_code=204)
def delete_week(week_id: UUID, db: Session = Depends(get_db)):
    """Delete a week schedule and all its data."""
    ws = db.query(WeekSchedule).get(week_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Veckoschema hittades inte")
    db.delete(ws)
    db.commit()


@router.put("/weeks/{week_id}", response_model=WeekScheduleResponse)
def update_week(week_id: UUID, data: WeekScheduleUpdate, db: Session = Depends(get_db)):
    """Update week schedule status or notes."""
    ws = db.query(WeekSchedule).get(week_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Veckoschema hittades inte")

    if data.status is not None:
        ws.status = data.status
    if data.notes is not None:
        ws.notes = data.notes

    db.commit()
    db.refresh(ws)
    return ws


# ============================================================
# Day data (aggregated)
# ============================================================

@router.get("/weeks/{week_id}/days/{weekday}", response_model=DayDataResponse)
def get_day_data(week_id: UUID, weekday: int, db: Session = Depends(get_db)):
    """Get all data for a specific day: student_days, staff_shifts, day_assignments, warnings."""
    if weekday < 0 or weekday > 4:
        raise HTTPException(status_code=400, detail="Veckodag måste vara 0-4")

    ws = db.query(WeekSchedule).get(week_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Veckoschema hittades inte")

    student_days = (
        db.query(StudentDay)
        .filter(StudentDay.week_schedule_id == week_id, StudentDay.weekday == weekday)
        .all()
    )
    staff_shifts = (
        db.query(StaffShift)
        .filter(StaffShift.week_schedule_id == week_id, StaffShift.weekday == weekday)
        .all()
    )
    day_assignments = (
        db.query(DayAssignment)
        .filter(DayAssignment.week_schedule_id == week_id, DayAssignment.weekday == weekday)
        .all()
    )

    warnings = validate_day(db, week_id, weekday)

    return DayDataResponse(
        weekday=weekday,
        student_days=[_enrich_student_day(sd, db) for sd in student_days],
        staff_shifts=[_enrich_staff_shift(ss, db) for ss in staff_shifts],
        day_assignments=[_enrich_day_assignment(da, db) for da in day_assignments],
        warnings=warnings,
    )


# ============================================================
# Student days
# ============================================================

@router.post("/weeks/{week_id}/student-days", response_model=StudentDayResponse, status_code=201)
def create_student_day(week_id: UUID, data: StudentDayCreate, db: Session = Depends(get_db)):
    ws = db.query(WeekSchedule).get(week_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Veckoschema hittades inte")

    sd = StudentDay(
        week_schedule_id=week_id,
        student_id=data.student_id,
        weekday=data.weekday,
        arrival_time=data.arrival_time,
        departure_time=data.departure_time,
        fm_staff_id=data.fm_staff_id,
        em_staff_id=data.em_staff_id,
        notes=data.notes,
    )
    db.add(sd)
    db.commit()
    db.refresh(sd)
    return _enrich_student_day(sd, db)


@router.put("/weeks/{week_id}/student-days/{sd_id}", response_model=StudentDayResponse)
def update_student_day(week_id: UUID, sd_id: UUID, data: StudentDayUpdate, db: Session = Depends(get_db)):
    sd = db.query(StudentDay).filter(
        StudentDay.id == sd_id, StudentDay.week_schedule_id == week_id
    ).first()
    if not sd:
        raise HTTPException(status_code=404, detail="Elevdag hittades inte")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(sd, key, value)

    db.commit()
    db.refresh(sd)
    return _enrich_student_day(sd, db)


@router.delete("/weeks/{week_id}/student-days/{sd_id}", status_code=204)
def delete_student_day(week_id: UUID, sd_id: UUID, db: Session = Depends(get_db)):
    sd = db.query(StudentDay).filter(
        StudentDay.id == sd_id, StudentDay.week_schedule_id == week_id
    ).first()
    if not sd:
        raise HTTPException(status_code=404, detail="Elevdag hittades inte")
    db.delete(sd)
    db.commit()


# ============================================================
# Day assignments (special needs)
# ============================================================

@router.post("/weeks/{week_id}/day-assignments", response_model=DayAssignmentResponse, status_code=201)
def create_day_assignment(week_id: UUID, data: DayAssignmentCreate, db: Session = Depends(get_db)):
    ws = db.query(WeekSchedule).get(week_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Veckoschema hittades inte")

    da = DayAssignment(
        week_schedule_id=week_id,
        student_id=data.student_id,
        staff_id=data.staff_id,
        weekday=data.weekday,
        start_time=data.start_time,
        end_time=data.end_time,
        role=data.role,
        notes=data.notes,
    )
    db.add(da)
    db.commit()
    db.refresh(da)
    return _enrich_day_assignment(da, db)


@router.put("/weeks/{week_id}/day-assignments/{da_id}", response_model=DayAssignmentResponse)
def update_day_assignment(week_id: UUID, da_id: UUID, data: DayAssignmentUpdate, db: Session = Depends(get_db)):
    da = db.query(DayAssignment).filter(
        DayAssignment.id == da_id, DayAssignment.week_schedule_id == week_id
    ).first()
    if not da:
        raise HTTPException(status_code=404, detail="Tilldelning hittades inte")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(da, key, value)

    db.commit()
    db.refresh(da)
    return _enrich_day_assignment(da, db)


@router.delete("/weeks/{week_id}/day-assignments/{da_id}", status_code=204)
def delete_day_assignment(week_id: UUID, da_id: UUID, db: Session = Depends(get_db)):
    da = db.query(DayAssignment).filter(
        DayAssignment.id == da_id, DayAssignment.week_schedule_id == week_id
    ).first()
    if not da:
        raise HTTPException(status_code=404, detail="Tilldelning hittades inte")
    db.delete(da)
    db.commit()


# ============================================================
# Staff shifts
# ============================================================

@router.post("/weeks/{week_id}/shifts", response_model=StaffShiftResponse, status_code=201)
def create_staff_shift(week_id: UUID, data: StaffShiftCreate, db: Session = Depends(get_db)):
    ws = db.query(WeekSchedule).get(week_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Veckoschema hittades inte")

    ss = StaffShift(
        week_schedule_id=week_id,
        staff_id=data.staff_id,
        weekday=data.weekday,
        start_time=data.start_time,
        end_time=data.end_time,
        break_minutes=data.break_minutes,
        notes=data.notes,
    )
    db.add(ss)
    db.commit()
    db.refresh(ss)
    return _enrich_staff_shift(ss, db)


@router.put("/weeks/{week_id}/shifts/{shift_id}", response_model=StaffShiftResponse)
def update_staff_shift(week_id: UUID, shift_id: UUID, data: StaffShiftUpdate, db: Session = Depends(get_db)):
    ss = db.query(StaffShift).filter(
        StaffShift.id == shift_id, StaffShift.week_schedule_id == week_id
    ).first()
    if not ss:
        raise HTTPException(status_code=404, detail="Arbetspass hittades inte")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(ss, key, value)

    db.commit()
    db.refresh(ss)
    return _enrich_staff_shift(ss, db)


@router.delete("/weeks/{week_id}/shifts/{shift_id}", status_code=204)
def delete_staff_shift(week_id: UUID, shift_id: UUID, db: Session = Depends(get_db)):
    ss = db.query(StaffShift).filter(
        StaffShift.id == shift_id, StaffShift.week_schedule_id == week_id
    ).first()
    if not ss:
        raise HTTPException(status_code=404, detail="Arbetspass hittades inte")
    db.delete(ss)
    db.commit()


# ============================================================
# Warnings / Validation
# ============================================================

@router.get("/weeks/{week_id}/warnings", response_model=WarningsResponse)
def get_warnings(week_id: UUID, db: Session = Depends(get_db)):
    """Get all warnings for a week schedule."""
    ws = db.query(WeekSchedule).get(week_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Veckoschema hittades inte")

    warnings = validate_week(db, week_id)

    summary = {
        "conflicts": sum(1 for w in warnings if w.type == "conflict"),
        "gaps": sum(1 for w in warnings if w.type == "gap"),
        "workload_issues": sum(1 for w in warnings if w.type == "workload"),
        "absence_issues": sum(1 for w in warnings if w.type == "absence"),
    }

    return WarningsResponse(warnings=warnings, summary=summary)


# ============================================================
# Lookup by year/week (MUST be after all /weeks/{week_id}/* routes)
# ============================================================

@router.get("/weeks/{year}/{week}", response_model=WeekScheduleResponse)
def get_week(year: int, week: int, db: Session = Depends(get_db)):
    """Get a week schedule by year and week number."""
    ws = db.query(WeekSchedule).filter(
        WeekSchedule.year == year, WeekSchedule.week_number == week
    ).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Veckoschema hittades inte")
    return ws


# ============================================================
# Helpers
# ============================================================

def _populate_student_days(db: Session, ws: WeekSchedule):
    """Pre-populate student_days for ALL active students, using CareTime records."""
    students = db.query(Student).filter(Student.active == True).all()  # noqa: E712

    # Build a lookup: (student_id, weekday) -> CareTime
    care_times = db.query(CareTime).all()
    ct_map: dict[tuple, CareTime] = {}
    for ct in care_times:
        key = (str(ct.student_id), ct.weekday)
        ct_map[key] = ct

    for student in students:
        for weekday in range(5):
            ct = ct_map.get((str(student.id), weekday))
            arrival = ct.start_time if ct else None
            departure = ct.end_time if ct else None
            db.add(StudentDay(
                week_schedule_id=ws.id,
                student_id=student.id,
                weekday=weekday,
                arrival_time=arrival,
                departure_time=departure,
            ))


def _populate_staff_shifts(db: Session, ws: WeekSchedule):
    """Pre-populate staff_shifts from WorkHour records."""
    staff_members = db.query(Staff).filter(Staff.active == True).all()  # noqa: E712

    # Build a lookup: (staff_id, weekday) -> WorkHour
    work_hours = db.query(WorkHour).all()
    wh_map: dict[tuple, WorkHour] = {}
    for wh in work_hours:
        key = (str(wh.staff_id), wh.weekday)
        # week_number 0 means "both weeks"; otherwise prefer week_number 0
        if key not in wh_map or wh.week_number == 0:
            wh_map[key] = wh

    for staff in staff_members:
        for weekday in range(5):
            wh = wh_map.get((str(staff.id), weekday))
            if wh:
                # Calculate break minutes from lunch times
                break_mins = 30  # default
                if wh.lunch_start and wh.lunch_end:
                    lh, lm = int(wh.lunch_start.split(":")[0]), int(wh.lunch_start.split(":")[1])
                    eh, em = int(wh.lunch_end.split(":")[0]), int(wh.lunch_end.split(":")[1])
                    break_mins = (eh * 60 + em) - (lh * 60 + lm)

                db.add(StaffShift(
                    week_schedule_id=ws.id,
                    staff_id=staff.id,
                    weekday=weekday,
                    start_time=wh.start_time,
                    end_time=wh.end_time,
                    break_minutes=break_mins,
                ))


def _auto_assign_staff(db: Session, ws: WeekSchedule):
    """Auto-assign FM/EM staff to students based on grade group and workload balance.

    FM = students arriving before 08:30 (morning care).
    EM = students departing after 13:30 (afternoon care).

    Only fritidspedagoger and elevassistenter are assigned (not teachers).
    Prefers staff in the same grade group as the student; falls back to all available.
    Balances student count across staff within each pool.
    """
    # Pre-load all students for grade info
    all_students = {
        str(s.id): s
        for s in db.query(Student).filter(Student.active == True).all()  # noqa: E712
    }

    for weekday in range(5):
        student_days = (
            db.query(StudentDay)
            .filter(StudentDay.week_schedule_id == ws.id, StudentDay.weekday == weekday)
            .all()
        )
        staff_shifts = (
            db.query(StaffShift)
            .filter(StaffShift.week_schedule_id == ws.id, StaffShift.weekday == weekday)
            .all()
        )

        # Build staff info for non-teacher staff with shifts this day
        staff_info: dict[str, tuple] = {}  # staff_id -> (Staff, StaffShift)
        for ss in staff_shifts:
            staff = db.query(Staff).get(ss.staff_id)
            if staff and staff.role != StaffRole.TEACHER:
                staff_info[str(staff.id)] = (staff, ss)

        # FM-available: staff whose shift starts before 08:30
        fm_available = [
            (s, ss) for s, ss in staff_info.values()
            if ss.start_time and ss.start_time < "08:30"
        ]
        # EM-available: staff whose shift ends after 13:30
        em_available = [
            (s, ss) for s, ss in staff_info.values()
            if ss.end_time and ss.end_time > "13:30"
        ]

        # Students needing FM/EM
        fm_needs = [
            (sd, all_students.get(str(sd.student_id)))
            for sd in student_days
            if sd.arrival_time and sd.arrival_time < "08:30"
        ]
        em_needs = [
            (sd, all_students.get(str(sd.student_id)))
            for sd in student_days
            if sd.departure_time and sd.departure_time > "13:30"
        ]

        # Assign with grade-group preference and load balancing
        _balanced_assign(fm_needs, fm_available, "fm_staff_id")
        _balanced_assign(em_needs, em_available, "em_staff_id")

    db.flush()


def _balanced_assign(
    student_needs: list[tuple],  # [(StudentDay, Student), ...]
    available_staff: list[tuple],  # [(Staff, StaffShift), ...]
    field: str,  # 'fm_staff_id' or 'em_staff_id'
):
    """Assign staff to students, matching grade group and balancing workload."""
    if not available_staff or not student_needs:
        return

    # Split staff by grade group (None = works with both → appears in both pools)
    low_staff = [
        pair for pair in available_staff
        if pair[0].grade_group in (StaffGradeGroup.GRADES_1_3, None)
    ]
    high_staff = [
        pair for pair in available_staff
        if pair[0].grade_group in (StaffGradeGroup.GRADES_4_6, None)
    ]

    # Shared assignment counter for load balancing
    counts: dict[str, int] = {str(s.id): 0 for s, _ in available_staff}

    for sd, student in student_needs:
        if not student:
            continue

        grade = student.grade or 99
        pool = low_staff if grade <= 3 else high_staff
        if not pool:
            pool = available_staff  # fallback if no matching grade group

        # Pick the least-loaded staff member from the pool
        best_staff, _ = min(pool, key=lambda pair: counts.get(str(pair[0].id), 0))
        setattr(sd, field, best_staff.id)
        counts[str(best_staff.id)] = counts.get(str(best_staff.id), 0) + 1


def _enrich_student_day(sd: StudentDay, db: Session) -> StudentDayResponse:
    """Build a StudentDayResponse with inline names."""
    student = db.query(Student).get(sd.student_id)
    school_class = db.query(SchoolClass).get(student.class_id) if student and student.class_id else None
    fm_staff = db.query(Staff).get(sd.fm_staff_id) if sd.fm_staff_id else None
    em_staff = db.query(Staff).get(sd.em_staff_id) if sd.em_staff_id else None

    return StudentDayResponse(
        id=sd.id,
        week_schedule_id=sd.week_schedule_id,
        student_id=sd.student_id,
        weekday=sd.weekday,
        arrival_time=sd.arrival_time,
        departure_time=sd.departure_time,
        fm_staff_id=sd.fm_staff_id,
        em_staff_id=sd.em_staff_id,
        notes=sd.notes,
        absent_type=sd.absent_type or "none",
        student_name=student.full_name if student else None,
        class_name=school_class.name if school_class else None,
        class_id=school_class.id if school_class else None,
        grade=student.grade if student else None,
        has_care_needs=student.has_care_needs if student else None,
        fm_staff_name=fm_staff.full_name if fm_staff else None,
        em_staff_name=em_staff.full_name if em_staff else None,
    )


def _enrich_staff_shift(ss: StaffShift, db: Session) -> StaffShiftResponse:
    """Build a StaffShiftResponse with inline names."""
    staff = db.query(Staff).get(ss.staff_id)
    return StaffShiftResponse(
        id=ss.id,
        week_schedule_id=ss.week_schedule_id,
        staff_id=ss.staff_id,
        weekday=ss.weekday,
        start_time=ss.start_time,
        end_time=ss.end_time,
        break_minutes=ss.break_minutes,
        notes=ss.notes,
        staff_name=staff.full_name if staff else None,
    )


def _enrich_day_assignment(da: DayAssignment, db: Session) -> DayAssignmentResponse:
    """Build a DayAssignmentResponse with inline names."""
    student = db.query(Student).get(da.student_id)
    staff = db.query(Staff).get(da.staff_id)
    return DayAssignmentResponse(
        id=da.id,
        week_schedule_id=da.week_schedule_id,
        student_id=da.student_id,
        staff_id=da.staff_id,
        weekday=da.weekday,
        start_time=da.start_time,
        end_time=da.end_time,
        role=da.role,
        notes=da.notes,
        student_name=student.full_name if student else None,
        staff_name=staff.full_name if staff else None,
    )
