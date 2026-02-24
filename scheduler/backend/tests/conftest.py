"""
Pytest configuration and fixtures for testing.
"""

import pytest
from typing import Generator
from datetime import datetime, date, timedelta
from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.database import Base, get_db
from app.main import app
from app.models import (
    Student, Staff, SchoolClass,
    WorkHour, CareTime, Absence,
    StaffRole, ScheduleType, GradeGroup,
    User, UserRole,
    WeekSchedule, StudentDay, StaffShift,
)
from app.core.security import get_password_hash, create_access_token


# Test database URL (in-memory SQLite for fast testing)
TEST_DATABASE_URL = "sqlite:///:memory:"


@pytest.fixture(scope="function")
def db_engine():
    """Create a test database engine."""
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
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
# AUTH FIXTURES
# ============================================================================

@pytest.fixture
def sample_admin_user(db_session: Session) -> User:
    """Create a sample admin user."""
    user = User(
        id=uuid4(),
        email="admin@test.com",
        hashed_password=get_password_hash("admin12345"),
        first_name="Admin",
        last_name="User",
        role=UserRole.ADMIN,
        active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def sample_teacher_user(db_session: Session) -> User:
    """Create a sample teacher user."""
    user = User(
        id=uuid4(),
        email="teacher@test.com",
        hashed_password=get_password_hash("teacher12345"),
        first_name="Teacher",
        last_name="User",
        role=UserRole.TEACHER,
        active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def sample_staff_user(db_session: Session) -> User:
    """Create a sample staff user (lowest privilege)."""
    user = User(
        id=uuid4(),
        email="staff@test.com",
        hashed_password=get_password_hash("staff12345"),
        first_name="Staff",
        last_name="User",
        role=UserRole.STAFF,
        active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def admin_token(sample_admin_user: User) -> str:
    """Create a JWT token for the admin user."""
    return create_access_token(
        user_id=str(sample_admin_user.id),
        role=sample_admin_user.role.value,
    )


@pytest.fixture
def teacher_token(sample_teacher_user: User) -> str:
    """Create a JWT token for the teacher user."""
    return create_access_token(
        user_id=str(sample_teacher_user.id),
        role=sample_teacher_user.role.value,
    )


@pytest.fixture
def staff_token(sample_staff_user: User) -> str:
    """Create a JWT token for the staff user."""
    return create_access_token(
        user_id=str(sample_staff_user.id),
        role=sample_staff_user.role.value,
    )


@pytest.fixture
def auth_headers(admin_token: str) -> dict:
    """Return authorization headers for the admin user."""
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def auth_client(client: TestClient, auth_headers: dict):
    """Return a test client wrapper that auto-adds auth headers."""
    class AuthenticatedClient:
        def __init__(self, client, headers):
            self._client = client
            self._headers = headers

        def get(self, url, **kwargs):
            kwargs.setdefault("headers", {}).update(self._headers)
            return self._client.get(url, **kwargs)

        def post(self, url, **kwargs):
            kwargs.setdefault("headers", {}).update(self._headers)
            return self._client.post(url, **kwargs)

        def put(self, url, **kwargs):
            kwargs.setdefault("headers", {}).update(self._headers)
            return self._client.put(url, **kwargs)

        def delete(self, url, **kwargs):
            kwargs.setdefault("headers", {}).update(self._headers)
            return self._client.delete(url, **kwargs)

    return AuthenticatedClient(client, auth_headers)


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
def sample_week_schedule(
    db_session: Session,
    sample_student_with_care_needs: Student,
    sample_staff_assistant: Staff,
) -> WeekSchedule:
    """Create a sample week schedule with student days and staff shifts."""
    ws = WeekSchedule(
        id=uuid4(),
        year=2026,
        week_number=12,
    )
    db_session.add(ws)
    db_session.flush()

    # Add a student day for Monday
    sd = StudentDay(
        id=uuid4(),
        week_schedule_id=ws.id,
        student_id=sample_student_with_care_needs.id,
        weekday=0,
        arrival_time="08:00",
        departure_time="14:00",
    )
    db_session.add(sd)

    # Add a staff shift for Monday
    ss = StaffShift(
        id=uuid4(),
        week_schedule_id=ws.id,
        staff_id=sample_staff_assistant.id,
        weekday=0,
        start_time="08:00",
        end_time="16:00",
        break_minutes=60,
    )
    db_session.add(ss)

    db_session.commit()
    db_session.refresh(ws)
    return ws


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
