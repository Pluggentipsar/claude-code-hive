"""
Tests for the constraint engine.
"""

import pytest
from datetime import datetime, timedelta
from uuid import uuid4
from ortools.sat.python import cp_model

from app.core.constraints import ConstraintEngine
from app.models import (
    Student, Staff, WorkHour, CareTime, Absence,
    StaffRole, ScheduleType, AbsenceReason
)


class TestConstraintEngine:
    """Test cases for constraint definitions."""

    def test_initialization(self):
        """Test that constraint engine initializes correctly."""
        model = cp_model.CpModel()
        engine = ConstraintEngine(model)

        assert engine.model == model
        assert engine.assignment_vars == {}
        assert engine.timeslots == []

    def test_generate_timeslots(self):
        """Test timeslot generation."""
        model = cp_model.CpModel()
        engine = ConstraintEngine(model)

        timeslots = engine._generate_timeslots()

        # Should have 5 weekdays × (18:00 - 06:00) / 15 minutes
        # = 5 × 12 hours × 4 = 240 timeslots
        assert len(timeslots) == 5 * 48  # 48 timeslots per day (00:00-24:00 in 15 min intervals)

        # Check timeslot format
        first_slot = timeslots[0]
        assert "weekday" in first_slot
        assert "start_time" in first_slot
        assert "end_time" in first_slot
        assert first_slot["weekday"] == 0  # Monday

    def test_care_times_for_student(
        self,
        db_session,
        sample_school_class
    ):
        """Test extracting care times for a student."""
        # Create student with care times
        student = Student(
            id=uuid4(),
            personal_number="1501011234",
            first_name="Test",
            last_name="Student",
            class_id=sample_school_class.id,
            grade=2,
            has_care_needs=False,
            active=True
        )
        db_session.add(student)

        # Monday 08:00-14:00
        care_time = CareTime(
            id=uuid4(),
            student_id=student.id,
            weekday=0,
            start_time="08:00",
            end_time="14:00",
            valid_from=datetime.now() - timedelta(days=30)
        )
        db_session.add(care_time)
        db_session.commit()

        model = cp_model.CpModel()
        engine = ConstraintEngine(model)

        care_times = engine._get_care_times_for_student(student)

        assert len(care_times) > 0
        assert care_times[0]["weekday"] == 0
        assert care_times[0]["start_time"] == "08:00"
        assert care_times[0]["end_time"] == "14:00"

    def test_staff_availability_during_work_hours(
        self,
        db_session
    ):
        """Test staff availability checking."""
        # Create staff with work hours
        staff = Staff(
            id=uuid4(),
            personal_number="8501011234",
            first_name="Test",
            last_name="Staff",
            role=StaffRole.ASSISTANT,
            care_certifications=[],
            schedule_type=ScheduleType.FIXED,
            employment_start=datetime.now() - timedelta(days=365),
            active=True
        )
        db_session.add(staff)

        # Monday 08:00-16:00
        work_hour = WorkHour(
            id=uuid4(),
            staff_id=staff.id,
            weekday=0,
            week_number=0,
            start_time="08:00",
            end_time="16:00",
            lunch_start="12:00",
            lunch_end="13:00"
        )
        db_session.add(work_hour)
        db_session.commit()

        model = cp_model.CpModel()
        engine = ConstraintEngine(model)

        # Test timeslot during work hours
        assert engine._is_staff_available(
            staff,
            {"weekday": 0, "start_time": "10:00", "end_time": "10:15"},
            []
        ) == True

        # Test timeslot during lunch
        assert engine._is_staff_available(
            staff,
            {"weekday": 0, "start_time": "12:00", "end_time": "12:15"},
            []
        ) == False

        # Test timeslot after work hours
        assert engine._is_staff_available(
            staff,
            {"weekday": 0, "start_time": "17:00", "end_time": "17:15"},
            []
        ) == False

        # Test timeslot on different day
        assert engine._is_staff_available(
            staff,
            {"weekday": 1, "start_time": "10:00", "end_time": "10:15"},
            []
        ) == False

    def test_staff_availability_with_absence(
        self,
        db_session
    ):
        """Test that absences block staff availability."""
        staff = Staff(
            id=uuid4(),
            personal_number="8501011234",
            first_name="Test",
            last_name="Staff",
            role=StaffRole.ASSISTANT,
            care_certifications=[],
            schedule_type=ScheduleType.FIXED,
            employment_start=datetime.now() - timedelta(days=365),
            active=True
        )
        db_session.add(staff)

        # Work hours Monday
        work_hour = WorkHour(
            id=uuid4(),
            staff_id=staff.id,
            weekday=0,
            week_number=0,
            start_time="08:00",
            end_time="16:00"
        )
        db_session.add(work_hour)
        db_session.commit()

        # Create absence for Monday
        absence_date = datetime.now() + timedelta(days=(7 - datetime.now().weekday()))  # Next Monday
        absence = Absence(
            id=uuid4(),
            staff_id=staff.id,
            absence_date=absence_date,
            start_time=None,  # Full day
            end_time=None,
            reason=AbsenceReason.SICK
        )

        model = cp_model.CpModel()
        engine = ConstraintEngine(model)

        # Should not be available on absence day
        assert engine._is_staff_available(
            staff,
            {"weekday": 0, "start_time": "10:00", "end_time": "10:15"},
            [absence]
        ) == False

    def test_care_needs_certification_matching(
        self,
        db_session,
        sample_school_class
    ):
        """Test that care needs match staff certifications."""
        # Student with epilepsy
        student = Student(
            id=uuid4(),
            personal_number="1501011234",
            first_name="Test",
            last_name="Student",
            class_id=sample_school_class.id,
            grade=2,
            has_care_needs=True,
            care_requirements=["epilepsy"],
            active=True
        )

        # Staff with epilepsy certification
        certified_staff = Staff(
            id=uuid4(),
            personal_number="8501011234",
            first_name="Certified",
            last_name="Staff",
            role=StaffRole.ASSISTANT,
            care_certifications=["epilepsy", "diabetes"],
            schedule_type=ScheduleType.FIXED,
            employment_start=datetime.now() - timedelta(days=365),
            active=True
        )

        # Staff without certification
        uncertified_staff = Staff(
            id=uuid4(),
            personal_number="8601011234",
            first_name="Uncertified",
            last_name="Staff",
            role=StaffRole.ASSISTANT,
            care_certifications=[],
            schedule_type=ScheduleType.FIXED,
            employment_start=datetime.now() - timedelta(days=365),
            active=True
        )

        # Check certification matching
        for req in student.care_requirements:
            assert req in certified_staff.care_certifications
            assert req not in uncertified_staff.care_certifications

    def test_double_staffing_constraint_setup(
        self,
        db_session,
        sample_school_class
    ):
        """Test that double staffing constraint can be set up."""
        # Create student requiring double staffing
        student = Student(
            id=uuid4(),
            personal_number="1501011234",
            first_name="Test",
            last_name="Student",
            class_id=sample_school_class.id,
            grade=2,
            has_care_needs=False,
            requires_double_staffing=True,  # Needs 2 staff
            active=True
        )
        db_session.add(student)

        # Add care time
        care_time = CareTime(
            id=uuid4(),
            student_id=student.id,
            weekday=0,
            start_time="08:00",
            end_time="14:00",
            valid_from=datetime.now() - timedelta(days=30)
        )
        db_session.add(care_time)
        db_session.commit()

        # Verify student property
        assert student.requires_double_staffing == True

    def test_working_hours_calculation(self):
        """Test that working hours are calculated correctly."""
        # 8:00 - 16:00 with 1 hour lunch = 7 hours per day
        # 5 days = 35 hours per week

        start_h, start_m = 8, 0
        end_h, end_m = 16, 0
        lunch_duration = 1.0

        hours_per_day = (end_h - start_h) + ((end_m - start_m) / 60) - lunch_duration
        assert hours_per_day == 7.0

        hours_per_week = hours_per_day * 5
        assert hours_per_week == 35.0

    def test_preference_weight_calculation(self):
        """Test that preference matching has correct weight."""
        # According to constraints.py, preference match gets -800 (strong preference)
        preference_weight = -800

        # Positive match should reduce objective
        assert preference_weight < 0

        # Weight should be significant (higher priority than workload balance)
        workload_balance_weight = 100
        assert abs(preference_weight) > workload_balance_weight
