"""
Tests for the OR-Tools scheduler core.
"""

import pytest
from datetime import datetime, timedelta
from uuid import uuid4

from app.core.scheduler import SchoolScheduler, SchedulingError
from app.models import (
    Student, Staff, Schedule, WorkHour, CareTime, Absence,
    StaffRole, ScheduleType, GradeGroup, SolverStatus, AbsenceReason
)


class TestSchoolScheduler:
    """Test cases for the main scheduling engine."""

    def test_create_simple_schedule(
        self,
        db_session,
        sample_student_no_care_needs,
        sample_staff_assistant,
        sample_staff_teacher
    ):
        """Test creating a simple schedule with one student and two staff."""
        scheduler = SchoolScheduler()

        students = [sample_student_no_care_needs]
        staff = [sample_staff_assistant, sample_staff_teacher]

        schedule = scheduler.create_schedule(
            students=students,
            staff=staff,
            week_number=12,
            year=2026,
            db_session=db_session
        )

        assert schedule is not None
        assert schedule.week_number == 12
        assert schedule.year == 2026
        assert schedule.solver_status in [SolverStatus.OPTIMAL, SolverStatus.FEASIBLE]
        assert schedule.hard_constraints_met == True
        assert len(schedule.assignments) > 0

    def test_care_needs_matching(
        self,
        db_session,
        sample_student_with_care_needs,
        sample_staff_assistant,  # Has epilepsy certification
        sample_staff_teacher  # No certifications
    ):
        """Test that students with care needs are matched to certified staff."""
        scheduler = SchoolScheduler()

        students = [sample_student_with_care_needs]
        staff = [sample_staff_assistant, sample_staff_teacher]

        schedule = scheduler.create_schedule(
            students=students,
            staff=staff,
            week_number=12,
            year=2026,
            db_session=db_session
        )

        # Find assignments for the student with care needs
        care_assignments = [
            a for a in schedule.assignments
            if a.student_id == sample_student_with_care_needs.id
        ]

        # All one-to-one assignments should be with certified staff
        for assignment in care_assignments:
            if assignment.assignment_type.value == "one_to_one":
                # Should be assigned to assistant with epilepsy certification
                assert assignment.staff_id == sample_staff_assistant.id

    def test_staff_availability_constraint(
        self,
        db_session,
        sample_student_no_care_needs,
        sample_staff_assistant,
        sample_absence
    ):
        """Test that staff are not assigned when they have absences."""
        scheduler = SchoolScheduler()

        students = [sample_student_no_care_needs]
        staff = [sample_staff_assistant]
        absences = [sample_absence]

        schedule = scheduler.create_schedule(
            students=students,
            staff=staff,
            week_number=12,
            year=2026,
            absences=absences,
            db_session=db_session
        )

        # Convert absence date to weekday
        absence_weekday = sample_absence.absence_date.weekday()

        # Find assignments on the absence day
        absence_day_assignments = [
            a for a in schedule.assignments
            if a.weekday == absence_weekday and a.staff_id == sample_staff_assistant.id
        ]

        # Should be no assignments for this staff on absence day
        assert len(absence_day_assignments) == 0

    def test_working_hours_limit(
        self,
        db_session,
        sample_school_class
    ):
        """Test that staff don't exceed 40 hours per week."""
        # Create multiple students
        students = []
        for i in range(10):
            student = Student(
                id=uuid4(),
                personal_number=f"150101{1000+i}",
                first_name=f"Student{i}",
                last_name="Test",
                class_id=sample_school_class.id,
                grade=1 + (i % 6),
                has_care_needs=False,
                active=True
            )
            db_session.add(student)

            # Add care times (08:00-16:00, Monday-Friday)
            for weekday in range(5):
                care_time = CareTime(
                    id=uuid4(),
                    student_id=student.id,
                    weekday=weekday,
                    start_time="08:00",
                    end_time="16:00",
                    valid_from=datetime.now() - timedelta(days=30)
                )
                db_session.add(care_time)

            students.append(student)

        db_session.commit()

        # Create one staff member
        staff_member = Staff(
            id=uuid4(),
            personal_number="8001011234",
            first_name="Test",
            last_name="Staff",
            role=StaffRole.ASSISTANT,
            care_certifications=[],
            schedule_type=ScheduleType.FIXED,
            employment_start=datetime.now() - timedelta(days=365),
            active=True
        )
        db_session.add(staff_member)

        # Add work hours (08:00-16:00, 40 hours max)
        for weekday in range(5):
            work_hour = WorkHour(
                id=uuid4(),
                staff_id=staff_member.id,
                weekday=weekday,
                week_number=0,
                start_time="08:00",
                end_time="16:00",
                lunch_start="12:00",
                lunch_end="13:00"
            )
            db_session.add(work_hour)

        db_session.commit()

        scheduler = SchoolScheduler()

        schedule = scheduler.create_schedule(
            students=students,
            staff=[staff_member],
            week_number=12,
            year=2026,
            db_session=db_session
        )

        # Calculate total hours for staff member
        total_hours = 0.0
        for assignment in schedule.assignments:
            if assignment.staff_id == staff_member.id:
                start_h, start_m = map(int, assignment.start_time.split(':'))
                end_h, end_m = map(int, assignment.end_time.split(':'))
                hours = (end_h * 60 + end_m - start_h * 60 - start_m) / 60
                total_hours += hours

        # Should not exceed 40 hours
        assert total_hours <= 40.0

    def test_no_solution_scenario(
        self,
        db_session,
        sample_student_with_care_needs,
        sample_staff_teacher  # Teacher has no care certifications
    ):
        """Test that scheduler returns INFEASIBLE when constraints cannot be met."""
        scheduler = SchoolScheduler()

        # Student with epilepsy needs, but no certified staff available
        students = [sample_student_with_care_needs]
        staff = [sample_staff_teacher]  # No certifications

        schedule = scheduler.create_schedule(
            students=students,
            staff=staff,
            week_number=12,
            year=2026,
            db_session=db_session
        )

        # Should be infeasible because care needs can't be matched
        assert schedule.solver_status == SolverStatus.INFEASIBLE
        assert schedule.hard_constraints_met == False

    def test_preference_matching(
        self,
        db_session,
        sample_school_class
    ):
        """Test that student preferences are respected when possible."""
        # Create staff
        preferred_staff = Staff(
            id=uuid4(),
            personal_number="8501011234",
            first_name="Preferred",
            last_name="Staff",
            role=StaffRole.ASSISTANT,
            care_certifications=[],
            schedule_type=ScheduleType.FIXED,
            employment_start=datetime.now() - timedelta(days=365),
            active=True
        )
        db_session.add(preferred_staff)

        other_staff = Staff(
            id=uuid4(),
            personal_number="8601011234",
            first_name="Other",
            last_name="Staff",
            role=StaffRole.ASSISTANT,
            care_certifications=[],
            schedule_type=ScheduleType.FIXED,
            employment_start=datetime.now() - timedelta(days=365),
            active=True
        )
        db_session.add(other_staff)

        # Add work hours for both
        for staff_member in [preferred_staff, other_staff]:
            for weekday in range(5):
                work_hour = WorkHour(
                    id=uuid4(),
                    staff_id=staff_member.id,
                    weekday=weekday,
                    week_number=0,
                    start_time="08:00",
                    end_time="16:00",
                    lunch_start="12:00",
                    lunch_end="13:00"
                )
                db_session.add(work_hour)

        db_session.commit()

        # Create student with preference
        student = Student(
            id=uuid4(),
            personal_number="1501011234",
            first_name="Test",
            last_name="Student",
            class_id=sample_school_class.id,
            grade=2,
            has_care_needs=False,
            preferred_staff=[str(preferred_staff.id)],  # Prefer specific staff
            active=True
        )
        db_session.add(student)

        for weekday in range(5):
            care_time = CareTime(
                id=uuid4(),
                student_id=student.id,
                weekday=weekday,
                start_time="08:00",
                end_time="14:00",
                valid_from=datetime.now() - timedelta(days=30)
            )
            db_session.add(care_time)

        db_session.commit()

        scheduler = SchoolScheduler()

        schedule = scheduler.create_schedule(
            students=[student],
            staff=[preferred_staff, other_staff],
            week_number=12,
            year=2026,
            db_session=db_session
        )

        # Count assignments with preferred staff
        preferred_assignments = sum(
            1 for a in schedule.assignments
            if a.student_id == student.id and a.staff_id == preferred_staff.id
        )

        other_assignments = sum(
            1 for a in schedule.assignments
            if a.student_id == student.id and a.staff_id == other_staff.id
        )

        # Should prefer the preferred staff (soft constraint)
        assert preferred_assignments > other_assignments

    def test_solve_time_limit(
        self,
        db_session,
        sample_student_no_care_needs,
        sample_staff_assistant
    ):
        """Test that solver respects time limit."""
        scheduler = SchoolScheduler()

        schedule = scheduler.create_schedule(
            students=[sample_student_no_care_needs],
            staff=[sample_staff_assistant],
            week_number=12,
            year=2026,
            max_solve_time_seconds=5,  # Short time limit
            db_session=db_session
        )

        # Should complete within time limit
        assert schedule.solve_time_ms < 6000  # 6 seconds (with some margin)
        assert schedule.solver_status in [
            SolverStatus.OPTIMAL,
            SolverStatus.FEASIBLE,
            SolverStatus.TIMEOUT
        ]
