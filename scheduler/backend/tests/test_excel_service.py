"""
Tests for Excel import/export service.
"""

import pytest
import os
from datetime import datetime
from uuid import uuid4

from app.services.excel_service import ExcelImportService, ExcelExportService, import_to_database
from app.models import Student, Staff, Schedule


class TestExcelImportService:
    """Test cases for Excel import functionality."""

    def test_initialization(self):
        """Test that service initializes correctly."""
        service = ExcelImportService()
        assert service is not None

    @pytest.mark.skip(reason="Requires actual Excel file")
    def test_parse_schedule_excel(self):
        """Test parsing Excel schedule file."""
        service = ExcelImportService()

        # This would require the actual "Schema att maila Joel.xlsx" file
        # Skipping for now, but structure is in place
        excel_path = "Schema att maila Joel.xlsx"

        if os.path.exists(excel_path):
            parsed_data = service.parse_schedule_excel(excel_path)

            # Verify structure
            assert "students" in parsed_data
            assert "staff" in parsed_data
            assert "care_times" in parsed_data
            assert "work_hours" in parsed_data

            # Verify counts (from email: 46 students, 53 staff)
            assert len(parsed_data["students"]) == 46
            assert len(parsed_data["staff"]) == 53

    def test_parse_time_string(self):
        """Test parsing time strings."""
        service = ExcelImportService()

        # Test various time formats
        assert service._parse_time("08:00") == "08:00"
        assert service._parse_time("8:00") == "08:00"
        assert service._parse_time("14:30") == "14:30"

    def test_parse_weekday_swedish(self):
        """Test parsing Swedish weekday names."""
        service = ExcelImportService()

        weekday_map = {
            "Måndag": 0,
            "Tisdag": 1,
            "Onsdag": 2,
            "Torsdag": 3,
            "Fredag": 4
        }

        for swedish_name, expected_number in weekday_map.items():
            result = service._parse_weekday(swedish_name)
            assert result == expected_number

    def test_extract_personal_number(self):
        """Test extracting personal numbers from various formats."""
        service = ExcelImportService()

        # Swedish personal number formats
        # YYMMDD-XXXX or YYYYMMDD-XXXX
        assert service._parse_personal_number("850101-1234") == "8501011234"
        assert service._parse_personal_number("19850101-1234") == "198501011234"
        assert service._parse_personal_number("8501011234") == "8501011234"

    @pytest.mark.skip(reason="Requires database session")
    def test_import_to_database(self, db_session):
        """Test importing parsed data to database."""
        # Sample parsed data
        parsed_data = {
            "students": [
                {
                    "personal_number": "1501011234",
                    "first_name": "Test",
                    "last_name": "Student",
                    "grade": 2,
                    "class_name": "Klass 1-3A",
                    "has_care_needs": False,
                    "care_requirements": [],
                    "requires_double_staffing": False
                }
            ],
            "staff": [
                {
                    "personal_number": "8501011234",
                    "first_name": "Test",
                    "last_name": "Staff",
                    "role": "elevassistent",
                    "care_certifications": ["epilepsy"]
                }
            ],
            "care_times": [
                {
                    "student_personal_number": "1501011234",
                    "weekday": 0,
                    "start_time": "08:00",
                    "end_time": "14:00"
                }
            ],
            "work_hours": [
                {
                    "staff_personal_number": "8501011234",
                    "weekday": 0,
                    "week_number": 0,
                    "start_time": "08:00",
                    "end_time": "16:00"
                }
            ]
        }

        result = import_to_database(parsed_data, db_session)

        assert result["students_created"] == 1
        assert result["staff_created"] == 1

        # Verify data in database
        students = db_session.query(Student).all()
        assert len(students) == 1
        assert students[0].first_name == "Test"

        staff = db_session.query(Staff).all()
        assert len(staff) == 1
        assert staff[0].role.value == "elevassistent"


class TestExcelExportService:
    """Test cases for Excel export functionality."""

    def test_initialization(self):
        """Test that export service initializes correctly."""
        service = ExcelExportService()
        assert service is not None

    @pytest.mark.skip(reason="Requires actual schedule data")
    def test_export_schedule_to_excel(
        self,
        db_session,
        sample_schedule
    ):
        """Test exporting schedule to Excel."""
        service = ExcelExportService()

        output_path = "test_export_schedule.xlsx"

        service.export_schedule_to_excel(sample_schedule, output_path)

        # Verify file created
        assert os.path.exists(output_path)

        # Clean up
        if os.path.exists(output_path):
            os.remove(output_path)

    def test_format_weekday_swedish(self):
        """Test formatting weekday numbers to Swedish names."""
        service = ExcelExportService()

        weekday_names = {
            0: "Måndag",
            1: "Tisdag",
            2: "Onsdag",
            3: "Torsdag",
            4: "Fredag"
        }

        for number, expected_name in weekday_names.items():
            result = service._format_weekday(number)
            assert result == expected_name

    def test_format_time_range(self):
        """Test formatting time ranges for Excel."""
        service = ExcelExportService()

        result = service._format_time_range("08:00", "14:00")
        assert result == "08:00-14:00"

        result = service._format_time_range("12:00", "13:00")
        assert result == "12:00-13:00"
