"""Check student and staff data"""

from app.database import SessionLocal
from app.models import Student, Staff, CareTime, WorkHour

db = SessionLocal()

print("="*60)
print("STUDENTS")
print("="*60)

students = db.query(Student).all()
for s in students:
    print(f"\n{s.full_name} (Grade {s.grade})")
    print(f"  Care needs: {s.has_care_needs}, {s.care_requirements}")
    print(f"  Double staffing: {s.requires_double_staffing}")

    care_times = db.query(CareTime).filter(CareTime.student_id == s.id).all()
    print(f"  Care times:")
    days = ["Mon", "Tue", "Wed", "Thu", "Fri"]
    for ct in care_times:
        print(f"    {days[ct.weekday]}: {ct.start_time}-{ct.end_time}")

print("\n" + "="*60)
print("STAFF")
print("="*60)

staff = db.query(Staff).all()
for s in staff:
    print(f"\n{s.full_name} ({s.role})")
    print(f"  Certifications: {s.care_certifications}")

    work_hours = db.query(WorkHour).filter(WorkHour.staff_id == s.id).all()
    print(f"  Work hours:")
    days = ["Mon", "Tue", "Wed", "Thu", "Fri"]
    for wh in work_hours:
        print(f"    {days[wh.weekday]}: {wh.start_time}-{wh.end_time} (lunch: {wh.lunch_start}-{wh.lunch_end})")

db.close()
