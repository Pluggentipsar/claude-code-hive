"""
Test the scheduler with real data imported from Excel.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.student import Student
from app.models.staff import Staff
from app.core.scheduler import SchoolScheduler

# Database connection
DATABASE_URL = "sqlite:///./test_scheduler.db"
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
db = Session()

try:
    # Load students and staff
    print("Loading data from database...")
    students = db.query(Student).filter(Student.active.is_(True)).all()
    staff = db.query(Staff).filter(Staff.active.is_(True)).all()

    print(f"  Students: {len(students)}")
    print(f"  Staff: {len(staff)}")
    print()

    # Create scheduler
    print("Creating scheduler...")
    scheduler = SchoolScheduler()

    # Generate schedule for week 3 of 2026
    print("Generating schedule for week 3, year 2026...")
    print("=" * 80)

    schedule = scheduler.create_schedule(
        students=students,
        staff=staff,
        week_number=3,
        year=2026,
        absences=None
    )

    print("\n" + "=" * 80)
    print("RESULT:")
    print("=" * 80)
    print(f"Solver status: {schedule.solver_status}")
    print(f"Objective value: {schedule.objective_value}")
    print(f"Solve time: {schedule.solve_time:.2f} seconds")
    print(f"Assignments created: {len(schedule.assignments)}")
    print()

    if schedule.solver_status in ['OPTIMAL', 'FEASIBLE']:
        print("SUCCESS - Schedule generated!")

        # Show some sample assignments
        print("\nSample assignments (first 10):")
        for i, assignment in enumerate(schedule.assignments[:10]):
            weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
            student_name = db.query(Student).filter(Student.id == assignment.student_id).first().full_name
            staff_name = db.query(Staff).filter(Staff.id == assignment.staff_id).first().full_name
            print(f"  {weekdays[assignment.weekday]} {assignment.start_time}-{assignment.end_time}: {staff_name} -> {student_name}")

        if len(schedule.assignments) > 10:
            print(f"  ... and {len(schedule.assignments) - 10} more assignments")
    else:
        print(f"FAILED - Solver status: {schedule.solver_status}")
        print("The schedule is INFEASIBLE with current constraints.")

except Exception as e:
    print(f"\nERROR: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
