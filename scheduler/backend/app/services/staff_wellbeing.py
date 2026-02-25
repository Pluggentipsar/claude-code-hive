"""
Staff wellbeing analysis — detect workload patterns that may cause burnout.

Checks across the entire week:
  - Same demanding student (care needs) assigned to same staff X+ days in a row
  - Sole handler: staff is only person assigned to a care-needs student all week
  - High daily load: more than threshold students per day
  - Week load: total assignments across the week
"""

from uuid import UUID
from collections import defaultdict
from sqlalchemy.orm import Session

from app.models import Student, Staff, StudentDay, StaffShift

HIGH_DAILY_LOAD = 8
HIGH_WEEK_LOAD = 30
CONSECUTIVE_DAYS_THRESHOLD = 3


def compute_staff_wellbeing(
    db: Session,
    week_schedule_id: UUID,
) -> dict:
    """Analyze staff wellbeing across the entire week schedule."""
    all_student_days = (
        db.query(StudentDay)
        .filter(StudentDay.week_schedule_id == week_schedule_id)
        .all()
    )

    students_map = {
        str(s.id): s
        for s in db.query(Student).filter(Student.active == True).all()  # noqa: E712
    }
    staff_map = {
        str(s.id): s
        for s in db.query(Staff).filter(Staff.active == True).all()  # noqa: E712
    }

    # staff_id → weekday → list of (student_id, period)
    staff_assignments: dict[str, dict[int, list]] = defaultdict(lambda: defaultdict(list))
    # staff_id → weekday → set(student_id with care needs)
    staff_care_assignments: dict[str, dict[int, set]] = defaultdict(lambda: defaultdict(set))

    for sd in all_student_days:
        if sd.absent_type == "full_day":
            continue
        student = students_map.get(str(sd.student_id))
        if not student:
            continue

        for period, staff_field in [("fm", sd.fm_staff_id), ("em", sd.em_staff_id)]:
            if staff_field:
                sid = str(staff_field)
                staff_assignments[sid][sd.weekday].append((str(sd.student_id), period))
                if student.has_care_needs:
                    staff_care_assignments[sid][sd.weekday].add(str(sd.student_id))

    # Track: for each care student, which staff handle them on which days
    # student_id → staff_id → set(weekdays)
    care_student_staff_days: dict[str, dict[str, set]] = defaultdict(lambda: defaultdict(set))
    for sid, weekdays in staff_care_assignments.items():
        for wd, student_ids in weekdays.items():
            for stud_id in student_ids:
                care_student_staff_days[stud_id][sid].add(wd)

    alerts = []

    for staff_id, day_map in staff_assignments.items():
        staff = staff_map.get(staff_id)
        if not staff:
            continue

        staff_alerts = []

        # 1. High daily load
        for wd in range(5):
            count = len(day_map.get(wd, []))
            if count >= HIGH_DAILY_LOAD:
                staff_alerts.append({
                    "type": "high_daily_load",
                    "severity": "warning" if count < HIGH_DAILY_LOAD + 3 else "critical",
                    "message": f"{count} tilldelningar dag {wd + 1}",
                    "weekday": wd,
                    "value": count,
                })

        # 2. High week load
        week_total = sum(len(assigns) for assigns in day_map.values())
        if week_total >= HIGH_WEEK_LOAD:
            staff_alerts.append({
                "type": "high_week_load",
                "severity": "warning" if week_total < HIGH_WEEK_LOAD + 10 else "critical",
                "message": f"{week_total} tilldelningar totalt denna vecka",
                "weekday": None,
                "value": week_total,
            })

        # 3. Consecutive days with same care student
        care_days = staff_care_assignments.get(staff_id, {})
        # student_id → sorted weekdays this staff handles them
        student_streaks: dict[str, list[int]] = defaultdict(list)
        for wd in range(5):
            for stud_id in care_days.get(wd, set()):
                student_streaks[stud_id].append(wd)

        for stud_id, weekdays in student_streaks.items():
            # Find longest consecutive streak
            if len(weekdays) < CONSECUTIVE_DAYS_THRESHOLD:
                continue
            sorted_days = sorted(weekdays)
            streak = 1
            max_streak = 1
            for i in range(1, len(sorted_days)):
                if sorted_days[i] == sorted_days[i - 1] + 1:
                    streak += 1
                    max_streak = max(max_streak, streak)
                else:
                    streak = 1

            if max_streak >= CONSECUTIVE_DAYS_THRESHOLD:
                student = students_map.get(stud_id)
                student_name = student.full_name if student else "Okänd"
                staff_alerts.append({
                    "type": "consecutive_care",
                    "severity": "warning" if max_streak < 5 else "critical",
                    "message": f"Samma krävande elev ({student_name}) {max_streak} dagar i rad",
                    "weekday": None,
                    "value": max_streak,
                })

        # 4. Sole handler — only staff assigned to a care student all week
        for stud_id, staff_days in care_student_staff_days.items():
            if staff_id not in staff_days:
                continue
            # Check if this staff is the ONLY one handling this student
            other_staff = [s for s in staff_days.keys() if s != staff_id]
            if not other_staff:
                student = students_map.get(stud_id)
                student_name = student.full_name if student else "Okänd"
                days_count = len(staff_days[staff_id])
                if days_count >= 3:
                    staff_alerts.append({
                        "type": "sole_handler",
                        "severity": "warning",
                        "message": f"Ensam hanterare för {student_name} ({days_count} dagar)",
                        "weekday": None,
                        "value": days_count,
                    })

        if staff_alerts:
            alerts.append({
                "staff_id": staff_id,
                "staff_name": staff.full_name,
                "alerts": staff_alerts,
                "alert_count": len(staff_alerts),
                "has_critical": any(a["severity"] == "critical" for a in staff_alerts),
            })

    # Sort: critical first, then by alert count
    alerts.sort(key=lambda x: (not x["has_critical"], -x["alert_count"]))

    return {
        "staff_alerts": alerts,
        "total_alerts": sum(a["alert_count"] for a in alerts),
        "staff_with_alerts": len(alerts),
    }
