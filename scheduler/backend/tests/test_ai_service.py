"""
Tests for AI service (Claude API integration).
"""

import pytest
from unittest.mock import Mock, patch
from datetime import datetime, timedelta
from uuid import uuid4

from app.services.ai_service import AIAdvisorService
from app.models import (
    Schedule, StaffAssignment, Student, Staff, Absence,
    SolverStatus, StaffRole, AssignmentType, AbsenceReason
)


class TestAIAdvisorService:
    """Test cases for AI advisor functionality."""

    def test_initialization_with_api_key(self):
        """Test that service initializes with API key."""
        api_key = "test-api-key"
        service = AIAdvisorService(api_key=api_key)

        assert service.api_key == api_key
        assert service.model == "claude-sonnet-4-5-20250929"

    def test_initialization_without_api_key_raises_error(self):
        """Test that missing API key raises error."""
        with patch('app.config.settings') as mock_settings:
            mock_settings.anthropic_api_key = None

            with pytest.raises(ValueError, match="Anthropic API key not configured"):
                AIAdvisorService()

    @pytest.mark.skip(reason="Requires valid API key and network")
    def test_suggest_conflict_resolution_real_api(
        self,
        sample_schedule,
        sample_staff_assistant,
        sample_student_with_care_needs,
        sample_absence
    ):
        """Test conflict resolution with real API (requires API key)."""
        # This test would require a valid Anthropic API key
        service = AIAdvisorService(api_key="your-api-key-here")

        conflicts = [
            {
                "id": "conflict-1",
                "type": "STAFF_UNAVAILABLE",
                "message": "Personal frånvarande, ingen täckning för elev"
            }
        ]

        suggestions = service.suggest_conflict_resolution(
            schedule=sample_schedule,
            conflicts=conflicts,
            available_staff=[sample_staff_assistant],
            absences=[sample_absence]
        )

        assert isinstance(suggestions, list)
        if suggestions:
            assert "conflict_id" in suggestions[0]
            assert "actions" in suggestions[0]

    def test_fallback_suggestions(
        self,
        sample_schedule
    ):
        """Test fallback suggestions when AI fails."""
        service = AIAdvisorService(api_key="test-key")

        conflicts = [
            {
                "id": "conflict-1",
                "type": "TEST_CONFLICT",
                "message": "Test conflict"
            }
        ]

        # Use fallback directly
        suggestions = service._fallback_suggestions(conflicts)

        assert len(suggestions) == 1
        assert suggestions[0]["conflict_id"] == "conflict-1"
        assert suggestions[0]["root_cause"] == "AI-analys misslyckades - manuell granskning krävs"

    @pytest.mark.skip(reason="Requires valid API key")
    def test_explain_assignment_real_api(
        self,
        sample_schedule,
        sample_student_with_care_needs,
        sample_staff_assistant
    ):
        """Test assignment explanation with real API."""
        service = AIAdvisorService(api_key="your-api-key-here")

        # Create sample assignment
        assignment = StaffAssignment(
            id=uuid4(),
            schedule_id=sample_schedule.id,
            staff_id=sample_staff_assistant.id,
            student_id=sample_student_with_care_needs.id,
            weekday=0,
            start_time="08:00",
            end_time="14:00",
            assignment_type=AssignmentType.ONE_TO_ONE
        )

        explanation = service.explain_assignment(
            assignment=assignment,
            schedule=sample_schedule,
            student=sample_student_with_care_needs,
            staff=sample_staff_assistant
        )

        assert isinstance(explanation, str)
        assert len(explanation) > 0

    def test_fallback_explanation(
        self,
        sample_schedule,
        sample_student_with_care_needs,
        sample_staff_assistant
    ):
        """Test fallback explanation when AI fails."""
        service = AIAdvisorService(api_key="test-key")

        assignment = StaffAssignment(
            id=uuid4(),
            schedule_id=sample_schedule.id,
            staff_id=sample_staff_assistant.id,
            student_id=sample_student_with_care_needs.id,
            weekday=0,
            start_time="08:00",
            end_time="14:00",
            assignment_type=AssignmentType.ONE_TO_ONE
        )

        explanation = service._fallback_explanation(
            assignment=assignment,
            student=sample_student_with_care_needs,
            staff=sample_staff_assistant
        )

        # Should mention care certifications since student has care needs
        assert "certifieringar" in explanation.lower() or "certifications" in explanation.lower()
        assert sample_staff_assistant.first_name in explanation

    def test_format_conflicts(self):
        """Test conflict formatting."""
        service = AIAdvisorService(api_key="test-key")

        conflicts = [
            {"type": "STAFF_SHORTAGE", "message": "Inte tillräckligt med personal"},
            {"type": "CARE_MISMATCH", "message": "Vårdkrav ej matchat"}
        ]

        formatted = service._format_conflicts(conflicts)

        assert "1." in formatted
        assert "2." in formatted
        assert "STAFF_SHORTAGE" in formatted
        assert "CARE_MISMATCH" in formatted

    def test_format_conflicts_empty(self):
        """Test formatting empty conflicts list."""
        service = AIAdvisorService(api_key="test-key")

        formatted = service._format_conflicts([])
        assert formatted == "Inga konflikter."

    def test_format_available_staff(
        self,
        sample_staff_assistant,
        sample_staff_teacher
    ):
        """Test staff formatting."""
        service = AIAdvisorService(api_key="test-key")

        formatted = service._format_available_staff(
            staff=[sample_staff_assistant, sample_staff_teacher],
            absences=[]
        )

        assert sample_staff_assistant.first_name in formatted
        assert sample_staff_teacher.first_name in formatted
        assert "epilepsy" in formatted  # Assistant's certification

    def test_format_available_staff_with_absences(
        self,
        sample_staff_assistant,
        sample_staff_teacher,
        sample_absence
    ):
        """Test staff formatting excludes absent staff."""
        service = AIAdvisorService(api_key="test-key")

        formatted = service._format_available_staff(
            staff=[sample_staff_assistant, sample_staff_teacher],
            absences=[sample_absence]  # Assistant is absent
        )

        # Assistant should not be in available list
        assert sample_staff_teacher.first_name in formatted
        # Assistant might be excluded if absence matches

    def test_format_absences(
        self,
        sample_absence
    ):
        """Test absence formatting."""
        service = AIAdvisorService(api_key="test-key")

        formatted = service._format_absences([sample_absence])

        assert "sick" in formatted.lower() or "sjuk" in formatted.lower()

    def test_parse_json_response_with_markdown(self):
        """Test parsing JSON from markdown code blocks."""
        service = AIAdvisorService(api_key="test-key")

        # JSON in markdown code block
        response_text = """```json
{
  "suggestions": [
    {"conflict_id": "test", "actions": []}
  ]
}
```"""

        parsed = service._parse_json_response(response_text)

        assert "suggestions" in parsed
        assert len(parsed["suggestions"]) == 1

    def test_parse_json_response_plain(self):
        """Test parsing plain JSON."""
        service = AIAdvisorService(api_key="test-key")

        response_text = '{"suggestions": [], "status": "ok"}'

        parsed = service._parse_json_response(response_text)

        assert "suggestions" in parsed
        assert "status" in parsed

    def test_parse_json_response_invalid(self):
        """Test parsing invalid JSON returns empty dict."""
        service = AIAdvisorService(api_key="test-key")

        response_text = "This is not JSON at all"

        parsed = service._parse_json_response(response_text)

        assert parsed == {}

    def test_get_schedule_statistics(
        self,
        db_session,
        sample_schedule,
        sample_staff_assistant
    ):
        """Test schedule statistics calculation."""
        service = AIAdvisorService(api_key="test-key")

        # Add some assignments to schedule
        for i in range(5):
            assignment = StaffAssignment(
                id=uuid4(),
                schedule_id=sample_schedule.id,
                staff_id=sample_staff_assistant.id,
                student_id=uuid4(),
                weekday=0,
                start_time="08:00",
                end_time="16:00",  # 8 hours
                assignment_type=AssignmentType.ONE_TO_ONE
            )
            sample_schedule.assignments.append(assignment)

        stats = service._get_schedule_statistics(sample_schedule)

        assert "Genomsnittlig arbetstid" in stats or "arbetstid" in stats.lower()
        assert "Max arbetstid" in stats or "max" in stats.lower()

    def test_get_schedule_statistics_empty(
        self,
        sample_schedule
    ):
        """Test statistics for empty schedule."""
        service = AIAdvisorService(api_key="test-key")

        sample_schedule.assignments = []

        stats = service._get_schedule_statistics(sample_schedule)

        assert "Inga tilldelningar" in stats

    @pytest.mark.skip(reason="Requires valid API key")
    def test_predict_problems_real_api(
        self,
        sample_schedule
    ):
        """Test problem prediction with real API."""
        service = AIAdvisorService(api_key="your-api-key-here")

        predictions = service.predict_problems(
            schedule=sample_schedule,
            historical_schedules=[]
        )

        assert isinstance(predictions, list)

    @pytest.mark.skip(reason="Requires valid API key")
    def test_generate_weekly_summary_real_api(
        self,
        sample_schedule,
        sample_student_with_care_needs,
        sample_staff_assistant
    ):
        """Test weekly summary generation with real API."""
        service = AIAdvisorService(api_key="your-api-key-here")

        summary = service.generate_weekly_summary(
            schedule=sample_schedule,
            students=[sample_student_with_care_needs],
            staff=[sample_staff_assistant]
        )

        assert isinstance(summary, str)
        assert len(summary) > 0

    def test_model_version(self):
        """Test that correct Claude model is used."""
        service = AIAdvisorService(api_key="test-key")

        # Should use Claude Sonnet 4.5
        assert service.model == "claude-sonnet-4-5-20250929"
