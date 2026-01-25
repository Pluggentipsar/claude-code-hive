"""
Constraint definitions for scheduling.

Defines both hard constraints (must be satisfied) and soft constraints (preferences).
"""

from typing import Dict, List, Any, Tuple
from ortools.sat.python import cp_model
from datetime import datetime, timedelta, date

from app.models import Student, Staff, CareTime, WorkHour, Absence


class ConstraintEngine:
    """
    Defines and adds constraints to the CP-SAT model.

    Handles both hard constraints (must satisfy) and soft constraints (weighted preferences).
    """

    def __init__(
        self,
        model: cp_model.CpModel,
        students: List[Student],
        staff: List[Staff],
        week_number: int,
        year: int,
        absences: List[Absence] = None,
    ):
        """
        Initialize constraint engine.

        Args:
            model: OR-Tools CP-SAT model
            students: List of students
            staff: List of staff members
            week_number: Week number to schedule
            year: Year
            absences: List of staff absences for this week
        """
        self.model = model
        self.students = students
        self.staff = staff
        self.week_number = week_number
        self.year = year
        self.absences = absences or []

        # Create student and staff lookup maps
        self.student_map = {s.id: s for s in students}
        self.staff_map = {s.id: s for s in staff}

        # Decision variables (will be set by scheduler)
        self.assignments = {}  # (student_id, staff_id, timeslot) -> BoolVar

        # Soft constraint violations tracking (for objective function)
        self.soft_violations = []

    def set_decision_variables(self, assignments: Dict[Tuple, Any]) -> None:
        """
        Set the decision variables created by the scheduler.

        Args:
            assignments: Dictionary of (student_id, staff_id, timeslot) -> BoolVar
        """
        self.assignments = assignments

    # =========================================================================
    # HARD CONSTRAINTS (Must be satisfied)
    # =========================================================================

    def add_all_hard_constraints(self) -> None:
        """Add all hard constraints to the model."""
        print("Adding hard constraints...")

        initial_constraints = len(self.model.Proto().constraints)

        self.add_one_to_one_coverage()
        print(f"  After one_to_one_coverage: {len(self.model.Proto().constraints) - initial_constraints} constraints")

        self.add_care_needs_matching()
        print(f"  After care_needs_matching: {len(self.model.Proto().constraints) - initial_constraints} constraints")

        self.add_double_staffing()
        print(f"  After double_staffing: {len(self.model.Proto().constraints) - initial_constraints} constraints")

        self.add_staff_availability()
        print(f"  After staff_availability: {len(self.model.Proto().constraints) - initial_constraints} constraints")

        self.add_working_hours_limits()
        print(f"  After working_hours_limits: {len(self.model.Proto().constraints) - initial_constraints} constraints")

        self.add_no_overlapping_assignments()
        print(f"  After no_overlapping_assignments: {len(self.model.Proto().constraints) - initial_constraints} constraints")

        print(f"Hard constraints added: {len(self.model.Proto().constraints)} total constraints")

    def add_one_to_one_coverage(self) -> None:
        """
        HARD CONSTRAINT: Each student must have exactly one staff member assigned
        during their care times (plus teacher for class time).

        Grundbemanning: 1 personal per elev + pedagog

        Note: Students requiring double staffing are handled by add_double_staffing instead.
        """
        for student in self.students:
            # Skip students requiring double staffing (handled by add_double_staffing)
            if student.requires_double_staffing:
                continue

            # Get care times for this student
            care_times = self._get_care_times_for_student(student)

            for timeslot in care_times:
                # Get all possible assignments for this student in this timeslot
                student_assignments = [
                    self.assignments.get((student.id, staff.id, timeslot))
                    for staff in self.staff
                    if (student.id, staff.id, timeslot) in self.assignments
                ]

                if student_assignments:
                    # Exactly one staff member must be assigned
                    # (unless during class time when teacher is also present)
                    is_class_time = self._is_class_time(timeslot)

                    if is_class_time:
                        # During class: at least 1 assistant (teacher is separate)
                        self.model.Add(sum(student_assignments) >= 1)
                    else:
                        # During fritids: exactly 1
                        self.model.Add(sum(student_assignments) == 1)

    def add_care_needs_matching(self) -> None:
        """
        HARD CONSTRAINT: Students with care needs (vårdkrav) must be assigned
        to staff with appropriate certifications.

        Example: Student with epilepsy must have staff certified for epilepsy care.

        For double-staffing students: At least ONE of the two staff must be certified.
        For regular students: The ONE assigned staff must be certified.
        """
        for student in self.students:
            if not student.has_care_needs:
                continue

            care_requirements = student.care_requirements or []
            if not care_requirements:
                continue

            care_times = self._get_care_times_for_student(student)

            for timeslot in care_times:
                # Find staff with required certifications
                qualified_staff = [
                    staff for staff in self.staff
                    if self._has_required_certifications(staff, care_requirements)
                ]

                if not qualified_staff:
                    # No qualified staff available - this will make problem infeasible
                    print(f"WARNING: No staff qualified for {student.full_name}'s care needs: {care_requirements}")
                    continue

                if student.requires_double_staffing:
                    # For double-staffing: At least ONE of the two staff must be certified
                    qualified_assignments = [
                        self.assignments[(student.id, staff.id, timeslot)]
                        for staff in qualified_staff
                        if (student.id, staff.id, timeslot) in self.assignments
                    ]

                    if qualified_assignments:
                        # At least 1 certified staff must be assigned
                        self.model.Add(sum(qualified_assignments) >= 1)
                else:
                    # For regular students: Only allow assignments to qualified staff
                    for staff in self.staff:
                        if (student.id, staff.id, timeslot) in self.assignments:
                            assignment_var = self.assignments[(student.id, staff.id, timeslot)]
                            if staff not in qualified_staff:
                                # Force this assignment to False (not allowed)
                                self.model.Add(assignment_var == 0)

    def add_double_staffing(self) -> None:
        """
        HARD CONSTRAINT: Students requiring double staffing must have exactly
        two staff members assigned at all times.
        """
        for student in self.students:
            if not student.requires_double_staffing:
                continue

            print(f"   Adding double staffing for {student.full_name}")

            care_times = self._get_care_times_for_student(student)
            print(f"   Care times: {len(care_times)} timeslots")

            for timeslot in care_times:
                # Get all possible assignments for this student in this timeslot
                student_assignments = [
                    self.assignments.get((student.id, staff.id, timeslot))
                    for staff in self.staff
                    if (student.id, staff.id, timeslot) in self.assignments
                ]

                if not student_assignments:
                    print(f"   WARNING: No possible assignments for {student.full_name} in {timeslot}")
                elif len(student_assignments) < 2:
                    print(f"   WARNING: Only {len(student_assignments)} staff available for {student.full_name} in {timeslot} (need 2)")
                else:
                    # Exactly TWO staff members must be assigned
                    self.model.Add(sum(student_assignments) == 2)

    def add_staff_availability(self) -> None:
        """
        HARD CONSTRAINT: Staff can only be assigned during their working hours
        and when they are not absent.

        Includes:
        - Work schedule (WorkHour)
        - Absences (sick, vacation, etc.)
        - Lunch breaks
        """
        for staff in self.staff:
            # Get work hours for this staff member
            work_hours = self._get_work_hours_for_staff(staff)

            # Get absences for this staff member this week
            staff_absences = [a for a in self.absences if a.staff_id == staff.id]

            # For each timeslot, check if staff is available
            all_timeslots = self._get_all_timeslots()

            for timeslot in all_timeslots:
                is_available = self._is_staff_available(staff, timeslot, work_hours, staff_absences)

                if not is_available:
                    # Staff not available - disable all assignments in this timeslot
                    for student in self.students:
                        if (student.id, staff.id, timeslot) in self.assignments:
                            assignment_var = self.assignments[(student.id, staff.id, timeslot)]
                            self.model.Add(assignment_var == 0)

    def add_working_hours_limits(self) -> None:
        """
        HARD CONSTRAINT: Staff cannot work more than 40 hours per week.
        Also respect lunch breaks (not counted as working time).
        """
        for staff in self.staff:
            # Calculate total assigned hours
            total_hours_var = []

            for student in self.students:
                for timeslot in self._get_all_timeslots():
                    if (student.id, staff.id, timeslot) in self.assignments:
                        assignment_var = self.assignments[(student.id, staff.id, timeslot)]
                        # Each timeslot is typically 15 minutes (0.25 hours)
                        timeslot_duration = self._get_timeslot_duration(timeslot)
                        # Multiply boolean var by duration
                        total_hours_var.append(assignment_var * timeslot_duration)

            if total_hours_var:
                # Sum must be <= 40 hours (converted to minutes: 40 * 60 = 2400)
                self.model.Add(sum(total_hours_var) <= 2400)  # 40 hours in minutes

    def add_no_overlapping_assignments(self) -> None:
        """
        HARD CONSTRAINT: A staff member cannot be assigned to multiple students
        at the same time (no overlapping assignments).
        """
        for staff in self.staff:
            for timeslot in self._get_all_timeslots():
                # Get all assignments for this staff member in this timeslot
                staff_assignments = [
                    self.assignments.get((student.id, staff.id, timeslot))
                    for student in self.students
                    if (student.id, staff.id, timeslot) in self.assignments
                ]

                if staff_assignments:
                    # At most one assignment per timeslot
                    self.model.Add(sum(staff_assignments) <= 1)

    # =========================================================================
    # SOFT CONSTRAINTS (Preferences - weighted in objective function)
    # =========================================================================

    def add_all_soft_constraints(self) -> List[Tuple[Any, int]]:
        """
        Add all soft constraints to the model.

        Returns:
            List of (violation_var, weight) tuples for objective function
        """
        print("Adding soft constraints...")

        soft_terms = []

        soft_terms.extend(self.add_preference_matching())
        soft_terms.extend(self.add_workload_balance())
        soft_terms.extend(self.add_continuity_preference())

        print(f"Soft constraints added: {len(soft_terms)} weighted terms")

        return soft_terms

    def add_preference_matching(self) -> List[Tuple[Any, int]]:
        """
        SOFT CONSTRAINT: Prefer assigning students to their preferred staff
        (trygghetsbehov).

        Weight: High (priority 8/10)
        """
        terms = []

        for student in self.students:
            preferred_staff_ids = student.preferred_staff or []

            if not preferred_staff_ids:
                continue

            care_times = self._get_care_times_for_student(student)

            for timeslot in care_times:
                for staff in self.staff:
                    if (student.id, staff.id, timeslot) not in self.assignments:
                        continue

                    assignment_var = self.assignments[(student.id, staff.id, timeslot)]

                    if str(staff.id) in preferred_staff_ids:
                        # Reward for matching preference (negative cost)
                        terms.append((assignment_var, -800))  # High weight
                    else:
                        # Small penalty for not matching preference
                        terms.append((assignment_var, 10))

        return terms

    def add_workload_balance(self) -> List[Tuple[Any, int]]:
        """
        SOFT CONSTRAINT: Balance workload evenly among staff to prevent burnout.

        Weight: Medium (priority 5/10)
        """
        terms = []

        # Calculate average hours per staff member
        total_care_hours = sum(
            len(self._get_care_times_for_student(s))
            for s in self.students
        )
        avg_hours_per_staff = total_care_hours / len(self.staff) if self.staff else 0

        # For each staff member, penalize deviation from average
        for staff in self.staff:
            staff_hours = []

            for student in self.students:
                for timeslot in self._get_all_timeslots():
                    if (student.id, staff.id, timeslot) in self.assignments:
                        assignment_var = self.assignments[(student.id, staff.id, timeslot)]
                        staff_hours.append(assignment_var)

            if staff_hours:
                # Create variable for total hours
                total_hours = sum(staff_hours)

                # Penalize deviation from average (both over and under)
                # This is approximate - OR-Tools CP-SAT doesn't support division well
                # So we use a simpler approach: penalize extremes

                # Penalty for too many hours (> avg + 20%)
                max_acceptable = int(avg_hours_per_staff * 1.2)
                overwork_var = self.model.NewBoolVar(f'overwork_{staff.id}')
                self.model.Add(total_hours > max_acceptable).OnlyEnforceIf(overwork_var)
                self.model.Add(total_hours <= max_acceptable).OnlyEnforceIf(overwork_var.Not())

                terms.append((overwork_var, 500))  # Medium penalty

                # Penalty for too few hours (< avg - 20%)
                min_acceptable = int(avg_hours_per_staff * 0.8)
                underwork_var = self.model.NewBoolVar(f'underwork_{staff.id}')
                self.model.Add(total_hours < min_acceptable).OnlyEnforceIf(underwork_var)
                self.model.Add(total_hours >= min_acceptable).OnlyEnforceIf(underwork_var.Not())

                terms.append((underwork_var, 300))  # Lower penalty

        return terms

    def add_continuity_preference(self) -> List[Tuple[Any, int]]:
        """
        SOFT CONSTRAINT: Prefer same staff member throughout the day for a student
        (continuity of care).

        Weight: Low-Medium (priority 4/10)
        """
        terms = []

        for student in self.students:
            # Group timeslots by day
            timeslots_by_day = self._group_timeslots_by_day(
                self._get_care_times_for_student(student)
            )

            for day, timeslots in timeslots_by_day.items():
                if len(timeslots) < 2:
                    continue  # Need at least 2 timeslots for continuity

                # For each pair of consecutive timeslots
                for i in range(len(timeslots) - 1):
                    slot1 = timeslots[i]
                    slot2 = timeslots[i + 1]

                    # For each staff member, check if assigned to both slots
                    for staff in self.staff:
                        key1 = (student.id, staff.id, slot1)
                        key2 = (student.id, staff.id, slot2)

                        if key1 in self.assignments and key2 in self.assignments:
                            assign1 = self.assignments[key1]
                            assign2 = self.assignments[key2]

                            # Create continuity variable (both assigned)
                            continuity_var = self.model.NewBoolVar(
                                f'continuity_{student.id}_{staff.id}_{slot1}_{slot2}'
                            )

                            # continuity_var = 1 iff both assign1 and assign2 are 1
                            self.model.AddBoolAnd([assign1, assign2]).OnlyEnforceIf(continuity_var)
                            self.model.AddBoolOr([assign1.Not(), assign2.Not()]).OnlyEnforceIf(
                                continuity_var.Not()
                            )

                            # Reward continuity (negative cost)
                            terms.append((continuity_var, -200))

        return terms

    # =========================================================================
    # HELPER METHODS
    # =========================================================================

    def _get_care_times_for_student(self, student: Student) -> List[str]:
        """
        Get all timeslots where student needs care.

        Returns:
            List of timeslot identifiers (e.g., "monday_08:00")
        """
        timeslots = []

        for care_time in student.care_times:
            # Check if valid for this week
            week_start = self._get_week_start_date()
            week_end = week_start + timedelta(days=7)

            if care_time.valid_to and care_time.valid_to < week_start:
                continue  # Expired

            if care_time.valid_from > week_end:
                continue  # Not yet valid

            # Generate timeslots for this care time
            weekday = care_time.weekday
            start = care_time.start_time
            end = care_time.end_time

            # Create 15-minute timeslots
            timeslots.extend(
                self._generate_timeslots(weekday, start, end)
            )

        return timeslots

    def _get_work_hours_for_staff(self, staff: Staff) -> Dict[int, Dict]:
        """
        Get work hours for staff member.

        Returns:
            Dictionary: {weekday: {'start': time, 'end': time, 'lunch_start': ..., 'lunch_end': ...}}
        """
        work_schedule = {}

        for work_hour in staff.work_hours:
            # Check if this work hour applies (week_number None or 0 = all weeks)
            week_parity = (self.week_number % 2) + 1  # 1 or 2

            if work_hour.week_number not in (None, 0) and work_hour.week_number != week_parity:
                continue  # Wrong week in rotation

            work_schedule[work_hour.weekday] = {
                'start': work_hour.start_time,
                'end': work_hour.end_time,
                'lunch_start': work_hour.lunch_start,
                'lunch_end': work_hour.lunch_end,
            }

        # Debug: Print work schedule for first staff member
        if len(work_schedule) == 0:
            print(f"   WARNING: {staff.full_name} has NO work hours! ({len(staff.work_hours)} work_hour records)")
            if staff.work_hours:
                print(f"   First work_hour: weekday={staff.work_hours[0].weekday}, week_number={staff.work_hours[0].week_number}")

        return work_schedule

    def _is_staff_available(
        self,
        staff: Staff,
        timeslot: str,
        work_hours: Dict,
        absences: List[Absence]
    ) -> bool:
        """
        Check if staff is available during timeslot.

        Considers:
        - Work schedule
        - Absences
        - Lunch breaks
        """
        # Parse timeslot: "monday_08:00"
        weekday_str, time_str = timeslot.split('_')
        weekday = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].index(weekday_str)

        # Check if staff works this day
        if weekday not in work_hours:
            return False

        schedule = work_hours[weekday]

        # Check if within working hours
        if time_str < schedule['start'] or time_str >= schedule['end']:
            return False

        # Check if during lunch break
        # TODO: Make lunch breaks a soft constraint instead of hard constraint
        # Staff should be able to work through lunch if necessary
        # if schedule.get('lunch_start') and schedule.get('lunch_end'):
        #     if schedule['lunch_start'] <= time_str < schedule['lunch_end']:
        #         return False

        # Check absences
        timeslot_date = self._get_date_for_timeslot(timeslot)

        for absence in absences:
            if absence.absence_date.date() == timeslot_date:
                if absence.start_time and absence.end_time:
                    # Partial day absence
                    if absence.start_time <= time_str < absence.end_time:
                        return False
                else:
                    # Full day absence
                    return False

        return True

    def _has_required_certifications(self, staff: Staff, requirements: List[str]) -> bool:
        """Check if staff has all required certifications."""
        staff_certs = set(staff.care_certifications or [])
        required_certs = set(requirements)
        return required_certs.issubset(staff_certs)

    def _is_class_time(self, timeslot: str) -> bool:
        """Check if timeslot is during class time (vs fritids)."""
        time_str = timeslot.split('_')[1]

        # Class times (approximately):
        # Grades 1-3: 08:30 - 13:30
        # Grades 4-6: 08:30 - 14:30/15:00 (varies by day)

        # Simplified: 08:30 - 15:00 is class time
        return "08:30" <= time_str < "15:00"

    def _get_all_timeslots(self) -> List[str]:
        """
        Get all possible timeslots in the week.

        Returns:
            List of timeslot identifiers
        """
        timeslots = []

        weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']

        for weekday_num, weekday_name in enumerate(weekdays):
            # Generate timeslots from 06:00 to 18:00 (school operating hours)
            timeslots.extend(
                self._generate_timeslots(weekday_num, "06:00", "18:00")
            )

        return timeslots

    def _generate_timeslots(self, weekday: int, start_time: str, end_time: str) -> List[str]:
        """
        Generate 15-minute timeslots between start and end time.

        Args:
            weekday: 0-6 (Monday-Sunday)
            start_time: Start time (HH:MM)
            end_time: End time (HH:MM)

        Returns:
            List of timeslot identifiers (e.g., ["monday_08:00", "monday_08:15", ...])
        """
        weekday_names = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        weekday_name = weekday_names[weekday]

        timeslots = []

        # Parse times
        start_hour, start_min = map(int, start_time.split(':'))
        end_hour, end_min = map(int, end_time.split(':'))

        current_min = start_hour * 60 + start_min
        end_min_total = end_hour * 60 + end_min

        # Generate 15-minute slots
        while current_min < end_min_total:
            hour = current_min // 60
            minute = current_min % 60
            time_str = f"{hour:02d}:{minute:02d}"

            timeslots.append(f"{weekday_name}_{time_str}")

            current_min += 15  # 15-minute slots

        return timeslots

    def _get_timeslot_duration(self, timeslot: str) -> int:
        """Get duration of timeslot in minutes (typically 15)."""
        return 15

    def _get_week_start_date(self) -> datetime:
        """Get the Monday of the target week."""
        # ISO week date calculation
        jan_4 = datetime(self.year, 1, 4)
        week_1_monday = jan_4 - timedelta(days=jan_4.weekday())
        target_monday = week_1_monday + timedelta(weeks=self.week_number - 1)
        return target_monday

    def _get_date_for_timeslot(self, timeslot: str) -> date:
        """Get the date for a timeslot."""
        weekday_str = timeslot.split('_')[0]
        weekday_num = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].index(weekday_str)

        week_start = self._get_week_start_date()
        return (week_start + timedelta(days=weekday_num)).date()

    def _group_timeslots_by_day(self, timeslots: List[str]) -> Dict[str, List[str]]:
        """Group timeslots by day."""
        groups = {}

        for timeslot in timeslots:
            day = timeslot.split('_')[0]
            if day not in groups:
                groups[day] = []
            groups[day].append(timeslot)

        # Sort each day's timeslots
        for day in groups:
            groups[day].sort()

        return groups
