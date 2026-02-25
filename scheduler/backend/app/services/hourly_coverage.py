"""
Hourly coverage analysis — compute staffing levels per 30-minute slot.

For each 30-min slot between 06:00 and 18:00:
- Count students present (arrival_time <= slot < departure_time)
- Count staff present (shift start <= slot < shift end, minus lunch)
- Calculate surplus/deficit
"""

from uuid import UUID
from sqlalchemy.orm import Session

from app.models import StudentDay, StaffShift
from app.models.staff import Absence


def compute_coverage_timeline(
    db: Session,
    week_schedule_id: UUID,
    weekday: int,
) -> list[dict]:
    """Compute coverage for each 30-min slot on a given day."""
    student_days = (
        db.query(StudentDay)
        .filter(
            StudentDay.week_schedule_id == week_schedule_id,
            StudentDay.weekday == weekday,
        )
        .all()
    )
    staff_shifts = (
        db.query(StaffShift)
        .filter(
            StaffShift.week_schedule_id == week_schedule_id,
            StaffShift.weekday == weekday,
        )
        .all()
    )

    # Generate 30-min slots from 06:00 to 18:00
    slots = []
    for hour in range(6, 18):
        for minute in (0, 30):
            start = f"{hour:02d}:{minute:02d}"
            end_h = hour if minute == 0 else hour + 1
            end_m = 30 if minute == 0 else 0
            end = f"{end_h:02d}:{end_m:02d}"
            slots.append((start, end))

    result = []
    for slot_start, slot_end in slots:
        # Count students present in this slot
        students_present = 0
        for sd in student_days:
            if sd.absent_type == "full_day":
                continue
            if sd.absent_type == "am" and slot_start < "12:00":
                continue
            if sd.absent_type == "pm" and slot_start >= "12:00":
                continue

            arrival = sd.arrival_time or "08:00"
            departure = sd.departure_time or "16:00"
            if arrival <= slot_start and departure > slot_start:
                students_present += 1

        # Count staff present in this slot (excluding lunch break)
        staff_present = 0
        for ss in staff_shifts:
            shift_start = ss.start_time
            shift_end = ss.end_time
            if shift_start <= slot_start and shift_end > slot_start:
                # Approximate lunch exclusion: assume 30min break around 11:30-12:00
                # We use the break_minutes but place it at midday
                if ss.break_minutes and ss.break_minutes > 0:
                    # Assume lunch is at the midpoint of the shift
                    sh = int(shift_start.split(":")[0]) * 60 + int(shift_start.split(":")[1])
                    eh = int(shift_end.split(":")[0]) * 60 + int(shift_end.split(":")[1])
                    mid = (sh + eh) // 2
                    lunch_start = mid - ss.break_minutes // 2
                    lunch_end = mid + ss.break_minutes // 2
                    slot_min = int(slot_start.split(":")[0]) * 60 + int(slot_start.split(":")[1])
                    if lunch_start <= slot_min < lunch_end:
                        continue

                staff_present += 1

        surplus = staff_present - students_present
        if surplus > 0:
            status = "surplus"
        elif surplus == 0:
            status = "balanced"
        else:
            status = "deficit"

        result.append({
            "time_start": slot_start,
            "time_end": slot_end,
            "students_present": students_present,
            "staff_present": staff_present,
            "surplus": surplus,
            "status": status,
        })

    return result
