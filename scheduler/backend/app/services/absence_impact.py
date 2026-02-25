"""
Absence impact analysis — compute the effect of staff absences on students.

Given a set of absent staff IDs for a specific day, determine:
1. Which students are affected (lost FM/EM coverage)
2. Severity per student (critical = care needs unmet, high = double staffing, medium = coverage gap)
3. Replacement candidates scored by smart matching
4. Suggested reassignments
"""

from uuid import UUID
from sqlalchemy.orm import Session

from app.models import Student, Staff, StudentDay, StaffShift, DayAssignment, SchoolClass
from app.models.staff import StaffRole, StaffGradeGroup


def compute_absence_impact(
    db: Session,
    week_schedule_id: UUID,
    weekday: int,
    absent_staff_ids: list[str],
) -> dict:
    """Compute the impact of staff absences on a given day."""
    absent_set = set(absent_staff_ids)

    # Load day data
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

    # Build maps
    students_map = {
        str(s.id): s
        for s in db.query(Student).filter(Student.active == True).all()  # noqa: E712
    }
    staff_map = {
        str(s.id): s
        for s in db.query(Staff).filter(Staff.active == True).all()  # noqa: E712
    }

    # Available staff (non-absent, non-teacher, with shifts today)
    available_staff_ids = set()
    for ss in staff_shifts:
        sid = str(ss.staff_id)
        staff = staff_map.get(sid)
        if staff and staff.role != StaffRole.TEACHER and sid not in absent_set:
            available_staff_ids.add(sid)

    # Find affected students
    affected_students = []
    for sd in student_days:
        student = students_map.get(str(sd.student_id))
        if not student:
            continue

        fm_absent = sd.fm_staff_id and str(sd.fm_staff_id) in absent_set
        em_absent = sd.em_staff_id and str(sd.em_staff_id) in absent_set

        if not fm_absent and not em_absent:
            continue

        # Determine severity
        care_reqs = student.care_requirements or []
        if care_reqs:
            severity = "critical"
        elif student.requires_double_staffing:
            severity = "high"
        else:
            severity = "medium"

        if fm_absent and em_absent:
            missing_period = "both"
        elif fm_absent:
            missing_period = "fm"
        else:
            missing_period = "em"

        absent_staff_name = ""
        if fm_absent and sd.fm_staff_id:
            s = staff_map.get(str(sd.fm_staff_id))
            absent_staff_name = s.full_name if s else ""
        elif em_absent and sd.em_staff_id:
            s = staff_map.get(str(sd.em_staff_id))
            absent_staff_name = s.full_name if s else ""

        school_class = db.query(SchoolClass).get(student.class_id) if student.class_id else None

        affected_students.append({
            "student_id": str(student.id),
            "student_name": student.full_name,
            "grade": student.grade,
            "class_name": school_class.name if school_class else None,
            "severity": severity,
            "care_requirements": care_reqs,
            "missing_period": missing_period,
            "absent_staff_name": absent_staff_name,
        })

    # Sort: critical first, then high, then medium
    severity_order = {"critical": 0, "high": 1, "medium": 2}
    affected_students.sort(key=lambda x: severity_order.get(x["severity"], 99))

    # Find replacement candidates from available staff
    replacement_candidates = []
    for sid in available_staff_ids:
        staff = staff_map.get(sid)
        if not staff:
            continue

        # Score replacement: higher = better fit
        score = 0
        reasons = []
        certs = staff.care_certifications or []

        # Check if this staff covers any affected student's care needs
        covers_care = False
        for aff in affected_students:
            if aff["severity"] == "critical":
                student_reqs = set(aff["care_requirements"])
                if student_reqs.issubset(set(certs)):
                    covers_care = True
                    break

        if covers_care:
            score += 50
            reasons.append("Matchande certifiering")

        if staff.role == StaffRole.LEISURE_EDUCATOR:
            score += 20
            reasons.append("Fritidspedagog")

        # Check current assignment load
        fm_count = sum(
            1 for sd in student_days
            if sd.fm_staff_id and str(sd.fm_staff_id) == sid
        )
        em_count = sum(
            1 for sd in student_days
            if sd.em_staff_id and str(sd.em_staff_id) == sid
        )
        current_load = fm_count + em_count
        if current_load == 0:
            score += 15
            reasons.append("Ingen nuvarande tilldelning")
        elif current_load <= 2:
            score += 5
            reasons.append("Låg belastning")

        if score > 0 or current_load <= 2:
            replacement_candidates.append({
                "staff_id": sid,
                "staff_name": staff.full_name,
                "score": max(score, 1),
                "reason": ", ".join(reasons) if reasons else "Tillgänglig",
                "care_certifications": certs,
            })

    replacement_candidates.sort(key=lambda x: x["score"], reverse=True)

    # Generate suggested reassignments
    suggested_reassignments = _generate_suggestions(
        affected_students, replacement_candidates, student_days, students_map, staff_map, absent_set
    )

    return {
        "absent_count": len(absent_set),
        "affected_students": affected_students,
        "replacement_candidates": replacement_candidates[:10],
        "suggested_reassignments": suggested_reassignments,
    }


def _generate_suggestions(
    affected_students: list[dict],
    candidates: list[dict],
    student_days: list,
    students_map: dict,
    staff_map: dict,
    absent_set: set,
) -> list[dict]:
    """Generate suggested reassignments for affected students."""
    suggestions = []
    used_staff = set()

    for aff in affected_students:
        student = students_map.get(aff["student_id"])
        if not student:
            continue

        periods = []
        if aff["missing_period"] in ("fm", "both"):
            periods.append("fm")
        if aff["missing_period"] in ("em", "both"):
            periods.append("em")

        care_reqs = set(student.care_requirements or [])
        preferred = set(str(pid) for pid in (student.preferred_staff or []))

        for period in periods:
            best_candidate = None
            best_score = -1

            for cand in candidates:
                if cand["staff_id"] in used_staff:
                    continue

                score = cand["score"]

                # Bonus for preferred staff
                if cand["staff_id"] in preferred:
                    score += 30

                # Must match care requirements for critical students
                if care_reqs:
                    staff_certs = set(cand["care_certifications"])
                    if not care_reqs.issubset(staff_certs):
                        continue
                    score += 20

                if score > best_score:
                    best_score = score
                    best_candidate = cand

            if best_candidate:
                suggestions.append({
                    "student_id": aff["student_id"],
                    "student_name": aff["student_name"],
                    "period": period,
                    "suggested_staff_id": best_candidate["staff_id"],
                    "suggested_staff_name": best_candidate["staff_name"],
                    "score": best_score,
                })
                # Don't mark as used — same staff can cover both FM and EM
                # But avoid assigning to too many students
                used_staff.add(best_candidate["staff_id"])

    return suggestions
