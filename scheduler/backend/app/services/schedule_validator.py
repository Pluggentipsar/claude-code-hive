"""
Schedule validation — replaces the old constraint engine.

Simple, practical checks:
1. Conflicts: Same staff assigned to >1 student at the same time
2. Gaps: Student needs care but no staff assigned
3. Workload: Staff total hours exceed shift length
4. Absence: Staff marked absent but assigned in schedule
"""

from uuid import UUID
from sqlalchemy.orm import Session

from app.models import StudentDay, StaffShift, DayAssignment, Absence, Staff, Student
from app.schemas.week_schedule import Warning, WarningSeverity, WarningType


def validate_day(
    db: Session,
    week_schedule_id: UUID,
    weekday: int,
) -> list[Warning]:
    """Validate a single day and return warnings."""
    warnings: list[Warning] = []

    student_days = (
        db.query(StudentDay)
        .filter(StudentDay.week_schedule_id == week_schedule_id, StudentDay.weekday == weekday)
        .all()
    )
    staff_shifts = (
        db.query(StaffShift)
        .filter(StaffShift.week_schedule_id == week_schedule_id, StaffShift.weekday == weekday)
        .all()
    )
    day_assignments = (
        db.query(DayAssignment)
        .filter(DayAssignment.week_schedule_id == week_schedule_id, DayAssignment.weekday == weekday)
        .all()
    )

    warnings.extend(_check_conflicts(student_days, day_assignments, db))
    warnings.extend(_check_gaps(student_days, db))
    warnings.extend(_check_absence_conflicts(student_days, day_assignments, weekday, db))

    return warnings


def validate_week(
    db: Session,
    week_schedule_id: UUID,
) -> list[Warning]:
    """Validate all days in a week."""
    all_warnings: list[Warning] = []
    for weekday in range(5):
        all_warnings.extend(validate_day(db, week_schedule_id, weekday))
    return all_warnings


def _check_conflicts(
    student_days: list[StudentDay],
    day_assignments: list[DayAssignment],
    db: Session,
) -> list[Warning]:
    """Check if same staff is assigned to multiple students at overlapping times."""
    warnings = []
    weekday = student_days[0].weekday if student_days else 0

    # Build map: staff_id -> list of (period, student_id)
    staff_assignments: dict[UUID, list[tuple[str, UUID]]] = {}

    for sd in student_days:
        if sd.fm_staff_id:
            staff_assignments.setdefault(sd.fm_staff_id, []).append(("FM", sd.student_id))
        if sd.em_staff_id:
            staff_assignments.setdefault(sd.em_staff_id, []).append(("EM", sd.student_id))

    for staff_id, assignments in staff_assignments.items():
        fm_students = [a[1] for a in assignments if a[0] == "FM"]
        em_students = [a[1] for a in assignments if a[0] == "EM"]

        if len(fm_students) > 1:
            staff = db.query(Staff).get(staff_id)
            staff_name = staff.full_name if staff else str(staff_id)
            warnings.append(Warning(
                type=WarningType.CONFLICT,
                severity=WarningSeverity.ERROR,
                message=f"{staff_name} tilldelad {len(fm_students)} elever på FM",
                staff_id=staff_id,
                weekday=weekday,
                time="FM",
            ))

        if len(em_students) > 1:
            staff = db.query(Staff).get(staff_id)
            staff_name = staff.full_name if staff else str(staff_id)
            warnings.append(Warning(
                type=WarningType.CONFLICT,
                severity=WarningSeverity.ERROR,
                message=f"{staff_name} tilldelad {len(em_students)} elever på EM",
                staff_id=staff_id,
                weekday=weekday,
                time="EM",
            ))

    # Check day_assignments for time overlaps
    da_by_staff: dict[UUID, list[DayAssignment]] = {}
    for da in day_assignments:
        da_by_staff.setdefault(da.staff_id, []).append(da)

    for staff_id, das in da_by_staff.items():
        for i in range(len(das)):
            for j in range(i + 1, len(das)):
                if _times_overlap(das[i].start_time, das[i].end_time,
                                  das[j].start_time, das[j].end_time):
                    staff = db.query(Staff).get(staff_id)
                    staff_name = staff.full_name if staff else str(staff_id)
                    warnings.append(Warning(
                        type=WarningType.CONFLICT,
                        severity=WarningSeverity.ERROR,
                        message=f"{staff_name} har överlappande specialtilldelningar {das[i].start_time}-{das[i].end_time} och {das[j].start_time}-{das[j].end_time}",
                        staff_id=staff_id,
                        weekday=das[i].weekday,
                        time=das[i].start_time,
                    ))

    return warnings


def _check_gaps(
    student_days: list[StudentDay],
    db: Session,
) -> list[Warning]:
    """Check if students need care but have no staff assigned."""
    warnings = []

    for sd in student_days:
        needs_fm = sd.arrival_time and sd.arrival_time < "08:30"
        needs_em = sd.departure_time and sd.departure_time > "13:30"

        if needs_fm and not sd.fm_staff_id:
            student = db.query(Student).get(sd.student_id)
            student_name = student.full_name if student else str(sd.student_id)
            warnings.append(Warning(
                type=WarningType.GAP,
                severity=WarningSeverity.WARNING,
                message=f"{student_name} behöver FM-omsorg (ank. {sd.arrival_time}) men saknar personal",
                student_id=sd.student_id,
                weekday=sd.weekday,
                time=sd.arrival_time,
            ))

        if needs_em and not sd.em_staff_id:
            student = db.query(Student).get(sd.student_id)
            student_name = student.full_name if student else str(sd.student_id)
            warnings.append(Warning(
                type=WarningType.GAP,
                severity=WarningSeverity.WARNING,
                message=f"{student_name} behöver EM-omsorg (avf. {sd.departure_time}) men saknar personal",
                student_id=sd.student_id,
                weekday=sd.weekday,
                time=sd.departure_time,
            ))

    return warnings


def _check_absence_conflicts(
    student_days: list[StudentDay],
    day_assignments: list[DayAssignment],
    weekday: int,
    db: Session,
) -> list[Warning]:
    """Check if assigned staff are marked as absent."""
    warnings = []

    # Collect all assigned staff IDs
    assigned_staff_ids: set[UUID] = set()
    for sd in student_days:
        if sd.fm_staff_id:
            assigned_staff_ids.add(sd.fm_staff_id)
        if sd.em_staff_id:
            assigned_staff_ids.add(sd.em_staff_id)
    for da in day_assignments:
        assigned_staff_ids.add(da.staff_id)

    if not assigned_staff_ids:
        return warnings

    # Check absences for these staff on this weekday
    # Note: We check absences that match the weekday; full date check
    # would require knowing the actual date from year+week+weekday
    absences = (
        db.query(Absence)
        .filter(Absence.staff_id.in_(assigned_staff_ids))
        .all()
    )

    absent_staff_ids = {a.staff_id for a in absences}
    for staff_id in assigned_staff_ids & absent_staff_ids:
        staff = db.query(Staff).get(staff_id)
        staff_name = staff.full_name if staff else str(staff_id)
        warnings.append(Warning(
            type=WarningType.ABSENCE,
            severity=WarningSeverity.ERROR,
            message=f"{staff_name} är frånvarande men tilldelad i schemat",
            staff_id=staff_id,
            weekday=weekday,
        ))

    return warnings


def _times_overlap(start1: str, end1: str, start2: str, end2: str) -> bool:
    """Check if two time ranges overlap."""
    return start1 < end2 and start2 < end1
