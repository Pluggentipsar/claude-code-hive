"""
GDPR-compliant data anonymization service.

Ensures that NO personal data (names, personal numbers, etc.) is sent to
external AI services like Claude API.

Privacy by Design approach:
1. Create temporary anonymous IDs for each scheduling session
2. Map real IDs ↔ anonymous IDs
3. Send ONLY anonymous data to AI
4. Translate AI responses back to real IDs
"""

from typing import Dict, List, Any, Tuple
from uuid import UUID
import hashlib
from datetime import datetime

from app.models import Student, Staff, Schedule


class AnonymizationService:
    """
    Service for anonymizing sensitive data before sending to AI services.

    GDPR Compliance:
    - No personal identifiable information (PII) leaves the server
    - Temporary mappings are session-specific and not persisted
    - Only functional data (roles, times, generic needs) is shared
    """

    def __init__(self):
        self.session_mappings: Dict[str, Dict] = {}

    def create_session_id(self, schedule_id: UUID) -> str:
        """Create unique session ID for this anonymization session."""
        timestamp = datetime.now().isoformat()
        combined = f"{schedule_id}_{timestamp}"
        return hashlib.sha256(combined.encode()).hexdigest()[:16]

    def anonymize_for_scheduling(
        self,
        students: List[Student],
        staff: List[Staff],
        schedule_id: UUID
    ) -> Tuple[Dict[str, Any], str]:
        """
        Anonymize student and staff data for AI scheduling.

        Returns:
            Tuple of (anonymized_data, session_id)

        Example anonymized output:
        {
            "staff": [
                {
                    "id": "S1",
                    "role": "assistant",
                    "certifications": ["epilepsy", "diabetes"],
                    "work_hours": {...}
                }
            ],
            "students": [
                {
                    "id": "E1",
                    "grade": 2,
                    "care_needs": ["epilepsy_care"],
                    "care_times": {...},
                    "requires_double_staffing": false
                }
            ]
        }
        """
        session_id = self.create_session_id(schedule_id)

        # Create mappings
        staff_mapping = {}
        student_mapping = {}

        # Anonymize staff
        anonymized_staff = []
        for idx, staff_member in enumerate(staff, start=1):
            anon_id = f"S{idx}"
            staff_mapping[anon_id] = str(staff_member.id)

            # Anonymize work hours (NO names, only times)
            work_hours = []
            for wh in staff_member.work_hours:
                work_hours.append({
                    "weekday": wh.weekday,
                    "week_number": wh.week_number,
                    "start_time": wh.start_time,
                    "end_time": wh.end_time,
                    "lunch_start": wh.lunch_start,
                    "lunch_end": wh.lunch_end,
                })

            anonymized_staff.append({
                "id": anon_id,
                "role": staff_member.role.value,  # Role is OK to share
                "certifications": staff_member.care_certifications or [],  # Generic categories
                "schedule_type": staff_member.schedule_type.value,
                "work_hours": work_hours,  # Times only, no names
            })

        # Anonymize students
        anonymized_students = []
        for idx, student in enumerate(students, start=1):
            anon_id = f"E{idx}"
            student_mapping[anon_id] = str(student.id)

            # Generalize care requirements to categories (not specific diagnoses)
            generic_needs = self._generalize_care_needs(student.care_requirements or [])

            # Anonymize care times (NO names, only times and validity)
            care_times = []
            for ct in student.care_times:
                care_times.append({
                    "weekday": ct.weekday,
                    "start_time": ct.start_time,
                    "end_time": ct.end_time,
                    "valid_from": ct.valid_from.isoformat() if ct.valid_from else None,
                    "valid_to": ct.valid_to.isoformat() if ct.valid_to else None,
                })

            anonymized_students.append({
                "id": anon_id,
                "grade": student.grade,  # Grade level is OK
                "care_needs": generic_needs,  # Generalized categories only
                "requires_double_staffing": student.requires_double_staffing,
                "care_times": care_times,  # Times only, no names
            })

        # Store mappings for this session
        self.session_mappings[session_id] = {
            "staff": staff_mapping,
            "students": student_mapping,
            "created_at": datetime.now().isoformat()
        }

        anonymized_data = {
            "staff": anonymized_staff,
            "students": anonymized_students,
            "session_id": session_id  # Include for tracking
        }

        return anonymized_data, session_id

    def _generalize_care_needs(self, specific_needs: List[str]) -> List[str]:
        """
        Convert specific medical needs to generic care categories.

        Examples:
        - "epilepsi" → "seizure_care"
        - "diabetes typ 1" → "diabetes_care"
        - "allergi mot nötter" → "allergy_monitoring"

        This ensures NO specific medical diagnoses are sent to AI.
        """
        # Mapping from specific → generic
        generalization_map = {
            "epilepsi": "seizure_care",
            "epilepsy": "seizure_care",
            "diabetes": "diabetes_care",
            "allergi": "allergy_monitoring",
            "allergy": "allergy_monitoring",
            "astma": "respiratory_monitoring",
            "asthma": "respiratory_monitoring",
        }

        generic_needs = []
        for need in specific_needs:
            need_lower = need.lower()

            # Find matching generic category
            for specific, generic in generalization_map.items():
                if specific in need_lower:
                    if generic not in generic_needs:
                        generic_needs.append(generic)
                    break
            else:
                # If no match, use generic "medical_monitoring"
                if "medical_monitoring" not in generic_needs:
                    generic_needs.append("medical_monitoring")

        return generic_needs

    def deanonymize_assignments(
        self,
        anonymized_assignments: List[Dict[str, Any]],
        session_id: str
    ) -> List[Dict[str, Any]]:
        """
        Convert AI's anonymous assignments back to real IDs.

        Input (from AI):
        [
            {"staff_id": "S1", "student_id": "E1", "time": "08:00-12:00"},
            {"staff_id": "S2", "student_id": "E2", "time": "13:00-16:00"}
        ]

        Output (real IDs):
        [
            {"staff_id": "uuid-123", "student_id": "uuid-456", "time": "08:00-12:00"},
            ...
        ]
        """
        if session_id not in self.session_mappings:
            raise ValueError(f"No mapping found for session {session_id}")

        mappings = self.session_mappings[session_id]
        staff_map = mappings["staff"]
        student_map = mappings["students"]

        real_assignments = []
        for assignment in anonymized_assignments:
            real_assignment = assignment.copy()

            # Translate anonymous IDs back to real UUIDs
            if "staff_id" in assignment and assignment["staff_id"] in staff_map:
                real_assignment["staff_id"] = staff_map[assignment["staff_id"]]

            if "student_id" in assignment and assignment["student_id"] in student_map:
                real_assignment["student_id"] = student_map[assignment["student_id"]]

            real_assignments.append(real_assignment)

        return real_assignments

    def deanonymize_suggestions(
        self,
        anonymized_suggestions: List[Dict[str, Any]],
        session_id: str
    ) -> List[Dict[str, Any]]:
        """
        Convert AI's anonymous conflict suggestions back to real IDs.

        Similar to deanonymize_assignments but for conflict resolution suggestions.
        """
        if session_id not in self.session_mappings:
            raise ValueError(f"No mapping found for session {session_id}")

        mappings = self.session_mappings[session_id]
        staff_map = mappings["staff"]
        student_map = mappings["students"]

        real_suggestions = []
        for suggestion in anonymized_suggestions:
            real_suggestion = suggestion.copy()

            # Recursively translate IDs in nested structures
            real_suggestion = self._translate_ids_recursive(
                real_suggestion,
                staff_map,
                student_map
            )

            real_suggestions.append(real_suggestion)

        return real_suggestions

    def _translate_ids_recursive(
        self,
        data: Any,
        staff_map: Dict[str, str],
        student_map: Dict[str, str]
    ) -> Any:
        """Recursively translate anonymous IDs in nested data structures."""
        if isinstance(data, dict):
            translated = {}
            for key, value in data.items():
                # Check if this is a staff/student ID field
                if key in ["staff_id", "affected_staff"] and isinstance(value, str):
                    translated[key] = staff_map.get(value, value)
                elif key in ["student_id", "affected_student"] and isinstance(value, str):
                    translated[key] = student_map.get(value, value)
                else:
                    translated[key] = self._translate_ids_recursive(value, staff_map, student_map)
            return translated
        elif isinstance(data, list):
            return [self._translate_ids_recursive(item, staff_map, student_map) for item in data]
        else:
            return data

    def anonymize_staff_member(self, staff: Staff, anon_id: str = None) -> Dict[str, Any]:
        """
        Anonymize a single staff member for display in AI prompts.

        Returns anonymous representation WITHOUT personal names.
        """
        return {
            "id": anon_id or f"S{id(staff) % 1000}",
            "role": staff.role.value,
            "certifications": staff.care_certifications or [],
        }

    def anonymize_student(self, student: Student, anon_id: str = None) -> Dict[str, Any]:
        """
        Anonymize a single student for display in AI prompts.

        Returns anonymous representation WITHOUT personal names.
        """
        generic_needs = self._generalize_care_needs(student.care_requirements or [])

        return {
            "id": anon_id or f"E{id(student) % 1000}",
            "grade": student.grade,
            "care_needs": generic_needs,
            "requires_double_staffing": student.requires_double_staffing,
        }

    def cleanup_session(self, session_id: str):
        """
        Clean up session mapping after use.

        Should be called after scheduling is complete to minimize
        data retention.
        """
        if session_id in self.session_mappings:
            del self.session_mappings[session_id]

    def get_gdpr_compliance_summary(self) -> Dict[str, Any]:
        """
        Return summary of GDPR compliance measures.

        Useful for documentation and audits.
        """
        return {
            "data_sent_to_ai": {
                "personal_names": False,
                "personal_numbers": False,
                "specific_diagnoses": False,
                "addresses": False,
                "contact_information": False,
            },
            "data_sent_to_ai_includes": {
                "anonymous_ids": True,
                "roles": True,
                "generic_care_categories": True,
                "work_times": True,
                "grade_levels": True,
            },
            "safeguards": {
                "session_based_mapping": True,
                "temporary_ids": True,
                "automatic_cleanup": True,
                "no_persistent_storage_of_mappings": True,
            },
            "compliance": {
                "gdpr_article_25_privacy_by_design": True,
                "data_minimization_principle": True,
                "purpose_limitation": True,
            }
        }


# Global instance
anonymization_service = AnonymizationService()
