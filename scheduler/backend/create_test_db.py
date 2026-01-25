"""
Create test database with mock data for development.
Uses SQLAlchemy models to ensure schema compatibility.
"""

import sys
from datetime import datetime
from sqlalchemy.orm import Session

# Import app components
from app.database import engine, Base, get_db
from app.models import Staff, Student, StaffRole, WorkHour, CareTime, ScheduleType

def create_tables():
    """Create all tables using SQLAlchemy models."""
    print("Creating tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("[OK] Tables created")


def insert_mock_data():
    """Insert mock data using SQLAlchemy models."""
    print("Inserting mock data...")

    # Create a session
    db = next(get_db())

    try:
        # Create mock staff
        staff_members = [
            Staff(
                personal_number="19850101-1234",
                first_name="Fadi",
                last_name="Andersson",
                role=StaffRole.ASSISTANT,
                care_certifications=["epilepsi"],
                employment_start=datetime.now(),
                active=True
            ),
            Staff(
                personal_number="19900202-2345",
                first_name="Jeanette",
                last_name="Berg",
                role=StaffRole.ASSISTANT,
                care_certifications=["diabetes"],
                employment_start=datetime.now(),
                active=True
            ),
            Staff(
                personal_number="19880303-3456",
                first_name="Georgette",
                last_name="Carlsson",
                role=StaffRole.ASSISTANT,
                care_certifications=[],
                employment_start=datetime.now(),
                active=True
            ),
            Staff(
                personal_number="19920404-4567",
                first_name="Stefan",
                last_name="Danielsson",
                role=StaffRole.ASSISTANT,
                care_certifications=[],
                employment_start=datetime.now(),
                active=True
            ),
            Staff(
                personal_number="19750505-5678",
                first_name="Emma",
                last_name="Eriksson",
                role=StaffRole.TEACHER,
                care_certifications=[],
                employment_start=datetime.now(),
                active=True
            ),
            Staff(
                personal_number="19830606-6789",
                first_name="Kim",
                last_name="Fredriksson",
                role=StaffRole.LEISURE_EDUCATOR,
                care_certifications=[],
                employment_start=datetime.now(),
                active=True
            ),
        ]

        for staff in staff_members:
            db.add(staff)

        print(f"[OK] Added {len(staff_members)} staff members")

        # Create mock students
        students_data = [
            Student(
                personal_number="20150101-1111",
                first_name="William",
                last_name="Andersson",
                class_id=None,  # No class assignment for now
                grade=2,
                has_care_needs=False,
                requires_double_staffing=False
            ),
            Student(
                personal_number="20140202-2222",
                first_name="Niklas",
                last_name="Berg",
                class_id=None,
                grade=3,
                has_care_needs=True,
                care_requirements=["epilepsi"],
                requires_double_staffing=False
            ),
            Student(
                personal_number="20160303-3333",
                first_name="Ivan",
                last_name="Carlsson",
                class_id=None,
                grade=1,
                has_care_needs=True,
                care_requirements=["diabetes"],
                requires_double_staffing=True
            ),
            Student(
                personal_number="20120404-4444",
                first_name="Emma",
                last_name="Danielsson",
                class_id=None,
                grade=5,
                has_care_needs=False,
                requires_double_staffing=False
            ),
            Student(
                personal_number="20110505-5555",
                first_name="Oliver",
                last_name="Eriksson",
                class_id=None,
                grade=6,
                has_care_needs=False,
                requires_double_staffing=False
            ),
        ]

        for student in students_data:
            db.add(student)

        print(f"[OK] Added {len(students_data)} students")

        # Commit to get IDs
        db.flush()

        # Add work hours for staff
        print("Adding work hours for staff...")
        work_hours_data = [
            # Fadi - arbetar måndag-fredag 06:00-14:00 (passar för morgonomsorg)
            WorkHour(
                staff_id=staff_members[0].id,
                weekday=0, week_number=None,  # Måndag, alla veckor
                start_time="06:00", end_time="14:00",
                lunch_start="11:00", lunch_end="11:30"
            ),
            WorkHour(
                staff_id=staff_members[0].id,
                weekday=1, week_number=None,
                start_time="06:00", end_time="14:00",
                lunch_start="11:00", lunch_end="11:30"
            ),
            WorkHour(
                staff_id=staff_members[0].id,
                weekday=2, week_number=None,
                start_time="06:00", end_time="14:00",
                lunch_start="11:00", lunch_end="11:30"
            ),
            WorkHour(
                staff_id=staff_members[0].id,
                weekday=3, week_number=None,
                start_time="06:00", end_time="14:00",
                lunch_start="11:00", lunch_end="11:30"
            ),
            WorkHour(
                staff_id=staff_members[0].id,
                weekday=4, week_number=None,
                start_time="06:00", end_time="14:00",
                lunch_start="11:00", lunch_end="11:30"
            ),

            # Jeanette - arbetar måndag-fredag 08:00-16:00 (skoltid)
            WorkHour(
                staff_id=staff_members[1].id,
                weekday=0, week_number=None,
                start_time="08:00", end_time="16:00",
                lunch_start="12:00", lunch_end="12:30"
            ),
            WorkHour(
                staff_id=staff_members[1].id,
                weekday=1, week_number=None,
                start_time="08:00", end_time="16:00",
                lunch_start="12:00", lunch_end="12:30"
            ),
            WorkHour(
                staff_id=staff_members[1].id,
                weekday=2, week_number=None,
                start_time="08:00", end_time="16:00",
                lunch_start="12:00", lunch_end="12:30"
            ),
            WorkHour(
                staff_id=staff_members[1].id,
                weekday=3, week_number=None,
                start_time="08:00", end_time="16:00",
                lunch_start="12:00", lunch_end="12:30"
            ),
            WorkHour(
                staff_id=staff_members[1].id,
                weekday=4, week_number=None,
                start_time="08:00", end_time="16:00",
                lunch_start="12:00", lunch_end="12:30"
            ),

            # Georgette - arbetar måndag-fredag 10:00-18:00 (eftermiddag/fritids)
            WorkHour(
                staff_id=staff_members[2].id,
                weekday=0, week_number=None,
                start_time="10:00", end_time="18:00",
                lunch_start="13:00", lunch_end="13:30"
            ),
            WorkHour(
                staff_id=staff_members[2].id,
                weekday=1, week_number=None,
                start_time="10:00", end_time="18:00",
                lunch_start="13:00", lunch_end="13:30"
            ),
            WorkHour(
                staff_id=staff_members[2].id,
                weekday=2, week_number=None,
                start_time="10:00", end_time="18:00",
                lunch_start="13:00", lunch_end="13:30"
            ),
            WorkHour(
                staff_id=staff_members[2].id,
                weekday=3, week_number=None,
                start_time="10:00", end_time="18:00",
                lunch_start="13:00", lunch_end="13:30"
            ),
            WorkHour(
                staff_id=staff_members[2].id,
                weekday=4, week_number=None,
                start_time="10:00", end_time="18:00",
                lunch_start="13:00", lunch_end="13:30"
            ),

            # Stefan - arbetar måndag-fredag 08:00-16:00 (assistent, skoltid)
            WorkHour(
                staff_id=staff_members[3].id,
                weekday=0, week_number=None,
                start_time="08:00", end_time="16:00",
                lunch_start="12:00", lunch_end="12:30"
            ),
            WorkHour(
                staff_id=staff_members[3].id,
                weekday=1, week_number=None,
                start_time="08:00", end_time="16:00",
                lunch_start="12:00", lunch_end="12:30"
            ),
            WorkHour(
                staff_id=staff_members[3].id,
                weekday=2, week_number=None,
                start_time="08:00", end_time="16:00",
                lunch_start="12:00", lunch_end="12:30"
            ),
            WorkHour(
                staff_id=staff_members[3].id,
                weekday=3, week_number=None,
                start_time="08:00", end_time="16:00",
                lunch_start="12:00", lunch_end="12:30"
            ),
            WorkHour(
                staff_id=staff_members[3].id,
                weekday=4, week_number=None,
                start_time="08:00", end_time="16:00",
                lunch_start="12:00", lunch_end="12:30"
            ),

            # Emma (pedagog) - arbetar måndag-fredag 08:00-16:00 (skoltid)
            WorkHour(
                staff_id=staff_members[4].id,
                weekday=0, week_number=None,
                start_time="08:00", end_time="16:00",
                lunch_start="12:00", lunch_end="12:30"
            ),
            WorkHour(
                staff_id=staff_members[4].id,
                weekday=1, week_number=None,
                start_time="08:00", end_time="16:00",
                lunch_start="12:00", lunch_end="12:30"
            ),
            WorkHour(
                staff_id=staff_members[4].id,
                weekday=2, week_number=None,
                start_time="08:00", end_time="16:00",
                lunch_start="12:00", lunch_end="12:30"
            ),
            WorkHour(
                staff_id=staff_members[4].id,
                weekday=3, week_number=None,
                start_time="08:00", end_time="16:00",
                lunch_start="12:00", lunch_end="12:30"
            ),
            WorkHour(
                staff_id=staff_members[4].id,
                weekday=4, week_number=None,
                start_time="08:00", end_time="16:00",
                lunch_start="12:00", lunch_end="12:30"
            ),

            # Kim (fritidspedagog) - arbetar måndag-fredag 13:00-18:00 (fritids)
            WorkHour(
                staff_id=staff_members[5].id,
                weekday=0, week_number=None,
                start_time="13:00", end_time="18:00",
                lunch_start="15:00", lunch_end="15:30"
            ),
            WorkHour(
                staff_id=staff_members[5].id,
                weekday=1, week_number=None,
                start_time="13:00", end_time="18:00",
                lunch_start="15:00", lunch_end="15:30"
            ),
            WorkHour(
                staff_id=staff_members[5].id,
                weekday=2, week_number=None,
                start_time="13:00", end_time="18:00",
                lunch_start="15:00", lunch_end="15:30"
            ),
            WorkHour(
                staff_id=staff_members[5].id,
                weekday=3, week_number=None,
                start_time="13:00", end_time="18:00",
                lunch_start="15:00", lunch_end="15:30"
            ),
            WorkHour(
                staff_id=staff_members[5].id,
                weekday=4, week_number=None,
                start_time="13:00", end_time="18:00",
                lunch_start="15:00", lunch_end="15:30"
            ),
        ]

        for work_hour in work_hours_data:
            db.add(work_hour)

        print(f"[OK] Added {len(work_hours_data)} work hour entries")

        # Add care times for students
        print("Adding care times for students...")
        care_times_data = [
            # William - behöver omsorg 06:00-08:00 (morgon innan skolan)
            CareTime(
                student_id=students_data[0].id,
                weekday=0,  # Måndag
                start_time="06:00", end_time="08:00",
                valid_from=datetime(2026, 1, 1)
            ),
            CareTime(
                student_id=students_data[0].id,
                weekday=1, start_time="06:00", end_time="08:00",
                valid_from=datetime(2026, 1, 1)
            ),
            CareTime(
                student_id=students_data[0].id,
                weekday=2, start_time="06:00", end_time="08:00",
                valid_from=datetime(2026, 1, 1)
            ),
            CareTime(
                student_id=students_data[0].id,
                weekday=3, start_time="06:00", end_time="08:00",
                valid_from=datetime(2026, 1, 1)
            ),
            CareTime(
                student_id=students_data[0].id,
                weekday=4, start_time="06:00", end_time="08:00",
                valid_from=datetime(2026, 1, 1)
            ),

            # Niklas (epilepsi) - behöver omsorg 08:00-14:00 (behöver certifierad personal, Fadi är tillgänglig)
            CareTime(
                student_id=students_data[1].id,
                weekday=0, start_time="08:00", end_time="14:00",
                valid_from=datetime(2026, 1, 1)
            ),
            CareTime(
                student_id=students_data[1].id,
                weekday=1, start_time="08:00", end_time="14:00",
                valid_from=datetime(2026, 1, 1)
            ),
            CareTime(
                student_id=students_data[1].id,
                weekday=2, start_time="08:00", end_time="14:00",
                valid_from=datetime(2026, 1, 1)
            ),
            CareTime(
                student_id=students_data[1].id,
                weekday=3, start_time="08:00", end_time="14:00",
                valid_from=datetime(2026, 1, 1)
            ),
            CareTime(
                student_id=students_data[1].id,
                weekday=4, start_time="08:00", end_time="14:00",
                valid_from=datetime(2026, 1, 1)
            ),

            # Ivan (diabetes, dubbelbemanning) - behöver omsorg 08:00-16:00 (Jeanette + 1 till)
            CareTime(
                student_id=students_data[2].id,
                weekday=0, start_time="08:00", end_time="16:00",
                valid_from=datetime(2026, 1, 1)
            ),
            CareTime(
                student_id=students_data[2].id,
                weekday=1, start_time="08:00", end_time="16:00",
                valid_from=datetime(2026, 1, 1)
            ),
            CareTime(
                student_id=students_data[2].id,
                weekday=2, start_time="08:00", end_time="16:00",
                valid_from=datetime(2026, 1, 1)
            ),
            CareTime(
                student_id=students_data[2].id,
                weekday=3, start_time="08:00", end_time="16:00",
                valid_from=datetime(2026, 1, 1)
            ),
            CareTime(
                student_id=students_data[2].id,
                weekday=4, start_time="08:00", end_time="16:00",
                valid_from=datetime(2026, 1, 1)
            ),

            # Emma (elev) - behöver fritids 15:00-17:00 (efter skolan, kortare tid)
            CareTime(
                student_id=students_data[3].id,
                weekday=0, start_time="15:00", end_time="17:00",
                valid_from=datetime(2026, 1, 1)
            ),
            CareTime(
                student_id=students_data[3].id,
                weekday=1, start_time="15:00", end_time="17:00",
                valid_from=datetime(2026, 1, 1)
            ),
            CareTime(
                student_id=students_data[3].id,
                weekday=2, start_time="15:00", end_time="17:00",
                valid_from=datetime(2026, 1, 1)
            ),
            CareTime(
                student_id=students_data[3].id,
                weekday=3, start_time="15:00", end_time="17:00",
                valid_from=datetime(2026, 1, 1)
            ),
            CareTime(
                student_id=students_data[3].id,
                weekday=4, start_time="15:00", end_time="17:00",
                valid_from=datetime(2026, 1, 1)
            ),

            # Oliver - behöver fritids 15:00-17:00 (efter skolan)
            CareTime(
                student_id=students_data[4].id,
                weekday=0, start_time="15:00", end_time="17:00",
                valid_from=datetime(2026, 1, 1)
            ),
            CareTime(
                student_id=students_data[4].id,
                weekday=1, start_time="15:00", end_time="17:00",
                valid_from=datetime(2026, 1, 1)
            ),
            CareTime(
                student_id=students_data[4].id,
                weekday=2, start_time="15:00", end_time="17:00",
                valid_from=datetime(2026, 1, 1)
            ),
            CareTime(
                student_id=students_data[4].id,
                weekday=3, start_time="15:00", end_time="17:00",
                valid_from=datetime(2026, 1, 1)
            ),
            CareTime(
                student_id=students_data[4].id,
                weekday=4, start_time="15:00", end_time="17:00",
                valid_from=datetime(2026, 1, 1)
            ),
        ]

        for care_time in care_times_data:
            db.add(care_time)

        print(f"[OK] Added {len(care_times_data)} care time entries")

        db.commit()
        print("[OK] All mock data committed to database")

    except Exception as e:
        print(f"[ERROR] Failed to insert data: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 60)
    print("Creating SQLite test database...")
    print("=" * 60)

    try:
        create_tables()
        insert_mock_data()

        print("\n" + "=" * 60)
        print("[OK] Database ready!")
        print("=" * 60)
        print("\nYou can now:")
        print("1. Test API at http://localhost:8000/docs")
        print("2. Test frontend at http://localhost:5173")
        print("\nEndpoints available:")
        print("  - GET /api/v1/staff")
        print("  - GET /api/v1/students")
        print("=" * 60)

    except Exception as e:
        print(f"\n[ERROR] Database setup failed: {e}")
        sys.exit(1)
