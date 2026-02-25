"""
Substitute needs report — weekly summary of staffing gaps and substitute hours needed.

Per day: count absent staff, uncovered hours, specific certification needs.
"""

from sqlalchemy.orm import Session

from app.models import Student, Staff, StudentDay, StaffShift, Absence, WeekSchedule
from app.models.staff import StaffRole

import datetime

DAY_NAMES = ["Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag"]


def compute_substitute_report(db: Session, ws: WeekSchedule) -> dict:
    """Generate a substitute needs report for an entire week."""
    # Load all relevant data
    students_map = {
        str(s.id): s
        for s in db.query(Student).filter(Student.active == True).all()  # noqa: E712
    }
    staff_map = {
        str(s.id): s
        for s in db.query(Staff).filter(Staff.active == True).all()  # noqa: E712
    }

    # Get absences for this week
    # Calculate the date range for this week
    jan1 = datetime.date(ws.year, 1, 1)
    # ISO week date calculation
    week_start = jan1 + datetime.timedelta(days=(ws.week_number - 1) * 7 - jan1.weekday())

    absences = db.query(Absence).all()
    # Filter absences to this week
    week_absences: dict[int, set] = {}  # weekday -> set of staff_ids
    for a in absences:
        if a.absence_date:
            a_date = a.absence_date.date() if hasattr(a.absence_date, 'date') else a.absence_date
            for wd in range(5):
                day_date = week_start + datetime.timedelta(days=wd)
                if a_date == day_date:
                    week_absences.setdefault(wd, set()).add(str(a.staff_id))

    days = []
    total_deficit = 0.0
    total_absent = 0

    for weekday in range(5):
        absent_ids = week_absences.get(weekday, set())

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

        # Absent staff details
        absent_staff = []
        for sid in absent_ids:
            staff = staff_map.get(sid)
            if staff:
                absent_staff.append({
                    "staff_id": sid,
                    "staff_name": staff.full_name,
                    "role": staff.role.value,
                })

        # Calculate total staff hours available vs needed
        total_staff_hours = 0.0
        for ss in staff_shifts:
            if str(ss.staff_id) not in absent_ids:
                sh = int(ss.start_time.split(":")[0]) + int(ss.start_time.split(":")[1]) / 60
                eh = int(ss.end_time.split(":")[0]) + int(ss.end_time.split(":")[1]) / 60
                total_staff_hours += max(eh - sh - ss.break_minutes / 60, 0)

        # Calculate student care hours needed
        total_care_hours = 0.0
        for sd in student_days:
            if sd.absent_type == "full_day":
                continue
            arrival = sd.arrival_time or "08:00"
            departure = sd.departure_time or "16:00"
            ah = int(arrival.split(":")[0]) + int(arrival.split(":")[1]) / 60
            dh = int(departure.split(":")[0]) + int(departure.split(":")[1]) / 60
            total_care_hours += max(dh - ah, 0)

        # Per-student ratio: assume 1 staff per 5 students
        needed_staff_hours = total_care_hours / 5
        deficit_hours = max(needed_staff_hours - total_staff_hours, 0)

        # Identify uncovered needs
        uncovered_needs = []
        for sd in student_days:
            if sd.absent_type == "full_day":
                continue
            student = students_map.get(str(sd.student_id))
            if not student:
                continue

            # Check if this student's staff is absent
            fm_absent = sd.fm_staff_id and str(sd.fm_staff_id) in absent_ids
            em_absent = sd.em_staff_id and str(sd.em_staff_id) in absent_ids

            if fm_absent or em_absent:
                care_reqs = student.care_requirements or []
                grade_group = "grades_1_3" if student.grade <= 3 else "grades_4_6"
                uncovered_needs.append({
                    "description": f"{student.full_name} (åk {student.grade}) saknar {'FM' if fm_absent else ''}{'/' if fm_absent and em_absent else ''}{'EM' if em_absent else ''}-personal",
                    "grade_group": grade_group,
                    "certification_needed": care_reqs,
                })

        days.append({
            "weekday": weekday,
            "day_name": DAY_NAMES[weekday],
            "absent_staff": absent_staff,
            "deficit_hours": round(deficit_hours, 1),
            "uncovered_needs": uncovered_needs,
        })

        total_deficit += deficit_hours
        total_absent += len(absent_staff)

    return {
        "week_year": ws.year,
        "week_number": ws.week_number,
        "days": days,
        "total_deficit_hours": round(total_deficit, 1),
        "total_absent_staff": total_absent,
    }
