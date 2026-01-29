"""
Substitute finder service - suggests replacement staff for absences.

This service identifies suitable substitute staff when a staff member is absent,
based on certifications, availability, workload, and proximity.
"""

from datetime import datetime, time, timedelta
from typing import List, Dict, Optional, Set
from uuid import UUID
from collections import defaultdict

from app.models.staff import Staff, WorkHour
from app.models.student import Student
from app.models.schedule import Schedule, StaffAssignment


class StaffSuggestion:
    """Represents a suggested substitute staff member."""

    def __init__(
        self,
        staff: Staff,
        match_score: float,
        available_hours: float,
        matching_certifications: List[str],
        reason: str,
    ):
        self.staff = staff
        self.match_score = match_score  # 0-100
        self.available_hours = available_hours
        self.matching_certifications = matching_certifications
        self.reason = reason

    def to_dict(self) -> Dict:
        return {
            "id": str(self.staff.id),
            "full_name": f"{self.staff.first_name} {self.staff.last_name}",
            "role": self.staff.role.value,
            "care_certifications": self.staff.care_certifications or [],
            "match_score": self.match_score,
            "available_hours": self.available_hours,
            "matching_certifications": self.matching_certifications,
            "reason": self.reason,
        }


class SubstituteFinder:
    """Service for finding substitute staff members."""

    def __init__(self):
        self.max_weekly_hours = 40

    def find_substitutes(
        self,
        absent_staff: Staff,
        affected_students: List[Student],
        all_staff: List[Staff],
        week_number: int,
        year: int,
        schedule: Optional[Schedule] = None,
    ) -> List[Dict]:
        """
        Find suitable substitute staff for an absent staff member.

        Args:
            absent_staff: The staff member who is absent
            affected_students: Students affected by the absence
            all_staff: All available staff members
            week_number: Week number for the absence
            year: Year for the absence
            schedule: Current schedule (if exists) for workload calculation

        Returns:
            List of staff suggestions sorted by match score (highest first)
        """
        suggestions = []

        # Get required certifications from affected students
        required_certs = self._get_required_certifications(affected_students)

        # Get absent staff's work hours
        absent_work_times = self._get_work_times(absent_staff, week_number)

        # Calculate current workload for all staff (if schedule exists)
        staff_workload = {}
        if schedule:
            staff_workload = self._calculate_staff_workload(schedule, all_staff)

        for staff in all_staff:
            # Skip the absent staff member
            if staff.id == absent_staff.id:
                continue

            # Skip inactive staff
            if not staff.active:
                continue

            # Check certification match
            cert_match = self._check_certification_match(
                staff, required_certs
            )
            if not cert_match["matches"]:
                continue  # Must have required certifications

            # Check time availability
            time_match = self._check_time_availability(
                staff, absent_work_times, week_number
            )
            if not time_match["has_overlap"]:
                continue  # Must work during the same times

            # Calculate workload availability
            current_hours = staff_workload.get(staff.id, 0)
            available_hours = self.max_weekly_hours - current_hours
            if available_hours < 4:  # Need at least 4 hours capacity
                continue

            # Calculate match score
            match_score = self._calculate_match_score(
                staff,
                absent_staff,
                cert_match,
                time_match,
                available_hours,
            )

            # Generate reason
            reason = self._generate_reason(
                staff,
                cert_match,
                time_match,
                available_hours,
            )

            suggestion = StaffSuggestion(
                staff=staff,
                match_score=match_score,
                available_hours=available_hours,
                matching_certifications=cert_match["matching"],
                reason=reason,
            )

            suggestions.append(suggestion.to_dict())

        # Sort by match score (highest first)
        suggestions.sort(key=lambda x: x["match_score"], reverse=True)

        return suggestions

    def _get_required_certifications(
        self, students: List[Student]
    ) -> Set[str]:
        """Extract all required certifications from affected students."""
        required = set()
        for student in students:
            if student.has_care_needs and student.care_requirements:
                required.update(student.care_requirements)
        return required

    def _get_work_times(
        self, staff: Staff, week_number: int
    ) -> List[Dict]:
        """Get staff work times for the relevant week."""
        work_times = []

        if not hasattr(staff, 'work_hours') or not staff.work_hours:
            return work_times

        for work_hour in staff.work_hours:
            # Check if work hour applies to this week
            # week_number field: 0 = both weeks, 1 = week 1, 2 = week 2
            if work_hour.week_number == 0:
                # Applies to both weeks
                work_times.append({
                    "weekday": work_hour.weekday,
                    "start_time": work_hour.start_time,
                    "end_time": work_hour.end_time,
                })
            elif work_hour.week_number == 1 and week_number % 2 == 1:
                # Week 1 of rotation
                work_times.append({
                    "weekday": work_hour.weekday,
                    "start_time": work_hour.start_time,
                    "end_time": work_hour.end_time,
                })
            elif work_hour.week_number == 2 and week_number % 2 == 0:
                # Week 2 of rotation
                work_times.append({
                    "weekday": work_hour.weekday,
                    "start_time": work_hour.start_time,
                    "end_time": work_hour.end_time,
                })

        return work_times

    def _check_certification_match(
        self, staff: Staff, required_certs: Set[str]
    ) -> Dict:
        """Check if staff has required certifications."""
        staff_certs = set(staff.care_certifications or [])
        matching = required_certs.intersection(staff_certs)
        missing = required_certs - staff_certs

        return {
            "matches": len(missing) == 0,  # Must have ALL required certs
            "matching": list(matching),
            "missing": list(missing),
            "percentage": (
                len(matching) / len(required_certs) * 100
                if required_certs
                else 100
            ),
        }

    def _check_time_availability(
        self, staff: Staff, required_times: List[Dict], week_number: int
    ) -> Dict:
        """Check if staff works during required times."""
        staff_work_times = self._get_work_times(staff, week_number)

        overlaps = []
        coverage_percentage = 0

        for required in required_times:
            req_start = self._parse_time(required["start_time"])
            req_end = self._parse_time(required["end_time"])
            req_weekday = required["weekday"]

            for staff_time in staff_work_times:
                if staff_time["weekday"] != req_weekday:
                    continue

                staff_start = self._parse_time(staff_time["start_time"])
                staff_end = self._parse_time(staff_time["end_time"])

                # Calculate overlap
                overlap_start = max(req_start, staff_start)
                overlap_end = min(req_end, staff_end)

                if overlap_start < overlap_end:
                    overlaps.append({
                        "weekday": req_weekday,
                        "start_time": overlap_start.strftime("%H:%M"),
                        "end_time": overlap_end.strftime("%H:%M"),
                    })

        # Calculate coverage percentage
        if required_times:
            total_required_minutes = sum(
                self._time_diff_minutes(
                    self._parse_time(t["start_time"]),
                    self._parse_time(t["end_time"]),
                )
                for t in required_times
            )

            total_overlap_minutes = sum(
                self._time_diff_minutes(
                    self._parse_time(o["start_time"]),
                    self._parse_time(o["end_time"]),
                )
                for o in overlaps
            )

            coverage_percentage = (
                total_overlap_minutes / total_required_minutes * 100
                if total_required_minutes > 0
                else 0
            )

        return {
            "has_overlap": len(overlaps) > 0,
            "overlaps": overlaps,
            "coverage_percentage": coverage_percentage,
        }

    def _calculate_staff_workload(
        self, schedule: Schedule, all_staff: List[Staff]
    ) -> Dict[UUID, float]:
        """Calculate current weekly hours for each staff member."""
        workload = defaultdict(float)

        for assignment in schedule.assignments:
            start_time = self._parse_time(assignment.start_time)
            end_time = self._parse_time(assignment.end_time)
            hours = self._time_diff_minutes(start_time, end_time) / 60.0
            workload[assignment.staff_id] += hours

        return dict(workload)

    def _calculate_match_score(
        self,
        staff: Staff,
        absent_staff: Staff,
        cert_match: Dict,
        time_match: Dict,
        available_hours: float,
    ) -> float:
        """Calculate overall match score (0-100)."""
        score = 0.0

        # Certification match (40 points max)
        score += cert_match["percentage"] * 0.4

        # Time availability (30 points max)
        score += time_match["coverage_percentage"] * 0.3

        # Available capacity (20 points max)
        capacity_score = min(available_hours / 20.0, 1.0) * 20
        score += capacity_score

        # Same role bonus (10 points max)
        if staff.role == absent_staff.role:
            score += 10

        return min(score, 100.0)

    def _generate_reason(
        self,
        staff: Staff,
        cert_match: Dict,
        time_match: Dict,
        available_hours: float,
    ) -> str:
        """Generate human-readable reason for suggestion."""
        reasons = []

        # Certifications
        if cert_match["matching"]:
            cert_list = ", ".join(cert_match["matching"])
            reasons.append(f"Har certifieringar: {cert_list}")

        # Time coverage
        coverage = time_match["coverage_percentage"]
        if coverage >= 90:
            reasons.append(f"Arbetar samma tider ({int(coverage)}% täckning)")
        else:
            reasons.append(f"Delvis överlappande tider ({int(coverage)}% täckning)")

        # Available capacity
        reasons.append(f"{available_hours:.1f}h tillgängliga")

        return " | ".join(reasons)

    def _parse_time(self, time_str: str) -> time:
        """Parse time string to time object."""
        return datetime.strptime(time_str, "%H:%M").time()

    def _time_diff_minutes(self, start: time, end: time) -> float:
        """Calculate difference between two times in minutes."""
        start_dt = datetime.combine(datetime.today(), start)
        end_dt = datetime.combine(datetime.today(), end)
        return (end_dt - start_dt).total_seconds() / 60.0
