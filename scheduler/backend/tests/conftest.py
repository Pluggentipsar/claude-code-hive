"""
Pytest configuration and fixtures for testing.
"""

import pytest
from typing import Generator
from datetime import datetime, date, timedelta
from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from fastapi.testclient import TestClient

from app.database import Base, get_db
from app.main import app
from app.models import (
    Student, Staff, SchoolClass, Schedule, StaffAssignment,
    WorkHour, CareTime, Absence,
    StaffRole, ScheduleType, GradeGroup, SolverStatus
)


# Test database URL (in-memory SQLite for fast testing)
TEST_DATABASE_URL = "sqlite:///:memory:"


@pytest.fixture(scope="function")
def db_engine():
    """Create a test database engine."""
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session(db_engine) -> Generator[Session, None, None]:
    """Create a test database session."""
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="function")
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """Create a test client with database dependency override."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# ============================================================================
# TEST DATA FIXTURES
# ============================================================================

@pytest.fixture
def sample_school_class(db_session: Session) -> SchoolClass:
    """Create a sample school class."""
    school_class = SchoolClass(
        id=uuid4(),
        name="Klass 1-3A",
        grade_group=GradeGroup.GRADES_1_3,
        academic_year="2025/2026",
        active=True
    )
    db_session.add(school_class)
    db_session.commit()
    db_session.refresh(school_class)
    return school_class


@pytest.fixture
def sample_staff_assistant(db_session: Session) -> Staff:
    """Create a sample staff member (assistant)."""
    staff = Staff(
        id=uuid4(),
        personal_number="8501011234",
        first_name="Anna",
        last_name="Andersson",
        role=StaffRole.ASSISTANT,
        care_certifications=["epilepsy", "diabetes"],
        schedule_type=ScheduleType.FIXED,
        employment_start=datetime.now() - timedelta(days=365),
        active=True
    )
    db_session.add(staff)
    db_session.commit()
    db_session.refresh(staff)

    # Add work hours (Monday-Friday 08:00-16:00)
    for weekday in range(5):
        work_hour = WorkHour(
            id=uuid4(),
            staff_id=staff.id,
            weekday=weekday,
            week_number=0,  # Fixed schedule
            start_time="08:00",
            end_time="16:00",
            lunch_start="12:00",
            lunch_end="13:00"
        )
        db_session.add(work_hour)

    db_session.commit()
    return staff


@pytest.fixture
def sample_staff_teacher(db_session: Session) -> Staff:
    """Create a sample teacher."""
    staff = Staff(
        id=uuid4(),
        personal_number="7803151234",
        first_name="Bengt",
        last_name="Bengtsson",
        role=StaffRole.TEACHER,
        care_certifications=[],
        schedule_type=ScheduleType.FIXED,
        employment_start=datetime.now() - timedelta(days=730),
        active=True
    )
    db_session.add(staff)
    db_session.commit()
    db_session.refresh(staff)

    # Add work hours
    for weekday in range(5):
        work_hour = WorkHour(
            id=uuid4(),
            staff_id=staff.id,
            weekday=weekday,
            week_number=0,
            start_time="08:00",
            end_time="16:00",
            lunch_start="12:00",
            lunch_end="13:00"
        )
        db_session.add(work_hour)

    db_session.commit()
    return staff


@pytest.fixture
def sample_student_with_care_needs(db_session: Session, sample_school_class: SchoolClass) -> Student:
    """Create a sample student with care needs."""
    student = Student(
        id=uuid4(),
        personal_number="1501011234",
        first_name="Carl",
        last_name="Carlsson",
        class_id=sample_school_class.id,
        grade=2,
        has_care_needs=True,
        care_requirements=["epilepsy"],
        preferred_staff=[],
        requires_double_staffing=False,
        active=True
    )
    db_session.add(student)
    db_session.commit()
    db_session.refresh(student)

    # Add care times (Monday-Friday 08:00-14:00)
    for weekday in range(5):
        care_time = CareTime(
            id=uuid4(),
            student_id=student.id,
            weekday=weekday,
            start_time="08:00",
            end_time="14:00",
            valid_from=datetime.now() - timedelta(days=30),
            valid_to=None
        )
        db_session.add(care_time)

    db_session.commit()
    return student


@pytest.fixture
def sample_student_no_care_needs(db_session: Session, sample_school_class: SchoolClass) -> Student:
    """Create a sample student without care needs."""
    student = Student(
        id=uuid4(),
        personal_number="1603201234",
        first_name="Diana",
        last_name="Davidsson",
        class_id=sample_school_class.id,
        grade=1,
        has_care_needs=False,
        care_requirements=[],
        preferred_staff=[],
        requires_double_staffing=False,
        active=True
    )
    db_session.add(student)
    db_session.commit()
    db_session.refresh(student)

    # Add care times
    for weekday in range(5):
        care_time = CareTime(
            id=uuid4(),
            student_id=student.id,
            weekday=weekday,
            start_time="08:00",
            end_time="14:00",
            valid_from=datetime.now() - timedelta(days=30),
            valid_to=None
        )
        db_session.add(care_time)

    db_session.commit()
    return student


@pytest.fixture
def sample_schedule(db_session: Session) -> Schedule:
    """Create a sample schedule."""
    schedule = Schedule(
        id=uuid4(),
        week_number=12,
        year=2026,
        solver_status=SolverStatus.OPTIMAL,
        objective_value=1000.0,
        solve_time_ms=5000,
        hard_constraints_met=True,
        soft_constraints_score=85.0,
        is_published=False,
        created_by="pytest"
    )
    db_session.add(schedule)
    db_session.commit()
    db_session.refresh(schedule)
    return schedule


@pytest.fixture
def sample_absence(db_session: Session, sample_staff_assistant: Staff) -> Absence:
    """Create a sample absence."""
    from app.models import AbsenceReason

    absence = Absence(
        id=uuid4(),
        staff_id=sample_staff_assistant.id,
        absence_date=datetime.now() + timedelta(days=1),
        start_time=None,  # Full day absence
        end_time=None,
        reason=AbsenceReason.SICK
    )
    db_session.add(absence)
    db_session.commit()
    db_session.refresh(absence)
    return absence
