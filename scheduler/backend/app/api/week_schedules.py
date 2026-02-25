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
from app.services.absence_impact import compute_absence_impact
from app.services.vulnerability_check import check_vulnerabilities
from app.services.hourly_coverage import compute_coverage_timeline
from app.services.vulnerability_map import compute_vulnerability_map
from app.services.staff_wellbeing import compute_staff_wellbeing

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
        "vulnerability_issues": sum(1 for w in warnings if w.type == "vulnerability"),
    }

    return WarningsResponse(warnings=warnings, summary=summary)


# ============================================================
# Auto-assign (re-run smart matching for a specific day)
# ============================================================

@router.post("/weeks/{week_id}/days/{weekday}/auto-assign", response_model=DayDataResponse)
def auto_assign_day(week_id: UUID, weekday: int, db: Session = Depends(get_db)):
    """Re-run smart auto-assignment for a specific day, clearing existing FM/EM assignments first."""
    if weekday < 0 or weekday > 4:
        raise HTTPException(status_code=400, detail="Veckodag måste vara 0-4")

    ws = db.query(WeekSchedule).get(week_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Veckoschema hittades inte")

    # Clear existing FM/EM assignments for this day
    student_days = (
        db.query(StudentDay)
        .filter(StudentDay.week_schedule_id == week_id, StudentDay.weekday == weekday)
        .all()
    )
    for sd in student_days:
        sd.fm_staff_id = None
        sd.em_staff_id = None
    db.flush()

    # Re-run smart assignment for just this day
    all_students = {
        str(s.id): s
        for s in db.query(Student).filter(Student.active == True).all()  # noqa: E712
    }

    all_day_assignments = (
        db.query(DayAssignment)
        .filter(DayAssignment.week_schedule_id == ws.id)
        .all()
    )
    da_map: dict[tuple, set] = {}
    for da in all_day_assignments:
        key = (str(da.student_id), da.weekday)
        da_map.setdefault(key, set()).add(str(da.staff_id))

    staff_shifts = (
        db.query(StaffShift)
        .filter(StaffShift.week_schedule_id == ws.id, StaffShift.weekday == weekday)
        .all()
    )

    staff_info: dict[str, tuple] = {}
    for ss in staff_shifts:
        staff = db.query(Staff).get(ss.staff_id)
        if staff and staff.role != StaffRole.TEACHER:
            staff_info[str(staff.id)] = (staff, ss)

    fm_available = [
        (s, ss) for s, ss in staff_info.values()
        if ss.start_time and ss.start_time < "08:30"
    ]
    em_available = [
        (s, ss) for s, ss in staff_info.values()
        if ss.end_time and ss.end_time > "13:30"
    ]

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

    _smart_assign(fm_needs, fm_available, "fm_staff_id", da_map, weekday)
    _smart_assign(em_needs, em_available, "em_staff_id", da_map, weekday)

    db.commit()

    # Return refreshed day data
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
# Absence impact analysis
# ============================================================

@router.post("/weeks/{week_id}/days/{weekday}/absence-impact")
def get_absence_impact(
    week_id: UUID,
    weekday: int,
    body: dict,
    db: Session = Depends(get_db),
):
    """Analyze the impact of staff absences on a specific day."""
    if weekday < 0 or weekday > 4:
        raise HTTPException(status_code=400, detail="Veckodag måste vara 0-4")

    ws = db.query(WeekSchedule).get(week_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Veckoschema hittades inte")

    absent_staff_ids = body.get("absent_staff_ids", [])
    if not absent_staff_ids:
        raise HTTPException(status_code=400, detail="Inga frånvarande personalID angivna")

    return compute_absence_impact(db, week_id, weekday, absent_staff_ids)


# ============================================================
# Vulnerability check
# ============================================================

@router.get("/weeks/{week_id}/vulnerabilities")
def get_vulnerabilities(week_id: UUID, db: Session = Depends(get_db)):
    """Check for single-point-of-failure vulnerabilities."""
    ws = db.query(WeekSchedule).get(week_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Veckoschema hittades inte")

    return check_vulnerabilities(db)


# ============================================================
# Coverage timeline
# ============================================================

@router.get("/weeks/{week_id}/days/{weekday}/coverage-timeline")
def get_coverage_timeline(week_id: UUID, weekday: int, db: Session = Depends(get_db)):
    """Get hourly coverage timeline for a specific day."""
    if weekday < 0 or weekday > 4:
        raise HTTPException(status_code=400, detail="Veckodag måste vara 0-4")

    ws = db.query(WeekSchedule).get(week_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Veckoschema hittades inte")

    return compute_coverage_timeline(db, week_id, weekday)


# ============================================================
# Class balance
# ============================================================

@router.get("/weeks/{week_id}/class-balance")
def get_class_balance(week_id: UUID, weekday: int = 0, db: Session = Depends(get_db)):
    """Get class balance analysis for a specific day."""
    if weekday < 0 or weekday > 4:
        raise HTTPException(status_code=400, detail="Veckodag måste vara 0-4")

    ws = db.query(WeekSchedule).get(week_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Veckoschema hittades inte")

    from app.services.class_balance import compute_class_balance
    return compute_class_balance(db, week_id, weekday)


# ============================================================
# Substitute report
# ============================================================

@router.get("/weeks/{week_id}/substitute-report")
def get_substitute_report(week_id: UUID, db: Session = Depends(get_db)):
    """Generate a substitute needs report for the entire week."""
    ws = db.query(WeekSchedule).get(week_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Veckoschema hittades inte")

    from app.services.substitute_report import compute_substitute_report
    return compute_substitute_report(db, ws)


# ============================================================
# Auto-suggest assignments with preview
# ============================================================

@router.post("/weeks/{week_id}/days/{weekday}/suggest-assignments")
def suggest_assignments(week_id: UUID, weekday: int, db: Session = Depends(get_db)):
    """Generate suggested assignments for a day without applying them.

    Returns a list of suggestions with scores that the user can approve/reject.
    """
    if weekday < 0 or weekday > 4:
        raise HTTPException(status_code=400, detail="Veckodag måste vara 0-4")

    ws = db.query(WeekSchedule).get(week_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Veckoschema hittades inte")

    all_students = {
        str(s.id): s
        for s in db.query(Student).filter(Student.active == True).all()  # noqa: E712
    }

    all_day_assignments = (
        db.query(DayAssignment)
        .filter(DayAssignment.week_schedule_id == ws.id)
        .all()
    )
    da_map: dict[tuple, set] = {}
    for da in all_day_assignments:
        key = (str(da.student_id), da.weekday)
        da_map.setdefault(key, set()).add(str(da.staff_id))

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

    staff_info: dict[str, tuple] = {}
    for ss in staff_shifts:
        staff = db.query(Staff).get(ss.staff_id)
        if staff and staff.role != StaffRole.TEACHER:
            staff_info[str(staff.id)] = (staff, ss)

    fm_available = [
        (s, ss) for s, ss in staff_info.values()
        if ss.start_time and ss.start_time < "08:30"
    ]
    em_available = [
        (s, ss) for s, ss in staff_info.values()
        if ss.end_time and ss.end_time > "13:30"
    ]

    suggestions = []
    counts: dict[str, int] = {str(s.id): 0 for s, _ in staff_info.values()}

    for sd in student_days:
        student = all_students.get(str(sd.student_id))
        if not student:
            continue

        da_staff_ids = da_map.get((str(student.id), weekday), set())
        max_count = max(len(student_days) // max(len(fm_available) or 1, 1), 1)

        # FM suggestion
        needs_fm = sd.arrival_time and sd.arrival_time < "08:30"
        if needs_fm:
            current_fm = str(sd.fm_staff_id) if sd.fm_staff_id else None
            best_score = -1
            best_staff = None
            for staff, _ss in fm_available:
                eligible, score = _compute_match_score(staff, student, counts, max_count, da_staff_ids)
                if eligible and score > best_score:
                    best_score = score
                    best_staff = staff

            if best_staff and str(best_staff.id) != current_fm:
                suggestions.append({
                    "student_day_id": str(sd.id),
                    "student_id": str(student.id),
                    "student_name": student.full_name,
                    "period": "fm",
                    "current_staff_id": current_fm,
                    "current_staff_name": None,
                    "suggested_staff_id": str(best_staff.id),
                    "suggested_staff_name": best_staff.full_name,
                    "score": round(best_score, 1),
                    "reason": _explain_score(best_staff, student, da_staff_ids),
                })

        # EM suggestion
        needs_em = sd.departure_time and sd.departure_time > "13:30"
        if needs_em:
            current_em = str(sd.em_staff_id) if sd.em_staff_id else None
            best_score = -1
            best_staff = None
            for staff, _ss in em_available:
                eligible, score = _compute_match_score(staff, student, counts, max_count, da_staff_ids)
                if eligible and score > best_score:
                    best_score = score
                    best_staff = staff

            if best_staff and str(best_staff.id) != current_em:
                suggestions.append({
                    "student_day_id": str(sd.id),
                    "student_id": str(student.id),
                    "student_name": student.full_name,
                    "period": "em",
                    "current_staff_id": current_em,
                    "current_staff_name": None,
                    "suggested_staff_id": str(best_staff.id),
                    "suggested_staff_name": best_staff.full_name,
                    "score": round(best_score, 1),
                    "reason": _explain_score(best_staff, student, da_staff_ids),
                })

    # Sort by score descending
    suggestions.sort(key=lambda x: x["score"], reverse=True)

    return {"suggestions": suggestions, "total": len(suggestions)}


def _explain_score(staff: Staff, student: Student, da_staff_ids: set) -> str:
    """Generate a human-readable explanation for a match score."""
    reasons = []
    preferred = set(str(pid) for pid in (student.preferred_staff or []))
    if str(staff.id) in preferred:
        reasons.append("Föredragen personal")
    care_reqs = set(student.care_requirements or [])
    staff_certs = set(staff.care_certifications or [])
    if care_reqs and care_reqs.issubset(staff_certs):
        reasons.append("Matchande certifiering")
    if str(staff.id) in da_staff_ids:
        reasons.append("Redan specialtilldelad")
    if not reasons:
        reasons.append("Bra matchning")
    return ", ".join(reasons)


# ============================================================
# Vulnerability map (student × weekday matrix)
# ============================================================

@router.get("/weeks/{week_id}/vulnerability-map")
def get_vulnerability_map(week_id: UUID, db: Session = Depends(get_db)):
    """Get a risk matrix: students with care needs × weekdays."""
    ws = db.query(WeekSchedule).filter(WeekSchedule.id == week_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Veckoschema hittades inte")
    return compute_vulnerability_map(db, ws.id)


# ============================================================
# Staff wellbeing
# ============================================================

@router.get("/weeks/{week_id}/staff-wellbeing")
def get_staff_wellbeing(week_id: UUID, db: Session = Depends(get_db)):
    """Analyze staff workload and wellbeing across the week."""
    ws = db.query(WeekSchedule).filter(WeekSchedule.id == week_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Veckoschema hittades inte")
    return compute_staff_wellbeing(db, ws.id)


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
    """Pre-populate staff_shifts from WorkHour records.

    Handles Friday rotation: staff with friday_rotation_group are assigned
    one of 4 rotation patterns. The active group for a week is determined by
    week_number % 4 + 1.
    """
    staff_members = db.query(Staff).filter(Staff.active == True).all()  # noqa: E712

    # Build a lookup: (staff_id, weekday) -> WorkHour
    work_hours = db.query(WorkHour).all()
    wh_map: dict[tuple, WorkHour] = {}
    for wh in work_hours:
        key = (str(wh.staff_id), wh.weekday)
        # week_number 0 means "both weeks"; otherwise prefer week_number 0
        if key not in wh_map or wh.week_number == 0:
            wh_map[key] = wh

    # Friday rotation: determine which group is active this week
    active_friday_group = (ws.week_number % 4) + 1  # 1-4

    for staff in staff_members:
        for weekday in range(5):
            # Friday rotation check: skip Friday shift if staff is in a
            # rotation group that is not active this week
            if weekday == 4 and staff.friday_rotation_group is not None:
                if staff.friday_rotation_group != active_friday_group:
                    continue

            wh = wh_map.get((str(staff.id), weekday))
            if wh:
                # Calculate break minutes from lunch times
                break_mins = 30  # default
                if wh.lunch_start and wh.lunch_end:
                    lh, lm = int(wh.lunch_start.split(":")[0]), int(wh.lunch_start.split(":")[1])
                    eh, em = int(wh.lunch_end.split(":")[0]), int(wh.lunch_end.split(":")[1])
                    break_mins = (eh * 60 + em) - (lh * 60 + lm)

                notes = None
                if weekday == 4 and staff.friday_rotation_group is not None:
                    notes = f"Fredagsgrupp {staff.friday_rotation_group}"

                db.add(StaffShift(
                    week_schedule_id=ws.id,
                    staff_id=staff.id,
                    weekday=weekday,
                    start_time=wh.start_time,
                    end_time=wh.end_time,
                    break_minutes=break_mins,
                    notes=notes,
                ))


def _auto_assign_staff(db: Session, ws: WeekSchedule):
    """Auto-assign FM/EM staff to students using smart score-based matching.

    FM = students arriving before 08:30 (morning care).
    EM = students departing after 13:30 (afternoon care).

    Only fritidspedagoger and elevassistenter are assigned (not teachers).
    Uses a score-based system considering:
      - HARD: care_certifications must match care_requirements
      - preferred_staff match: +50
      - Certification match: +30
      - Same grade group: +20
      - Already has DayAssignment with this staff: +15
      - Low workload bonus: +10 * (1 - load/max)
    """
    all_students = {
        str(s.id): s
        for s in db.query(Student).filter(Student.active == True).all()  # noqa: E712
    }

    # Pre-load DayAssignments for bonus scoring
    all_day_assignments = (
        db.query(DayAssignment)
        .filter(DayAssignment.week_schedule_id == ws.id)
        .all()
    )
    # Map: (student_id, weekday) -> set of staff_ids
    da_map: dict[tuple, set] = {}
    for da in all_day_assignments:
        key = (str(da.student_id), da.weekday)
        da_map.setdefault(key, set()).add(str(da.staff_id))

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

        # Assign with smart scoring
        _smart_assign(fm_needs, fm_available, "fm_staff_id", da_map, weekday)
        _smart_assign(em_needs, em_available, "em_staff_id", da_map, weekday)

    db.flush()


def _compute_match_score(
    staff: Staff,
    student: Student,
    counts: dict[str, int],
    max_count: int,
    da_staff_ids: set,
) -> tuple[bool, float]:
    """Compute a match score between a staff member and a student.

    Returns (is_eligible, score).
    is_eligible is False if the student has care_requirements that the staff cannot meet.
    """
    care_reqs = set(student.care_requirements or [])
    staff_certs = set(staff.care_certifications or [])

    # HARD constraint: if student has care requirements, staff MUST have matching certs
    if care_reqs and not care_reqs.issubset(staff_certs):
        return False, 0.0

    score = 0.0

    # Preferred staff bonus (+50)
    preferred = set(str(pid) for pid in (student.preferred_staff or []))
    if str(staff.id) in preferred:
        score += 50

    # Certification match bonus (+30) — staff has relevant certs even if not required
    if care_reqs and care_reqs.issubset(staff_certs):
        score += 30

    # Same grade group bonus (+20)
    student_grade_group = StaffGradeGroup.GRADES_1_3 if (student.grade or 99) <= 3 else StaffGradeGroup.GRADES_4_6
    if staff.grade_group is None or staff.grade_group == student_grade_group:
        score += 20

    # Already assigned via DayAssignment (+15)
    if str(staff.id) in da_staff_ids:
        score += 15

    # Low workload bonus (+10 * (1 - load/max))
    current_load = counts.get(str(staff.id), 0)
    if max_count > 0:
        score += 10 * (1 - current_load / max(max_count, 1))
    else:
        score += 10

    return True, score


def _smart_assign(
    student_needs: list[tuple],  # [(StudentDay, Student), ...]
    available_staff: list[tuple],  # [(Staff, StaffShift), ...]
    field: str,  # 'fm_staff_id' or 'em_staff_id'
    da_map: dict[tuple, set],
    weekday: int,
):
    """Assign staff to students using score-based smart matching."""
    if not available_staff or not student_needs:
        return

    # Assignment counter for load balancing
    counts: dict[str, int] = {str(s.id): 0 for s, _ in available_staff}
    max_count = max(len(student_needs) // max(len(available_staff), 1), 1)

    # Sort students: care needs first (they have harder constraints)
    student_needs_sorted = sorted(
        student_needs,
        key=lambda pair: (
            not (pair[1].has_care_needs if pair[1] else False),
            not bool(pair[1].care_requirements if pair[1] else []),
        ),
    )

    for sd, student in student_needs_sorted:
        if not student:
            continue

        da_staff_ids = da_map.get((str(student.id), weekday), set())

        # Score all available staff
        candidates: list[tuple[float, Staff]] = []
        for staff, _ss in available_staff:
            eligible, score = _compute_match_score(staff, student, counts, max_count, da_staff_ids)
            if eligible:
                candidates.append((score, staff))

        if not candidates:
            # Fallback: pick least-loaded staff ignoring hard constraints
            best_staff, _ = min(available_staff, key=lambda pair: counts.get(str(pair[0].id), 0))
            setattr(sd, field, best_staff.id)
            counts[str(best_staff.id)] = counts.get(str(best_staff.id), 0) + 1
            continue

        # Pick highest-scoring staff
        candidates.sort(key=lambda x: x[0], reverse=True)
        best_staff = candidates[0][1]
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
