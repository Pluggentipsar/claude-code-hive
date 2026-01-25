"""Test schedule with only students who have special care needs"""

from app.database import SessionLocal, init_db
from app.models import Student, Staff
from app.core import SchoolScheduler

init_db()
db = SessionLocal()

try:
    # Get students with care needs
    niklas = db.query(Student).filter(Student.first_name == "Niklas").first()  # epilepsy
    ivan = db.query(Student).filter(Student.first_name == "Ivan").first()  # diabetes + double

    # Get all staff
    staff = db.query(Staff).filter(Staff.active.is_(True)).all()

    print("="*60)
    print("Testing students with care needs")
    print("="*60)

    # Test 1: Just Niklas (epilepsy)
    print("\n--- Test 1: Niklas only (epilepsy) ---")
    scheduler = SchoolScheduler(max_solve_time_seconds=60)
    try:
        schedule = scheduler.create_schedule(
            students=[niklas],
            staff=staff,
            week_number=5,
            year=2026,
            absences=[]
        )
        print(f"SUCCESS! Status: {schedule.solver_status}")
    except Exception as e:
        print(f"FAILED: {e}")

    # Test 2: Just Ivan (diabetes + double staffing)
    print("\n--- Test 2: Ivan only (diabetes + double staffing) ---")
    scheduler = SchoolScheduler(max_solve_time_seconds=60)
    try:
        schedule = scheduler.create_schedule(
            students=[ivan],
            staff=staff,
            week_number=5,
            year=2026,
            absences=[]
        )
        print(f"SUCCESS! Status: {schedule.solver_status}")
    except Exception as e:
        print(f"FAILED: {e}")

    # Test 3: Both together
    print("\n--- Test 3: Niklas + Ivan together ---")
    scheduler = SchoolScheduler(max_solve_time_seconds=60)
    try:
        schedule = scheduler.create_schedule(
            students=[niklas, ivan],
            staff=staff,
            week_number=5,
            year=2026,
            absences=[]
        )
        print(f"SUCCESS! Status: {schedule.solver_status}")
        print(f"Assignments: {len(schedule.assignments)}")
    except Exception as e:
        print(f"FAILED: {e}")

finally:
    db.close()
