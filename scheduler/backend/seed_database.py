"""
Seed the database with realistic data matching the real Kålgården schedule.

Usage:
    cd scheduler/backend
    python seed_database.py

This will:
1. Clear all existing data (students, staff, classes, etc.)
2. Insert classes, staff, students, care times, and work hours
   matching the real schedule from "Schema att maila Joel.xlsx"
"""

import sys
import os
import uuid
from datetime import datetime, timedelta

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, SessionLocal, Base
from app.models import (
    Student, CareTime, Staff, WorkHour, Absence,
    SchoolClass, StaffRole, ScheduleType, GradeGroup, StaffGradeGroup,
    Schedule, StaffAssignment,
)

# Import data definitions from the mock data generator
from generate_mock_data import (
    CLASSES, STUDENTS, ELEVASSISTENTER, FRITIDSPEDAGOGER, PEDAGOGER,
    CARE_TIMES_RAW, STAFF_HOURS_RAW,
)


def clear_database(db):
    """Delete all existing data in the right order (respecting FK constraints)."""
    print("Rensar befintlig data...")
    db.query(StaffAssignment).delete()
    db.query(Schedule).delete()
    db.query(CareTime).delete()
    db.query(WorkHour).delete()
    db.query(Absence).delete()
    db.query(Student).delete()
    db.query(SchoolClass).delete()
    db.query(Staff).delete()
    db.commit()
    print("  Klar.")


def generate_personal_number(index: int, prefix: str = "200") -> str:
    """Generate a unique fake Swedish personal number."""
    return f"{prefix}{index:04d}-{1000 + index}"


def seed_classes(db) -> dict:
    """Create school classes and return a name->id map."""
    print("Skapar klasser...")
    class_map = {}

    for name, grade_group_str in CLASSES:
        grade_group = (
            GradeGroup.GRADES_1_3 if grade_group_str == "LÅGSTADIUM"
            else GradeGroup.GRADES_4_6
        )
        school_class = SchoolClass(
            id=uuid.uuid4(),
            name=name,
            grade_group=grade_group,
            academic_year="2025/2026",
            active=True,
        )
        db.add(school_class)
        class_map[name] = school_class

    db.flush()
    print(f"  {len(class_map)} klasser skapade.")
    return class_map


def _grade_group_from_class(class_name: str | None) -> StaffGradeGroup | None:
    """Derive staff grade group from assigned class name."""
    if not class_name:
        return None
    if class_name.startswith("1-3"):
        return StaffGradeGroup.GRADES_1_3
    return StaffGradeGroup.GRADES_4_6


def seed_staff(db) -> dict:
    """Create all staff members and return a first_name->Staff map."""
    print("Skapar personal...")
    staff_map = {}
    idx = 0

    # Pedagoger
    for first, last, assigned_class in PEDAGOGER:
        idx += 1
        staff = Staff(
            id=uuid.uuid4(),
            personal_number=generate_personal_number(idx, "197"),
            first_name=first,
            last_name=last,
            role=StaffRole.TEACHER,
            grade_group=_grade_group_from_class(assigned_class),
            care_certifications=[],
            schedule_type=ScheduleType.FIXED,
            employment_start=datetime(2020, 8, 1),
            active=True,
        )
        db.add(staff)
        staff_map[first] = staff

    # Fritidspedagoger
    for first, last, assigned_class in FRITIDSPEDAGOGER:
        idx += 1
        staff = Staff(
            id=uuid.uuid4(),
            personal_number=generate_personal_number(idx, "198"),
            first_name=first,
            last_name=last,
            role=StaffRole.LEISURE_EDUCATOR,
            grade_group=_grade_group_from_class(assigned_class),
            care_certifications=[],
            schedule_type=ScheduleType.FIXED,
            employment_start=datetime(2021, 1, 1),
            active=True,
        )
        db.add(staff)
        staff_map[first] = staff

    # Elevassistenter
    for first, last, assigned_class, certs_str in ELEVASSISTENTER:
        idx += 1
        certs = [c.strip() for c in certs_str.split(",") if c.strip()] if certs_str else []
        staff = Staff(
            id=uuid.uuid4(),
            personal_number=generate_personal_number(idx, "199"),
            first_name=first,
            last_name=last,
            role=StaffRole.ASSISTANT,
            grade_group=_grade_group_from_class(assigned_class),
            care_certifications=certs,
            schedule_type=ScheduleType.TWO_WEEK_ROTATION,
            employment_start=datetime(2022, 8, 1),
            active=True,
        )
        db.add(staff)
        staff_map[first] = staff

    db.flush()
    print(f"  {len(staff_map)} personal skapade.")
    return staff_map


def seed_work_hours(db, staff_map: dict):
    """Create work hours for all staff."""
    print("Skapar arbetstider...")
    count = 0

    for first_name, staff in staff_map.items():
        raw = STAFF_HOURS_RAW.get(first_name)

        if raw:
            start, end = raw
        elif staff.role == StaffRole.TEACHER:
            start, end = "07:45", "16:15"
        else:
            start, end = "08:00", "16:30"

        for weekday in range(5):
            # Friday often ends earlier for EA
            if weekday == 4 and staff.role == StaffRole.ASSISTANT:
                end_hour = int(end.split(":")[0])
                end_min = end.split(":")[1]
                fri_hour = max(13, end_hour - 1)
                day_end = f"{fri_hour:02d}:{end_min}"
            else:
                day_end = end

            # Calculate lunch time
            start_hour = int(start.split(":")[0])
            lunch_h = max(11, min(13, start_hour + 4))

            wh = WorkHour(
                id=uuid.uuid4(),
                staff_id=staff.id,
                weekday=weekday,
                week_number=0,
                start_time=start,
                end_time=day_end,
                lunch_start=f"{lunch_h:02d}:00",
                lunch_end=f"{lunch_h:02d}:30",
            )
            db.add(wh)
            count += 1

    db.flush()
    print(f"  {count} arbetstidsrader skapade.")


def seed_students(db, class_map: dict) -> dict:
    """Create all students and return a first_name->Student map."""
    print("Skapar elever...")
    student_map = {}
    idx = 0

    for first, last, grade, class_name, has_fritids, has_vard, vard_list, dubbel in STUDENTS:
        idx += 1
        class_obj = class_map.get(class_name)
        care_reqs = [c.strip() for c in vard_list.split(",") if c.strip()] if vard_list else []

        student = Student(
            id=uuid.uuid4(),
            personal_number=generate_personal_number(idx, "201"),
            first_name=first,
            last_name=last,
            class_id=class_obj.id if class_obj else None,
            grade=grade,
            has_care_needs=has_vard,
            care_requirements=care_reqs,
            preferred_staff=[],
            requires_double_staffing=dubbel,
            active=True,
        )
        db.add(student)
        student_map[first] = student

    db.flush()
    print(f"  {len(student_map)} elever skapade.")
    return student_map


def seed_care_times(db, student_map: dict):
    """Create care times for students with fritids."""
    print("Skapar omsorgstider...")
    count = 0
    today = datetime.now().date()
    week_start = today - timedelta(days=today.weekday())
    valid_from = datetime.combine(week_start, datetime.min.time())

    for first, last, grade, class_name, has_fritids, *_ in STUDENTS:
        if not has_fritids:
            continue

        student = student_map.get(first)
        if not student:
            continue

        raw = CARE_TIMES_RAW.get(first)
        if raw:
            start, end = raw
        else:
            start, end = "07:30", "16:00"

        for weekday in range(5):
            # Friday tends to end earlier
            if weekday == 4:
                end_hour = int(end.split(":")[0])
                end_min = end.split(":")[1]
                adj_hour = max(13, end_hour - 1)
                day_end = f"{adj_hour:02d}:{end_min}"
            else:
                day_end = end

            ct = CareTime(
                id=uuid.uuid4(),
                student_id=student.id,
                weekday=weekday,
                start_time=start,
                end_time=day_end,
                valid_from=valid_from,
                valid_to=None,
            )
            db.add(ct)
            count += 1

    db.flush()
    print(f"  {count} omsorgstider skapade.")


def seed_database():
    """Main seed function."""
    print("=" * 50)
    print("KÅLGÅRDENS SCHEMALÄGGNINGSSYSTEM - Database Seed")
    print("=" * 50)
    print()

    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        clear_database(db)
        print()

        class_map = seed_classes(db)
        staff_map = seed_staff(db)
        seed_work_hours(db, staff_map)
        student_map = seed_students(db, class_map)
        seed_care_times(db, student_map)

        db.commit()
        print()
        print("=" * 50)
        print("SEED KLAR!")
        print(f"  Klasser:      {len(class_map)}")
        print(f"  Personal:     {len(staff_map)}")
        print(f"  Elever:       {len(student_map)}")
        print(f"  Fritidselever: {sum(1 for s in STUDENTS if s[4])}")
        print("=" * 50)

    except Exception as e:
        db.rollback()
        print(f"\nFEL: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
