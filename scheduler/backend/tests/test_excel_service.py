"""
Tests for Excel import/export service.
"""

import pytest
import os

from app.services.excel_service import ExcelImportService, ExcelExportService


class TestExcelImportService:
    """Test cases for Excel import functionality."""

    def test_initialization(self):
        """Test that service initializes correctly."""
        service = ExcelImportService()
        assert service is not None

    def test_parse_time_value(self):
        """Test parsing time values from Excel cells."""
        service = ExcelImportService()

        assert service._parse_time_value("08:00") == "08:00"
        assert service._parse_time_value("14:30") == "14:30"
        assert service._parse_time_value(None) is None
        assert service._parse_time_value("") is None

    @pytest.mark.skip(reason="Requires actual Excel file")
    def test_parse_schedule_excel(self):
        """Test parsing Excel schedule file."""
        service = ExcelImportService()
        excel_path = "Schema att maila Joel.xlsx"

        if os.path.exists(excel_path):
            parsed_data = service.parse_schedule_excel(excel_path)

            assert "students" in parsed_data
            assert "staff" in parsed_data


class TestExcelExportService:
    """Test cases for Excel export functionality."""

    def test_initialization(self):
        """Test that export service initializes correctly."""
        service = ExcelExportService()
        assert service is not None
