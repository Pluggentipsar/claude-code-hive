"""
Core Scheduling Engine using Google OR-Tools CP-SAT Solver.

This is the heart of the scheduling system - generates optimal weekly schedules
based on constraints and preferences.
"""

from typing import List, Dict, Tuple, Any, Optional
from datetime import datetime, timedelta
import uuid

from ortools.sat.python import cp_model

from app.models import (
    Student, Staff, Schedule, StaffAssignment, Absence,
    SolverStatus, AssignmentType
)
from app.core.constraints import ConstraintEngine


class SchedulingError(Exception):
    """Raised when scheduling fails."""
    pass


class SchoolScheduler:
    """
    Main scheduler class using Google OR-Tools CP-SAT solver.

    Generates optimal weekly schedules considering all constraints and preferences.
    """

    def __init__(self, max_solve_time_seconds: int = 60):
        """
        Initialize scheduler.

        Args:
            max_solve_time_seconds: Maximum time for solver to run
        """
        self.max_solve_time_seconds = max_solve_time_seconds
        self.model = None
        self.solver = None
        self.decision_vars = {}
        self.constraint_engine = None

    def create_schedule(
        self,
        students: List[Student],
        staff: List[Staff],
        week_number: int,
        year: int,
        absences: Optional[List[Absence]] = None
    ) -> Schedule:
        """
        Generate an optimal schedule for the given week.

        Args:
            students: List of active students
            staff: List of active staff members
            week_number: Week number (1-53)
            year: Year
            absences: List of staff absences for this week

        Returns:
            Schedule object with assignments

        Raises:
            SchedulingError: If scheduling fails
        """
        print(f"\n{'='*60}")
        print(f"Generating Schedule for Week {week_number}, {year}")
        print(f"{'='*60}")
        print(f"Students: {len(students)}")
        print(f"Staff: {len(staff)}")
        print(f"Absences: {len(absences) if absences else 0}")

        # Validate inputs
        if not students:
            raise SchedulingError("No students provided")
        if not staff:
            raise SchedulingError("No staff provided")

        start_time = datetime.now()

        # Create CP-SAT model
        self.model = cp_model.CpModel()
        self.solver = cp_model.CpSolver()
        self.solver.parameters.max_time_in_seconds = self.max_solve_time_seconds

        # Create constraint engine
        self.constraint_engine = ConstraintEngine(
            model=self.model,
            students=students,
            staff=staff,
            week_number=week_number,
            year=year,
            absences=absences or []
        )

        # Step 1: Create decision variables
        print("\n1. Creating decision variables...")
        self._create_decision_variables(students, staff)

        # Step 2: Add constraints
        print("\n2. Adding constraints...")
        self.constraint_engine.set_decision_variables(self.decision_vars)
        self.constraint_engine.add_all_hard_constraints()

        # Step 3: Add soft constraints and create objective function
        print("\n3. Creating objective function...")
        soft_terms = self.constraint_engine.add_all_soft_constraints()
        self._create_objective_function(soft_terms)

        # Step 4: Solve
        print("\n4. Solving...")
        print(f"   Variables: {len(self.decision_vars)}")
        print(f"   Constraints: {len(self.model.Proto().constraints)}")

        status = self.solver.Solve(self.model)

        solve_time = (datetime.now() - start_time).total_seconds() * 1000  # milliseconds

        print(f"\n5. Solver finished in {solve_time:.0f}ms")
        print(f"   Status: {self._status_name(status)}")

        # Step 5: Extract solution
        if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            print(f"   Objective value: {self.solver.ObjectiveValue()}")
            print(f"   Hard constraints met: {status == cp_model.OPTIMAL}")

            schedule = self._extract_solution(
                students, staff, week_number, year, status, solve_time
            )

            print(f"\n6. Schedule created with {len(schedule.assignments)} assignments")
            print(f"{'='*60}\n")

            return schedule

        elif status == cp_model.INFEASIBLE:
            raise SchedulingError(
                "No feasible schedule exists. This usually means:\n"
                "- Not enough qualified staff for students with care needs\n"
                "- Too many absences\n"
                "- Conflicting constraints\n"
                "Try adjusting constraints or adding more staff."
            )

        elif status == cp_model.MODEL_INVALID:
            raise SchedulingError("Invalid model - internal error in constraint setup")

        else:
            # UNKNOWN or other status
            raise SchedulingError(f"Solver failed with status: {self._status_name(status)}")

    def _create_decision_variables(
        self,
        students: List[Student],
        staff: List[Staff]
    ) -> None:
        """
        Create boolean decision variables for all possible assignments.

        Decision variable: assignment[student_id, staff_id, timeslot]
        True if staff member is assigned to student in that timeslot.
        """
        # Get all timeslots (from constraint engine helper)
        all_timeslots = self.constraint_engine._get_all_timeslots()

        print(f"   Creating variables for {len(students)} students × {len(staff)} staff × {len(all_timeslots)} timeslots")

        var_count = 0

        for student in students:
            # Get care times for this student
            student_timeslots = self.constraint_engine._get_care_times_for_student(student)

            for staff_member in staff:
                for timeslot in student_timeslots:
                    # Create boolean variable
                    var_name = f"assign_{student.id}_{staff_member.id}_{timeslot}"
                    var = self.model.NewBoolVar(var_name)

                    # Store in decision variables dictionary
                    self.decision_vars[(student.id, staff_member.id, timeslot)] = var

                    var_count += 1

        print(f"   Created {var_count} decision variables")

    def _create_objective_function(self, soft_terms: List[Tuple[Any, int]]) -> None:
        """
        Create objective function to minimize soft constraint violations
        and maximize preferences.

        Args:
            soft_terms: List of (variable, weight) tuples from soft constraints
        """
        if not soft_terms:
            print("   No soft constraints - using dummy objective")
            # Create dummy objective (minimize 0)
            self.model.Minimize(0)
            return

        # Objective: minimize weighted sum of soft constraint violations
        # (negative weights = rewards for good assignments)
        objective_terms = [var * weight for var, weight in soft_terms]

        self.model.Minimize(sum(objective_terms))

        print(f"   Objective function created with {len(soft_terms)} weighted terms")

    def _extract_solution(
        self,
        students: List[Student],
        staff: List[Staff],
        week_number: int,
        year: int,
        solver_status: int,
        solve_time_ms: float
    ) -> Schedule:
        """
        Extract the solution from the solver and create Schedule object.

        Args:
            students: List of students
            staff: List of staff
            week_number: Week number
            year: Year
            solver_status: CP-SAT solver status
            solve_time_ms: Solving time in milliseconds

        Returns:
            Schedule object with all assignments
        """
        # Create Schedule object
        schedule = Schedule(
            id=uuid.uuid4(),
            week_number=week_number,
            year=year,
            solver_status=self._map_solver_status(solver_status),
            objective_value=float(self.solver.ObjectiveValue()),
            solve_time_ms=int(solve_time_ms),
            hard_constraints_met=(solver_status == cp_model.OPTIMAL),
            soft_constraints_score=self._calculate_soft_score(),
            is_published=False,
            created_by="system",
        )

        # Extract assignments
        assignments = []

        for (student_id, staff_id, timeslot), var in self.decision_vars.items():
            # Check if this assignment is active in the solution
            if self.solver.Value(var) == 1:
                # Parse timeslot: "monday_08:00"
                weekday_str, time_str = timeslot.split('_')
                weekday_num = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].index(weekday_str)

                # Determine assignment type
                student = next(s for s in students if s.id == student_id)
                assignment_type = self._determine_assignment_type(student, time_str)

                # Create StaffAssignment
                # Note: We create one assignment per timeslot for now
                # In a real system, you'd want to merge consecutive timeslots
                assignment = StaffAssignment(
                    id=uuid.uuid4(),
                    schedule_id=schedule.id,
                    staff_id=staff_id,
                    student_id=student_id,
                    class_id=student.class_id,
                    weekday=weekday_num,
                    start_time=time_str,
                    end_time=self._add_minutes_to_time(time_str, 15),  # 15-min slots
                    assignment_type=assignment_type,
                    is_manual_override=False,
                )

                assignments.append(assignment)

        # Merge consecutive timeslots for the same staff-student pair
        merged_assignments = self._merge_consecutive_assignments(assignments)

        schedule.assignments = merged_assignments

        return schedule

    def _merge_consecutive_assignments(
        self,
        assignments: List[StaffAssignment]
    ) -> List[StaffAssignment]:
        """
        Merge consecutive 15-minute assignments into longer blocks.

        Example: 3 assignments from 08:00-08:15, 08:15-08:30, 08:30-08:45
                 becomes 1 assignment from 08:00-08:45
        """
        if not assignments:
            return []

        # Group by (staff_id, student_id, weekday)
        groups = {}

        for assignment in assignments:
            key = (assignment.staff_id, assignment.student_id, assignment.weekday)
            if key not in groups:
                groups[key] = []
            groups[key].append(assignment)

        # Merge within each group
        merged = []

        for key, group in groups.items():
            # Sort by start time
            group.sort(key=lambda a: a.start_time)

            # Merge consecutive slots
            current = group[0]

            for next_assignment in group[1:]:
                # Check if consecutive (current end == next start)
                if current.end_time == next_assignment.start_time:
                    # Extend current assignment
                    current.end_time = next_assignment.end_time
                else:
                    # Gap detected - save current and start new
                    merged.append(current)
                    current = next_assignment

            # Add final assignment
            merged.append(current)

        return merged

    def _determine_assignment_type(self, student: Student, time_str: str) -> AssignmentType:
        """
        Determine the type of assignment based on time and student needs.

        Args:
            student: Student object
            time_str: Time string (HH:MM)

        Returns:
            AssignmentType enum
        """
        if student.requires_double_staffing:
            return AssignmentType.DOUBLE_STAFFING

        # Class time vs fritids
        if "08:30" <= time_str < "15:00":
            return AssignmentType.ONE_TO_ONE
        else:
            return AssignmentType.LEISURE

    def _calculate_soft_score(self) -> float:
        """
        Calculate a score (0-100) for how well soft constraints are satisfied.

        Higher is better.
        """
        if not self.constraint_engine:
            return 0.0

        # Simple heuristic: convert objective value to 0-100 scale
        # (This is approximate - would need calibration for real use)
        obj_value = self.solver.ObjectiveValue()

        # Assuming objective is minimization with range roughly -10000 to +10000
        # Map to 0-100 where 100 = perfect (obj = -10000)
        normalized = max(0, min(100, 50 - (obj_value / 200)))

        return float(normalized)

    def _map_solver_status(self, status: int) -> SolverStatus:
        """Map OR-Tools solver status to our SolverStatus enum."""
        mapping = {
            cp_model.OPTIMAL: SolverStatus.OPTIMAL,
            cp_model.FEASIBLE: SolverStatus.FEASIBLE,
            cp_model.INFEASIBLE: SolverStatus.INFEASIBLE,
            cp_model.MODEL_INVALID: SolverStatus.ERROR,
        }

        return mapping.get(status, SolverStatus.ERROR)

    def _status_name(self, status: int) -> str:
        """Get human-readable name for solver status."""
        names = {
            cp_model.OPTIMAL: "OPTIMAL",
            cp_model.FEASIBLE: "FEASIBLE",
            cp_model.INFEASIBLE: "INFEASIBLE",
            cp_model.MODEL_INVALID: "MODEL_INVALID",
            cp_model.UNKNOWN: "UNKNOWN",
        }

        return names.get(status, f"UNKNOWN({status})")

    def _add_minutes_to_time(self, time_str: str, minutes: int) -> str:
        """
        Add minutes to a time string.

        Args:
            time_str: Time in HH:MM format
            minutes: Minutes to add

        Returns:
            New time string in HH:MM format
        """
        hour, minute = map(int, time_str.split(':'))
        total_minutes = hour * 60 + minute + minutes

        new_hour = (total_minutes // 60) % 24
        new_minute = total_minutes % 60

        return f"{new_hour:02d}:{new_minute:02d}"
