"""
Import/Export API endpoints for Excel-based bulk operations.
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Dict, Any
from io import BytesIO

from app.database import get_db
from app.services.excel_service import ExcelTemplateService, ExcelImportService
from app.models import Student, Staff, SchoolClass

router = APIRouter()


@router.get("/template")
async def download_template():
    """
    Download a clean Excel template for bulk data import.

    Returns:
        Excel file with structured sheets for students, staff, classes, care times, and work hours.
    """
    try:
        # Generate template
        template_bytes = ExcelTemplateService.generate_template()

        # Return as downloadable file
        return StreamingResponse(
            BytesIO(template_bytes),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": "attachment; filename=skolschema_import_mall.xlsx"
            }
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate template: {str(e)}"
        )


@router.post("/excel")
async def upload_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Upload and parse an Excel file for bulk import.

    Args:
        file: Excel file (.xlsx)
        db: Database session

    Returns:
        Parsed data preview and validation results
    """
    # Validate file type
    if not file.filename.endswith('.xlsx'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .xlsx files are supported"
        )

    try:
        # Read file content
        content = await file.read()

        # Save temporarily
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        # Parse Excel
        service = ExcelImportService()
        parsed_data = service.parse_schedule_excel(tmp_path)

        # Clean up temp file
        import os
        os.unlink(tmp_path)

        # Check for duplicates in database
        conflicts = _check_for_conflicts(parsed_data, db)

        return {
            "status": "success",
            "message": f"Parsed {len(parsed_data.get('students', []))} students, {len(parsed_data.get('staff', []))} staff",
            "data": {
                "students_count": len(parsed_data.get('students', [])),
                "staff_count": len(parsed_data.get('staff', [])),
                "classes_count": len(parsed_data.get('classes', [])),
            },
            "conflicts": conflicts,
            "preview": _generate_preview(parsed_data),
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse Excel: {str(e)}"
        )


@router.post("/excel/import")
async def import_excel_data(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Import data from Excel file into database.

    This performs the actual import after preview/validation.

    Args:
        file: Excel file (.xlsx)
        db: Database session

    Returns:
        Import statistics and created entities
    """
    if not file.filename.endswith('.xlsx'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .xlsx files are supported"
        )

    try:
        # Read and save temporarily
        content = await file.read()

        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        # Parse and import
        service = ExcelImportService()
        result = service.import_to_database(tmp_path, db)

        # Clean up
        import os
        os.unlink(tmp_path)

        return {
            "status": "success",
            "message": "Data imported successfully",
            "stats": result['stats'],
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Import failed: {str(e)}"
        )


def _check_for_conflicts(parsed_data: Dict[str, Any], db: Session) -> Dict[str, list]:
    """Check if any entities already exist in database."""
    conflicts = {
        "students": [],
        "staff": [],
        "classes": [],
    }

    # Check students by personal number
    for student_data in parsed_data.get('students', []):
        existing = db.query(Student).filter(
            Student.personal_number == student_data.get('personal_number')
        ).first()

        if existing:
            conflicts['students'].append({
                "personal_number": student_data.get('personal_number'),
                "name": f"{student_data.get('first_name')} {student_data.get('last_name')}",
                "action": "will_update"
            })

    # Check staff by personal number
    for staff_data in parsed_data.get('staff', []):
        existing = db.query(Staff).filter(
            Staff.personal_number == staff_data.get('personal_number')
        ).first()

        if existing:
            conflicts['staff'].append({
                "personal_number": staff_data.get('personal_number'),
                "name": f"{staff_data.get('first_name')} {staff_data.get('last_name')}",
                "action": "will_update"
            })

    # Check classes by name
    for class_data in parsed_data.get('classes', []):
        existing = db.query(SchoolClass).filter(
            SchoolClass.name == class_data.get('name')
        ).first()

        if existing:
            conflicts['classes'].append({
                "name": class_data.get('name'),
                "action": "will_update"
            })

    return conflicts


def _generate_preview(parsed_data: Dict[str, Any]) -> Dict[str, list]:
    """Generate a preview of parsed data for user review."""
    return {
        "students": [
            {
                "personal_number": s.get('personal_number'),
                "name": f"{s.get('first_name')} {s.get('last_name')}",
                "grade": s.get('grade'),
                "class": s.get('class_name'),
            }
            for s in parsed_data.get('students', [])[:10]  # First 10
        ],
        "staff": [
            {
                "personal_number": s.get('personal_number'),
                "name": f"{s.get('first_name')} {s.get('last_name')}",
                "role": s.get('role'),
            }
            for s in parsed_data.get('staff', [])[:10]  # First 10
        ],
        "classes": [
            {
                "name": c.get('name'),
                "grade_group": c.get('grade_group'),
            }
            for c in parsed_data.get('classes', [])
        ],
    }
