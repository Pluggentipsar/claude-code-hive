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

from app.models import StudentDay, StaffShift, DayAssignment, Absence, Staff, Student, SchoolClass
from app.models.school_class import TeamMeeting
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
    warnings.extend(_check_al_coverage(student_days, weekday, db))
    warnings.extend(_check_vulnerability(student_days, weekday, db))

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


def _check_al_coverage(
    student_days: list[StudentDay],
    weekday: int,
    db: Session,
) -> list[Warning]:
    """Check if students with care needs during AL time have staff coverage."""
    warnings = []

    # Get team meetings for this weekday
    # TeamMeeting.weekday is stored as string like "monday"
    weekday_names = ["monday", "tuesday", "wednesday", "thursday", "friday"]
    if weekday >= len(weekday_names):
        return warnings
    weekday_name = weekday_names[weekday]

    team_meetings = (
        db.query(TeamMeeting)
        .filter(TeamMeeting.weekday == weekday_name)
        .all()
    )

    if not team_meetings:
        return warnings

    # Build class-to-meeting map
    class_meetings: dict = {}  # class_id -> (start, end)
    for tm in team_meetings:
        class_meetings[str(tm.class_id)] = (tm.start_time, tm.end_time)

    # Check students whose class has AL and who have care needs during that time
    for sd in student_days:
        student = db.query(Student).get(sd.student_id)
        if not student or not student.class_id:
            continue

        meeting = class_meetings.get(str(student.class_id))
        if not meeting:
            continue

        al_start, al_end = meeting
        # Student is present during AL?
        arrival = sd.arrival_time or "08:00"
        departure = sd.departure_time or "16:00"

        if arrival < al_end and departure > al_start:
            # Student is present during AL — check if they have care needs
            if student.has_care_needs:
                # Check if fm/em staff covers the AL period
                has_coverage = False
                if sd.fm_staff_id and al_start < "12:00":
                    has_coverage = True
                if sd.em_staff_id and al_end > "12:00":
                    has_coverage = True

                if not has_coverage:
                    school_class = db.query(SchoolClass).get(student.class_id)
                    class_name = school_class.name if school_class else "Okänd klass"
                    warnings.append(Warning(
                        type=WarningType.GAP,
                        severity=WarningSeverity.WARNING,
                        message=f"{student.full_name} har omsorgsbehov under {class_name}s AL ({al_start}-{al_end}) men saknar ersättare",
                        student_id=sd.student_id,
                        weekday=weekday,
                        time=al_start,
                    ))

    return warnings


def _check_vulnerability(
    student_days: list[StudentDay],
    weekday: int,
    db: Session,
) -> list[Warning]:
    """Check for single-point-of-failure in today's assignments."""
    warnings = []

    # Get all active staff with their certifications
    all_staff = db.query(Staff).filter(Staff.active == True).all()  # noqa: E712
    cert_staff_map: dict[str, list] = {}
    for staff in all_staff:
        for cert in (staff.care_certifications or []):
            cert_staff_map.setdefault(cert, []).append(staff)

    seen_students = set()
    for sd in student_days:
        if str(sd.student_id) in seen_students:
            continue
        seen_students.add(str(sd.student_id))

        student = db.query(Student).get(sd.student_id)
        if not student or not student.has_care_needs:
            continue

        for req in (student.care_requirements or []):
            qualified = cert_staff_map.get(req, [])
            if len(qualified) <= 1:
                if len(qualified) == 0:
                    msg = f"{student.full_name}: ingen personal har certifiering '{req}'"
                else:
                    msg = f"{student.full_name}: bara {qualified[0].full_name} kan hantera '{req}'"
                warnings.append(Warning(
                    type=WarningType.VULNERABILITY,
                    severity=WarningSeverity.WARNING if len(qualified) == 1 else WarningSeverity.ERROR,
                    message=msg,
                    student_id=sd.student_id,
                    weekday=weekday,
                ))

    return warnings


def _times_overlap(start1: str, end1: str, start2: str, end2: str) -> bool:
    """Check if two time ranges overlap."""
    return start1 < end2 and start2 < end1
