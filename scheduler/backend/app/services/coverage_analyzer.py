"""
Coverage analyzer service - identifies staffing gaps in schedules.

This service analyzes generated schedules to find:
- Timeslots without sufficient staff
- Students missing coverage
- Classes that are understaffed
- Double staffing requirements not met
"""

from datetime import datetime, time
from typing import List, Dict, Set
from uuid import UUID
from collections import defaultdict

from app.models.schedule import Schedule, StaffAssignment
from app.models.student import Student, CareTime
from app.models.staff import Staff, WorkHour


class CoverageGap:
    """Represents a staffing gap in the schedule."""

    def __init__(
        self,
        weekday: int,
        start_time: str,
        end_time: str,
        required_staff: int,
        available_staff: int,
        affected_students: List[UUID],
    ):
        self.weekday = weekday
        self.start_time = start_time
        self.end_time = end_time
        self.required_staff = required_staff
        self.available_staff = available_staff
        self.affected_students = affected_students
        self.severity = self._calculate_severity()

    def _calculate_severity(self) -> str:
        """Calculate gap severity based on staff shortage."""
        shortage = self.required_staff - self.available_staff

        if shortage >= 2:
            return "critical"  # 2+ staff missing
        elif shortage == 1:
            return "warning"  # 1 staff missing
        else:
            return "ok"  # Adequate coverage


class CoverageAnalyzer:
    """Service for analyzing schedule coverage and identifying gaps."""

    def __init__(self):
        self.time_slot_duration = 15  # minutes

    def analyze_schedule(
        self, schedule: Schedule, students: List[Student], staff: List[Staff]
    ) -> Dict:
        """
        Comprehensive coverage analysis.

        Returns:
            Dict with:
                - understaffed_timeslots: List of gaps
                - uncovered_students: List of student IDs
                - double_staffing_violations: List of student IDs
                - total_gaps: int
                - critical_gaps: int
        """
        # Build lookup maps
        student_map = {s.id: s for s in students}
        staff_map = {s.id: s for s in staff}

        # Analyze timeslots
        understaffed_timeslots = self._find_understaffed_timeslots(
            schedule, students, student_map
        )

        # Find uncovered students (students with care times but no assignments)
        uncovered_students = self._find_uncovered_students(schedule, students)

        # Find double staffing violations
        double_staffing_violations = self._find_double_staffing_violations(
            schedule, students, student_map
        )

        # Count gaps by severity
        critical_gaps = sum(
            1 for gap in understaffed_timeslots if gap["severity"] == "critical"
        )

        return {
            "schedule_id": schedule.id,  # Keep as UUID, not string
            "total_gaps": len(understaffed_timeslots),
            "critical_gaps": critical_gaps,
            "understaffed_timeslots": understaffed_timeslots,
            "uncovered_students": uncovered_students,
            "double_staffing_violations": double_staffing_violations,
        }

    def _find_understaffed_timeslots(
        self, schedule: Schedule, students: List[Student], student_map: Dict[UUID, Student]
    ) -> List[Dict]:
        """Find timeslots with insufficient staff."""
        gaps = []

        # Group assignments by weekday and time
        timeslot_assignments = defaultdict(lambda: defaultdict(set))

        for assignment in schedule.assignments:
            # Parse times
            start_time = self._parse_time(assignment.start_time)
            end_time = self._parse_time(assignment.end_time)

            # Generate 15-minute slots
            current_time = start_time
            while current_time < end_time:
                time_key = current_time.strftime("%H:%M")
                timeslot_assignments[assignment.weekday][time_key].add(
                    assignment.staff_id
                )
                current_time = self._add_minutes(current_time, 15)

        # For each student, check their care times
        for student in students:
            if not hasattr(student, 'care_times') or not student.care_times:
                continue

            for care_time in student.care_times:
                # Check if care time is currently valid
                if not self._is_care_time_valid(care_time):
                    continue

                # Generate timeslots for this care time
                start_time = self._parse_time(care_time.start_time)
                end_time = self._parse_time(care_time.end_time)

                current_time = start_time
                while current_time < end_time:
                    time_key = current_time.strftime("%H:%M")
                    weekday = care_time.weekday

                    # Count staff assigned at this timeslot
                    staff_at_slot = len(timeslot_assignments[weekday].get(time_key, set()))

                    # Determine required staff
                    required = 2 if student.requires_double_staffing else 1

                    if staff_at_slot < required:
                        # Found a gap
                        gap = {
                            "weekday": weekday,
                            "start_time": time_key,
                            "end_time": self._add_minutes(current_time, 15).strftime("%H:%M"),
                            "required_staff": required,
                            "available_staff": staff_at_slot,
                            "affected_students": [str(student.id)],
                            "severity": "critical" if (required - staff_at_slot) >= 2 else "warning",
                        }
                        gaps.append(gap)

                    current_time = self._add_minutes(current_time, 15)

        # Merge adjacent gaps for the same timeslot
        return self._merge_adjacent_gaps(gaps)

    def _find_uncovered_students(
        self, schedule: Schedule, students: List[Student]
    ) -> List[Dict]:
        """Find students who have care times but no staff assignments."""
        uncovered = []

        # Get all students with assignments
        students_with_assignments = set()
        for assignment in schedule.assignments:
            if assignment.student_id:
                students_with_assignments.add(assignment.student_id)

        # Check each student
        for student in students:
            if not hasattr(student, 'care_times') or not student.care_times:
                continue

            # Student has care times but no assignments
            if student.id not in students_with_assignments:
                uncovered.append({
                    "id": student.id,  # Keep as UUID
                    "full_name": f"{student.first_name} {student.last_name}",
                    "grade": student.grade,
                    "requires_double_staffing": student.requires_double_staffing,
                })

        return uncovered

    def _find_double_staffing_violations(
        self, schedule: Schedule, students: List[Student], student_map: Dict[UUID, Student]
    ) -> List[Dict]:
        """Find students requiring double staffing but only have single staff."""
        violations = []

        # Group assignments by student and timeslot
        student_timeslot_staff = defaultdict(lambda: defaultdict(set))

        for assignment in schedule.assignments:
            if not assignment.student_id:
                continue

            start_time = self._parse_time(assignment.start_time)
            end_time = self._parse_time(assignment.end_time)

            current_time = start_time
            while current_time < end_time:
                time_key = f"{assignment.weekday}_{current_time.strftime('%H:%M')}"
                student_timeslot_staff[assignment.student_id][time_key].add(
                    assignment.staff_id
                )
                current_time = self._add_minutes(current_time, 15)

        # Check students requiring double staffing
        for student in students:
            if not student.requires_double_staffing:
                continue

            # Check if any timeslot has < 2 staff
            for timeslot, staff_set in student_timeslot_staff.get(student.id, {}).items():
                if len(staff_set) < 2:
                    violations.append({
                        "id": student.id,  # Keep as UUID
                        "full_name": f"{student.first_name} {student.last_name}",
                        "grade": student.grade,
                        "requires_double_staffing": student.requires_double_staffing,
                    })
                    break  # Only report once per student

        return violations

    def _merge_adjacent_gaps(self, gaps: List[Dict]) -> List[Dict]:
        """Merge adjacent gaps for cleaner reporting."""
        if not gaps:
            return []

        # Sort by weekday and time
        sorted_gaps = sorted(
            gaps, key=lambda g: (g["weekday"], g["start_time"])
        )

        merged = []
        current_gap = sorted_gaps[0].copy()

        for gap in sorted_gaps[1:]:
            # Check if adjacent (same weekday, end time matches start time)
            if (
                gap["weekday"] == current_gap["weekday"]
                and gap["start_time"] == current_gap["end_time"]
                and gap["severity"] == current_gap["severity"]
            ):
                # Extend current gap
                current_gap["end_time"] = gap["end_time"]
                # Merge affected students
                current_gap["affected_students"].extend(gap["affected_students"])
                current_gap["affected_students"] = list(
                    set(current_gap["affected_students"])
                )
            else:
                # Save current and start new
                merged.append(current_gap)
                current_gap = gap.copy()

        # Add final gap
        merged.append(current_gap)

        return merged

    def _parse_time(self, time_str: str) -> time:
        """Parse time string to time object."""
        return datetime.strptime(time_str, "%H:%M").time()

    def _add_minutes(self, t: time, minutes: int) -> time:
        """Add minutes to time object."""
        dt = datetime.combine(datetime.today(), t)
        dt = dt.replace(minute=dt.minute + minutes)
        return dt.time()

    def _is_care_time_valid(self, care_time: CareTime) -> bool:
        """Check if care time is currently valid based on valid_from/valid_to."""
        now = datetime.now()

        if care_time.valid_from and care_time.valid_from > now:
            return False

        if care_time.valid_to and care_time.valid_to < now:
            return False

        return True
