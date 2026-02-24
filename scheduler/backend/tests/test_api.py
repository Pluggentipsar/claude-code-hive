"""
Tests for FastAPI endpoints.
"""

import pytest
from datetime import datetime, timedelta
from uuid import uuid4


class TestStudentEndpoints:
    """Test cases for student API endpoints."""

    def test_create_student(
        self,
        auth_client,
        db_session,
        sample_school_class
    ):
        """Test creating a new student."""
        student_data = {
            "personal_number": "1501011234",
            "first_name": "Test",
            "last_name": "Student",
            "class_id": str(sample_school_class.id),
            "grade": 2,
            "has_care_needs": False,
            "care_requirements": [],
            "requires_double_staffing": False
        }

        response = auth_client.post("/api/v1/students", json=student_data)

        assert response.status_code == 201
        data = response.json()
        assert data["first_name"] == "Test"
        assert data["personal_number"] == "1501011234"

    def test_list_students(
        self,
        auth_client,
        db_session,
        sample_student_no_care_needs
    ):
        """Test listing all students."""
        response = auth_client.get("/api/v1/students")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_get_student_by_id(
        self,
        auth_client,
        db_session,
        sample_student_no_care_needs
    ):
        """Test getting a specific student."""
        student_id = str(sample_student_no_care_needs.id)
        response = auth_client.get(f"/api/v1/students/{student_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == student_id

    def test_update_student(
        self,
        auth_client,
        db_session,
        sample_student_no_care_needs
    ):
        """Test updating a student."""
        student_id = str(sample_student_no_care_needs.id)
        update_data = {
            "first_name": "Updated",
            "grade": 3
        }

        response = auth_client.put(f"/api/v1/students/{student_id}", json=update_data)

        assert response.status_code == 200
        data = response.json()
        assert data["first_name"] == "Updated"
        assert data["grade"] == 3

    def test_delete_student(
        self,
        auth_client,
        db_session,
        sample_student_no_care_needs
    ):
        """Test soft-deleting a student."""
        student_id = str(sample_student_no_care_needs.id)
        response = auth_client.delete(f"/api/v1/students/{student_id}")

        assert response.status_code == 200

    def test_unauthenticated_request_returns_401(self, client):
        """Test that unauthenticated requests are rejected."""
        response = client.get("/api/v1/students")
        assert response.status_code in [401, 403]


class TestStaffEndpoints:
    """Test cases for staff API endpoints."""

    def test_create_staff(
        self,
        auth_client,
        db_session
    ):
        """Test creating a new staff member."""
        staff_data = {
            "personal_number": "8501011234",
            "first_name": "Test",
            "last_name": "Staff",
            "role": "elevassistent",
            "care_certifications": ["epilepsy"],
            "schedule_type": "fixed"
        }

        response = auth_client.post("/api/v1/staff", json=staff_data)

        assert response.status_code == 201
        data = response.json()
        assert data["first_name"] == "Test"
        assert data["role"] == "elevassistent"

    def test_list_staff(
        self,
        auth_client,
        db_session,
        sample_staff_assistant
    ):
        """Test listing all staff."""
        response = auth_client.get("/api/v1/staff")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_create_absence(
        self,
        auth_client,
        db_session,
        sample_staff_assistant
    ):
        """Test creating an absence for staff."""
        staff_id = str(sample_staff_assistant.id)
        absence_data = {
            "staff_id": staff_id,
            "absence_date": (datetime.now() + timedelta(days=1)).date().isoformat(),
            "start_time": None,
            "end_time": None,
            "reason": "sick"
        }

        response = auth_client.post(f"/api/v1/staff/{staff_id}/absences", json=absence_data)

        assert response.status_code == 201
        data = response.json()
        assert data["reason"] == "sick"

    def test_list_staff_absences(
        self,
        auth_client,
        db_session,
        sample_staff_assistant,
        sample_absence
    ):
        """Test listing absences for a staff member."""
        staff_id = str(sample_staff_assistant.id)
        response = auth_client.get(f"/api/v1/staff/{staff_id}/absences")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestWeekScheduleEndpoints:
    """Test cases for week schedule (Digital Excel) API endpoints."""

    def test_create_week(
        self,
        auth_client,
        db_session,
        sample_student_with_care_needs,
        sample_staff_assistant,
    ):
        """Test creating a new week schedule with auto-population."""
        data = {"year": 2026, "week_number": 15}
        response = auth_client.post("/api/v1/weeks/", json=data)

        assert response.status_code == 201
        result = response.json()
        assert result["year"] == 2026
        assert result["week_number"] == 15
        assert result["status"] == "draft"

    def test_create_duplicate_week_returns_409(
        self,
        auth_client,
        db_session,
        sample_week_schedule,
    ):
        """Test that creating a duplicate week returns 409."""
        data = {"year": 2026, "week_number": 12}
        response = auth_client.post("/api/v1/weeks/", json=data)
        assert response.status_code == 409

    def test_get_week(
        self,
        auth_client,
        db_session,
        sample_week_schedule,
    ):
        """Test getting a week schedule by year/week."""
        response = auth_client.get("/api/v1/weeks/2026/12")

        assert response.status_code == 200
        data = response.json()
        assert data["year"] == 2026
        assert data["week_number"] == 12

    def test_get_week_not_found(self, auth_client, db_session):
        """Test getting a non-existent week returns 404."""
        response = auth_client.get("/api/v1/weeks/2026/99")
        assert response.status_code == 404

    def test_get_day_data(
        self,
        auth_client,
        db_session,
        sample_week_schedule,
    ):
        """Test getting aggregated day data."""
        week_id = str(sample_week_schedule.id)
        response = auth_client.get(f"/api/v1/weeks/{week_id}/days/0")

        assert response.status_code == 200
        data = response.json()
        assert data["weekday"] == 0
        assert len(data["student_days"]) >= 1
        assert len(data["staff_shifts"]) >= 1
        assert "warnings" in data

    def test_update_student_day(
        self,
        auth_client,
        db_session,
        sample_week_schedule,
        sample_staff_assistant,
    ):
        """Test updating a student day (assign FM staff)."""
        week_id = str(sample_week_schedule.id)
        # Get the student day
        response = auth_client.get(f"/api/v1/weeks/{week_id}/days/0")
        sd = response.json()["student_days"][0]

        # Assign FM staff
        update_data = {"fm_staff_id": str(sample_staff_assistant.id)}
        response = auth_client.put(
            f"/api/v1/weeks/{week_id}/student-days/{sd['id']}",
            json=update_data,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["fm_staff_id"] == str(sample_staff_assistant.id)

    def test_update_week_status(
        self,
        auth_client,
        db_session,
        sample_week_schedule,
    ):
        """Test publishing a week schedule."""
        week_id = str(sample_week_schedule.id)
        response = auth_client.put(
            f"/api/v1/weeks/{week_id}",
            json={"status": "published"},
        )

        assert response.status_code == 200
        assert response.json()["status"] == "published"

    def test_copy_week(
        self,
        auth_client,
        db_session,
        sample_week_schedule,
    ):
        """Test copying a week schedule to a new week."""
        week_id = str(sample_week_schedule.id)
        copy_data = {"target_year": 2026, "target_week": 13}
        response = auth_client.post(
            f"/api/v1/weeks/{week_id}/copy",
            json=copy_data,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["year"] == 2026
        assert data["week_number"] == 13
        assert data["copied_from_id"] == week_id

    def test_delete_week(
        self,
        auth_client,
        db_session,
        sample_week_schedule,
    ):
        """Test deleting a week schedule."""
        week_id = str(sample_week_schedule.id)
        response = auth_client.delete(f"/api/v1/weeks/{week_id}")
        assert response.status_code == 204

    def test_get_warnings(
        self,
        auth_client,
        db_session,
        sample_week_schedule,
    ):
        """Test getting warnings for a week."""
        week_id = str(sample_week_schedule.id)
        response = auth_client.get(f"/api/v1/weeks/{week_id}/warnings")

        assert response.status_code == 200
        data = response.json()
        assert "warnings" in data
        assert "summary" in data


class TestHealthEndpoints:
    """Test cases for health check endpoints."""

    def test_root_endpoint(self, client):
        """Test root endpoint."""
        response = client.get("/")

        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        assert "version" in data
        assert "status" in data

    def test_health_check(self, client):
        """Test health check endpoint."""
        response = client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


class TestAuthEndpoints:
    """Test cases for authentication endpoints."""

    def test_register_first_admin(self, client, db_session):
        """Test creating the first admin user."""
        user_data = {
            "email": "first-admin@test.com",
            "password": "securepassword123",
            "first_name": "First",
            "last_name": "Admin",
            "role": "admin"
        }

        response = client.post("/api/v1/auth/register-first", json=user_data)

        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "first-admin@test.com"
        assert data["role"] == "admin"
        assert "hashed_password" not in data

    def test_register_first_blocked_when_users_exist(
        self, client, db_session, sample_admin_user
    ):
        """Test that register-first fails when users already exist."""
        user_data = {
            "email": "another@test.com",
            "password": "securepassword123",
            "first_name": "Another",
            "last_name": "Admin",
            "role": "admin"
        }

        response = client.post("/api/v1/auth/register-first", json=user_data)

        assert response.status_code == 400

    def test_login(self, client, db_session, sample_admin_user):
        """Test login returns a JWT token."""
        login_data = {
            "email": "admin@test.com",
            "password": "admin12345"
        }

        response = client.post("/api/v1/auth/login", json=login_data)

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "admin@test.com"

    def test_login_wrong_password(self, client, db_session, sample_admin_user):
        """Test login with wrong password fails."""
        login_data = {
            "email": "admin@test.com",
            "password": "wrongpassword"
        }

        response = client.post("/api/v1/auth/login", json=login_data)

        assert response.status_code == 401

    def test_me_endpoint(self, client, db_session, admin_token):
        """Test the /me endpoint returns current user."""
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "admin@test.com"
        assert data["role"] == "admin"

    def test_register_requires_admin(
        self, client, db_session, staff_token
    ):
        """Test that register endpoint requires admin role."""
        user_data = {
            "email": "new@test.com",
            "password": "securepassword123",
            "first_name": "New",
            "last_name": "User",
            "role": "teacher"
        }

        response = client.post(
            "/api/v1/auth/register",
            json=user_data,
            headers={"Authorization": f"Bearer {staff_token}"}
        )

        assert response.status_code == 403

    def test_admin_can_register_users(
        self, auth_client, db_session
    ):
        """Test that admin can register new users."""
        user_data = {
            "email": "new-teacher@test.com",
            "password": "securepassword123",
            "first_name": "New",
            "last_name": "Teacher",
            "role": "teacher"
        }

        response = auth_client.post("/api/v1/auth/register", json=user_data)

        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "new-teacher@test.com"
        assert data["role"] == "teacher"
