"""
Minimal test case to debug INFEASIBLE solver status.

Start with just 1 student and 1 staff member to isolate the issue.
"""

from app.database import SessionLocal, init_db
from app.models import Student, Staff, CareTime, WorkHour
from app.core import SchoolScheduler
from datetime import datetime

def test_minimal_schedule():
    """Test with minimal data: 1 student, 1 staff member"""

    # Initialize database
    init_db()
    db = SessionLocal()

    try:
        # Get William (no special needs) and Fadi
        william = db.query(Student).filter(Student.first_name == "William").first()
        fadi = db.query(Staff).filter(Staff.first_name == "Fadi").first()

        if not william or not fadi:
            print("ERROR: Could not find William or Fadi in database")
            return

        print(f"\n{'='*60}")
        print(f"MINIMAL TEST: 1 Student, 1 Staff Member")
        print(f"{'='*60}")
        print(f"\nStudent: {william.full_name}")
        print(f"  Grade: {william.grade}")
        print(f"  Care needs: {william.care_requirements}")
        print(f"  Double staffing: {william.requires_double_staffing}")

        # Get care times
        care_times = db.query(CareTime).filter(CareTime.student_id == william.id).all()
        print(f"  Care times:")
        for ct in care_times:
            print(f"    {['Mon','Tue','Wed','Thu','Fri'][ct.weekday]}: {ct.start_time}-{ct.end_time}")

        print(f"\nStaff: {fadi.full_name}")
        print(f"  Role: {fadi.role}")
        print(f"  Certifications: {fadi.care_certifications}")

        # Get work hours
        work_hours = db.query(WorkHour).filter(WorkHour.staff_id == fadi.id).all()
        print(f"  Work hours:")
        for wh in work_hours:
            print(f"    {['Mon','Tue','Wed','Thu','Fri'][wh.weekday]}: {wh.start_time}-{wh.end_time} (lunch: {wh.lunch_start}-{wh.lunch_end})")

        # Try to generate schedule with just these two
        print(f"\n{'='*60}")
        print(f"Attempting to generate schedule...")
        print(f"{'='*60}")

        scheduler = SchoolScheduler(max_solve_time_seconds=60)

        try:
            schedule = scheduler.create_schedule(
                students=[william],
                staff=[fadi],
                week_number=5,
                year=2026,
                absences=[]
            )

            print(f"\n✓ SUCCESS! Minimal schedule generated")
            print(f"  Status: {schedule.solver_status}")
            print(f"  Solve time: {schedule.solve_time_ms}ms")
            print(f"  Assignments: {len(schedule.assignments)}")

            for assignment in schedule.assignments[:5]:  # Show first 5
                print(f"    {assignment.staff.full_name} → {assignment.student.full_name}")
                print(f"      {['Mon','Tue','Wed','Thu','Fri'][assignment.weekday]} {assignment.start_time}-{assignment.end_time}")

        except Exception as e:
            print(f"\n✗ FAILED: {e}")
            import traceback
            traceback.print_exc()

    finally:
        db.close()


if __name__ == "__main__":
    test_minimal_schedule()
