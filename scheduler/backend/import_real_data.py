"""
Import real data from Excel file into the database.
"""

import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime

from app.models.student import Student, CareTime
from app.models.staff import Staff, WorkHour
from app.database import Base
from parse_excel import parse_schedule_excel


# Known care requirements from plan documentation
CARE_REQUIREMENTS_MAP = {
    'Niklas': {
        'requirements': ['epilepsy'],
        'double_staffing': False
    },
    'Ivan': {
        'requirements': ['diabetes'],
        'double_staffing': True
    },
    # Add more as we discover them
}

# Known staff certifications from plan documentation
STAFF_CERTIFICATIONS_MAP = {
    'Fadi A': ['epilepsy'],  # From plan: Fadi is epilepsy-certified
    'Jeanette': ['diabetes'],  # From plan: Jeanette is diabetes-certified
    'Cia': [],
    'Emma': [],
    'Stefan': [],
    'Kim': [],
    'Kristina': [],
    'Georgette': [],
    # Add more as we discover them
}


def import_data(database_url: str, excel_file: str):
    """Import data from Excel to database."""

    # Create database engine
    engine = create_engine(database_url)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        # Parse Excel file
        print("Parsing Excel file...")
        data = parse_schedule_excel(excel_file)

        print(f"Found {len(data['students'])} students and {len(data['staff'])} staff")

        # Clear existing data
        print("\nClearing existing data...")
        db.query(CareTime).delete()
        db.query(Student).delete()
        db.query(WorkHour).delete()
        db.query(Staff).delete()
        db.commit()

        # Import students
        print("\nImporting students...")
        student_map = {}  # name -> Student object

        for idx, student_data in enumerate(data['students']):
            name_parts = student_data['name'].split()
            first_name = name_parts[0] if name_parts else student_data['name']
            last_name = ' '.join(name_parts[1:]) if len(name_parts) > 1 else ''

            # Check if student has known care requirements
            care_info = CARE_REQUIREMENTS_MAP.get(student_data['name'], {})

            # Generate personal number (placeholder: YYYYMMDD-XXXX)
            personal_number = f"20100101-{idx:04d}"

            student = Student(
                first_name=first_name,
                last_name=last_name,
                personal_number=personal_number,
                class_id=None,  # No SchoolClass objects yet
                grade=int(student_data['class'][0]) if student_data['class'] and student_data['class'][0].isdigit() else 1,
                has_care_needs=len(care_info.get('requirements', [])) > 0,
                care_requirements=care_info.get('requirements', []),
                requires_double_staffing=care_info.get('double_staffing', False),
                active=True
            )

            db.add(student)
            db.flush()  # Get ID

            student_map[student_data['name']] = student

            # Add care times
            for care_time in student_data['care_times']:
                # Convert HH:MM:SS to HH:MM
                start_time = care_time['start_time'][:5] if len(care_time['start_time']) > 5 else care_time['start_time']
                end_time = care_time['end_time'][:5] if len(care_time['end_time']) > 5 else care_time['end_time']

                ct = CareTime(
                    student_id=student.id,
                    weekday=care_time['weekday'],
                    start_time=start_time,
                    end_time=end_time,
                    valid_from=datetime(2026, 1, 1),  # Start of year
                    valid_to=None  # Indefinite
                )
                db.add(ct)

            class_str = student_data['class'] or 'N/A'
            print(f"  + {student.full_name:30s} | Class: {class_str:5s} | Care days: {len(student_data['care_times'])}")

        db.commit()
        print(f"\nImported {len(student_map)} students successfully")

        # Import staff
        print("\nImporting staff...")
        staff_map = {}  # name -> Staff object

        for staff_data in data['staff']:
            name_parts = staff_data['name'].split()
            first_name = name_parts[0] if name_parts else staff_data['name']
            last_name = ' '.join(name_parts[1:]) if len(name_parts) > 1 else ''

            # Determine role based on assignments (heuristic)
            # If only fritids assignments, likely LEISURE_EDUCATOR
            # Otherwise, ASSISTANT
            assignments = staff_data.get('assignments', [])
            role = 'ASSISTANT'  # Default
            if assignments and all(a['period'].startswith('fritids') for a in assignments):
                role = 'LEISURE_EDUCATOR'

            # Get certifications for this staff member
            certifications = STAFF_CERTIFICATIONS_MAP.get(staff_data['name'], [])

            # Generate personal number (placeholder: YYYYMMDD-XXXX)
            # In real system, this would come from HR database
            personal_number = f"19900101-{len(staff_map):04d}"

            staff = Staff(
                first_name=first_name,
                last_name=last_name,
                personal_number=personal_number,
                role=role,
                care_certifications=certifications,
                employment_start=datetime(2024, 1, 1),  # Placeholder
                active=True
            )

            db.add(staff)
            db.flush()  # Get ID

            staff_map[staff_data['name']] = staff

            # Add work hours from Excel data
            work_hours_data = staff_data.get('work_hours', [])
            if work_hours_data:
                for wh in work_hours_data:
                    # Convert HH:MM:SS to HH:MM
                    start_time = wh['start_time'][:5] if len(wh['start_time']) > 5 else wh['start_time']
                    end_time = wh['end_time'][:5] if len(wh['end_time']) > 5 else wh['end_time']

                    # Calculate lunch times (assume lunch in middle of shift, 30min duration)
                    # Parse start and end to calculate middle
                    start_h, start_m = map(int, start_time.split(':'))
                    end_h, end_m = map(int, end_time.split(':'))
                    total_mins = (end_h * 60 + end_m) - (start_h * 60 + start_m)
                    mid_mins = (start_h * 60 + start_m) + (total_mins // 2)
                    lunch_start_h = mid_mins // 60
                    lunch_start_m = mid_mins % 60
                    lunch_end_m = lunch_start_m + 30
                    lunch_end_h = lunch_start_h
                    if lunch_end_m >= 60:
                        lunch_end_h += 1
                        lunch_end_m -= 60

                    work_hour = WorkHour(
                        staff_id=staff.id,
                        weekday=wh['weekday'],
                        week_number=None,  # All weeks
                        start_time=start_time,
                        end_time=end_time,
                        lunch_start=f"{lunch_start_h:02d}:{lunch_start_m:02d}",
                        lunch_end=f"{lunch_end_h:02d}:{lunch_end_m:02d}"
                    )
                    db.add(work_hour)
            else:
                # No work hours in Excel - use default Monday-Friday 06:00-18:00
                for weekday in range(5):
                    work_hour = WorkHour(
                        staff_id=staff.id,
                        weekday=weekday,
                        week_number=None,
                        start_time='06:00',
                        end_time='18:00',
                        lunch_start='11:00',
                        lunch_end='11:30'
                    )
                    db.add(work_hour)

            certs_str = ', '.join(certifications) if certifications else 'none'
            print(f"  + {staff.full_name:30s} | Role: {role:20s} | Certs: {certs_str}")

        db.commit()
        print(f"\nImported {len(staff_map)} staff members successfully")

        # Summary
        print("\n" + "=" * 80)
        print("IMPORT COMPLETE")
        print("=" * 80)
        print(f"Students: {len(student_map)}")
        print(f"Staff: {len(staff_map)}")
        print(f"Students with care needs: {sum(1 for s in student_map.values() if s.has_care_needs)}")
        print(f"Students with double staffing: {sum(1 for s in student_map.values() if s.requires_double_staffing)}")
        print(f"Staff with certifications: {sum(1 for s in staff_map.values() if s.care_certifications)}")

    except Exception as e:
        db.rollback()
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == '__main__':
    # Use the same database as test data
    DATABASE_URL = "sqlite:///./test_scheduler.db"
    EXCEL_FILE = "../../Schema att maila Joel.xlsx"

    print("=" * 80)
    print("IMPORTING REAL DATA FROM EXCEL")
    print("=" * 80)
    print(f"Database: {DATABASE_URL}")
    print(f"Excel file: {EXCEL_FILE}")
    print()

    import_data(DATABASE_URL, EXCEL_FILE)
