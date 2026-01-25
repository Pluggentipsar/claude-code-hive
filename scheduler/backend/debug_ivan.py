"""Debug why Ivan (double staffing) is INFEASIBLE"""

from app.database import SessionLocal
from app.models import Student, Staff

db = SessionLocal()

ivan = db.query(Student).filter(Student.first_name == "Ivan").first()

print("="*60)
print("IVAN'S REQUIREMENTS")
print("="*60)
print(f"Care times: {[(ct.weekday, ct.start_time, ct.end_time) for ct in ivan.care_times]}")
print(f"Care requirements: {ivan.care_requirements}")
print(f"Double staffing: {ivan.requires_double_staffing}")

print("\n" + "="*60)
print("AVAILABLE STAFF FOR IVAN (08:00-16:00)")
print("="*60)

staff = db.query(Staff).all()

diabetes_certified = []
available_all_day = []
partially_available = []

for s in staff:
    # Check diabetes certification
    has_diabetes = 'diabetes' in (s.care_certifications or [])

    # Check availability 08:00-16:00
    if s.work_hours:
        wh = s.work_hours[0]  # All have same hours Mon-Fri

        covers_full_time = wh.start_time <= '08:00' and wh.end_time >= '16:00'
        covers_partial = (wh.start_time < '16:00' and wh.end_time > '08:00')

        if has_diabetes:
            print(f"\n{s.full_name} (DIABETES-CERTIFIED)")
            print(f"  Works: {wh.start_time}-{wh.end_time}")
            print(f"  Covers full time: {covers_full_time}")
            diabetes_certified.append(s)
        elif covers_full_time:
            print(f"\n{s.full_name}")
            print(f"  Works: {wh.start_time}-{wh.end_time}")
            print(f"  Covers full time: YES")
            available_all_day.append(s)
        elif covers_partial:
            print(f"\n{s.full_name}")
            print(f"  Works: {wh.start_time}-{wh.end_time}")
            print(f"  Covers full time: NO (partial: {max('08:00', wh.start_time)}-{min('16:00', wh.end_time)})")
            partially_available.append(s)

print("\n" + "="*60)
print("SUMMARY")
print("="*60)
print(f"Diabetes-certified staff: {len(diabetes_certified)}")
print(f"Available full-time (08:00-16:00): {len(available_all_day)}")
print(f"Available part-time: {len(partially_available)}")

print("\nFor double-staffing to work, we need:")
print("  1. Jeanette (diabetes) for full 08:00-16:00")
print("  2. At least ONE other staff for full 08:00-16:00")
print(f"\nCan satisfy? {len(available_all_day) >= 1}")

if len(available_all_day) >= 1:
    print(f"\nSuggested pairing: Jeanette + {available_all_day[0].full_name}")
else:
    print("\nPROBLEM: No single staff member can cover the full 08:00-16:00 alongside Jeanette")
    print("Need to either:")
    print("  1. Shorten Ivan's care time")
    print("  2. Add staff with longer hours")
    print("  3. Allow staff transitions (different staff for different parts of the day)")

db.close()
