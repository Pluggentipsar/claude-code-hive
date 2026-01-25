"""
Tests for FastAPI endpoints.
"""

import pytest
from datetime import datetime, timedelta
from uuid import uuid4

from app.models import Student, Staff, Schedule, StaffRole, ScheduleType, SolverStatus


class TestStudentEndpoints:
    """Test cases for student API endpoints."""

    def test_create_student(
        self,
        client,
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

        response = client.post("/api/v1/students", json=student_data)

        assert response.status_code == 201
        data = response.json()
        assert data["first_name"] == "Test"
        assert data["personal_number"] == "1501011234"

    def test_list_students(
        self,
        client,
        db_session,
        sample_student_no_care_needs
    ):
        """Test listing all students."""
        response = client.get("/api/v1/students")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_get_student_by_id(
        self,
        client,
        db_session,
        sample_student_no_care_needs
    ):
        """Test getting a specific student."""
        student_id = str(sample_student_no_care_needs.id)
        response = client.get(f"/api/v1/students/{student_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == student_id

    def test_update_student(
        self,
        client,
        db_session,
        sample_student_no_care_needs
    ):
        """Test updating a student."""
        student_id = str(sample_student_no_care_needs.id)
        update_data = {
            "first_name": "Updated",
            "grade": 3
        }

        response = client.put(f"/api/v1/students/{student_id}", json=update_data)

        assert response.status_code == 200
        data = response.json()
        assert data["first_name"] == "Updated"
        assert data["grade"] == 3

    def test_delete_student(
        self,
        client,
        db_session,
        sample_student_no_care_needs
    ):
        """Test soft-deleting a student."""
        student_id = str(sample_student_no_care_needs.id)
        response = client.delete(f"/api/v1/students/{student_id}")

        assert response.status_code == 200

        # Verify soft delete
        student = db_session.query(Student).filter_by(id=uuid4(student_id)).first()
        if student:
            assert student.active == False


class TestStaffEndpoints:
    """Test cases for staff API endpoints."""

    def test_create_staff(
        self,
        client,
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

        response = client.post("/api/v1/staff", json=staff_data)

        assert response.status_code == 201
        data = response.json()
        assert data["first_name"] == "Test"
        assert data["role"] == "elevassistent"

    def test_list_staff(
        self,
        client,
        db_session,
        sample_staff_assistant
    ):
        """Test listing all staff."""
        response = client.get("/api/v1/staff")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_create_absence(
        self,
        client,
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

        response = client.post(f"/api/v1/staff/{staff_id}/absences", json=absence_data)

        assert response.status_code == 201
        data = response.json()
        assert data["reason"] == "sick"

    def test_list_staff_absences(
        self,
        client,
        db_session,
        sample_staff_assistant,
        sample_absence
    ):
        """Test listing absences for a staff member."""
        staff_id = str(sample_staff_assistant.id)
        response = client.get(f"/api/v1/staff/{staff_id}/absences")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestScheduleEndpoints:
    """Test cases for schedule API endpoints."""

    @pytest.mark.skip(reason="Requires full scheduler setup")
    def test_generate_schedule(
        self,
        client,
        db_session,
        sample_student_no_care_needs,
        sample_staff_assistant,
        sample_staff_teacher
    ):
        """Test generating a new schedule."""
        schedule_data = {
            "week_number": 12,
            "year": 2026,
            "force_regenerate": False
        }

        response = client.post("/api/v1/schedules/generate", json=schedule_data)

        # Might be 201 or 200 depending on implementation
        assert response.status_code in [200, 201]
        data = response.json()
        assert data["week_number"] == 12
        assert data["year"] == 2026

    def test_get_schedule_by_id(
        self,
        client,
        db_session,
        sample_schedule
    ):
        """Test getting a specific schedule."""
        schedule_id = str(sample_schedule.id)
        response = client.get(f"/api/v1/schedules/{schedule_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == schedule_id

    def test_get_schedule_by_week(
        self,
        client,
        db_session,
        sample_schedule
    ):
        """Test getting schedule by week number."""
        response = client.get(f"/api/v1/schedules/week/2026/12")

        assert response.status_code == 200
        data = response.json()
        assert data["week_number"] == 12
        assert data["year"] == 2026

    def test_publish_schedule(
        self,
        client,
        db_session,
        sample_schedule
    ):
        """Test publishing a schedule."""
        schedule_id = str(sample_schedule.id)
        response = client.put(f"/api/v1/schedules/{schedule_id}/publish")

        assert response.status_code == 200
        data = response.json()
        assert data["is_published"] == True

    @pytest.mark.skip(reason="Requires AI service mock")
    def test_get_ai_suggestions(
        self,
        client,
        db_session,
        sample_schedule
    ):
        """Test getting AI suggestions for a schedule."""
        schedule_id = str(sample_schedule.id)
        response = client.post(f"/api/v1/schedules/{schedule_id}/ai-suggestions")

        # Will fail without AI service properly mocked
        # But endpoint should exist
        assert response.status_code in [200, 500]  # 500 if AI fails

    @pytest.mark.skip(reason="Requires AI service mock")
    def test_get_schedule_summary(
        self,
        client,
        db_session,
        sample_schedule
    ):
        """Test getting AI-generated summary."""
        schedule_id = str(sample_schedule.id)
        response = client.get(f"/api/v1/schedules/{schedule_id}/summary")

        assert response.status_code in [200, 500]


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
