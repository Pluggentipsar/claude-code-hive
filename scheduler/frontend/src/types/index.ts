/**
 * TypeScript types for Kålgårdens Schemaläggningssystem
 */

// ============================================================================
// TYPE DEFINITIONS (String Literal Unions)
// ============================================================================

export type StaffRole = 'elevassistent' | 'pedagog' | 'fritidspedagog';

export type ScheduleType = 'two_week_rotation' | 'fixed';

export type GradeGroup = 'grades_1_3' | 'grades_4_6';

export type StaffGradeGroup = 'grades_1_3' | 'grades_4_6';

export type SolverStatus = 'optimal' | 'feasible' | 'infeasible' | 'timeout' | 'error';

export type AssignmentType = 'one_to_one' | 'class_coverage' | 'leisure' | 'double_staffing';

export type AbsenceReason = 'sick' | 'vacation' | 'parental_leave' | 'training' | 'other';

// ============================================================================
// STUDENT TYPES
// ============================================================================

export interface Student {
  id: string;
  personal_number: string;
  first_name: string;
  last_name: string;
  class_id: string | null;
  grade: number;
  has_care_needs: boolean;
  care_requirements: string[];
  preferred_staff: string[];
  requires_double_staffing: boolean;
  notes: string | null;
  active: boolean;
  care_times: CareTime[];
  created_at: string;
  updated_at: string;
}

export interface StudentCreate {
  personal_number: string;
  first_name: string;
  last_name: string;
  class_id?: string;
  grade: number;
  has_care_needs?: boolean;
  care_requirements?: string[];
  preferred_staff?: string[];
  requires_double_staffing?: boolean;
  notes?: string;
}

export interface StudentUpdate {
  first_name?: string;
  last_name?: string;
  class_id?: string;
  grade?: number;
  has_care_needs?: boolean;
  care_requirements?: string[];
  preferred_staff?: string[];
  requires_double_staffing?: boolean;
  notes?: string;
  active?: boolean;
}

export interface CareTime {
  id: string;
  student_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  valid_from: string;
  valid_to: string | null;
  created_at: string;
}

export interface CareTimeCreate {
  weekday: number;
  start_time: string;
  end_time: string;
  valid_from: string;
  valid_to?: string;
}

export interface CareTimeUpdate {
  weekday?: number;
  start_time?: string;
  end_time?: string;
  valid_from?: string;
  valid_to?: string;
}

// ============================================================================
// STAFF TYPES
// ============================================================================

export interface Staff {
  id: string;
  personal_number: string;
  first_name: string;
  last_name: string;
  role: StaffRole;
  grade_group: StaffGradeGroup | null;
  care_certifications: string[];
  schedule_type: ScheduleType;
  employment_start: string;
  active: boolean;
  created_at: string;
}

export interface StaffCreate {
  personal_number: string;
  first_name: string;
  last_name: string;
  role: StaffRole;
  grade_group?: StaffGradeGroup | null;
  care_certifications?: string[];
  schedule_type?: ScheduleType;
}

export interface StaffUpdate {
  first_name?: string;
  last_name?: string;
  role?: StaffRole;
  grade_group?: StaffGradeGroup | null;
  care_certifications?: string[];
  schedule_type?: ScheduleType;
  active?: boolean;
}

export interface Absence {
  id: string;
  staff_id: string;
  absence_date: string;
  start_time: string | null;
  end_time: string | null;
  reason: AbsenceReason;
  reported_at: string;
}

export interface AbsenceCreate {
  absence_date: string;
  start_time?: string;
  end_time?: string;
  reason: AbsenceReason;
}

export interface BulkAbsenceCreate {
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  reason: AbsenceReason;
  include_weekends: boolean;
}

export interface BulkAbsenceResponse {
  created: Absence[];
  count: number;
  skipped_weekends: number;
  skipped_existing: number;
  regenerated_weeks: number[];
}

export interface WorkHour {
  id: string;
  staff_id: string;
  weekday: number;
  week_number: number;
  start_time: string;
  end_time: string;
  lunch_start: string | null;
  lunch_end: string | null;
  created_at: string;
}

export interface WorkHourCreate {
  weekday: number;
  week_number: number;
  start_time: string;
  end_time: string;
  lunch_start?: string;
  lunch_end?: string;
}

export interface WorkHourUpdate {
  weekday?: number;
  week_number?: number;
  start_time?: string;
  end_time?: string;
  lunch_start?: string;
  lunch_end?: string;
}

// ============================================================================
// SCHOOL CLASS TYPES
// ============================================================================

export interface SchoolClass {
  id: string;
  name: string;
  grade_group: GradeGroup;
  primary_teacher_id: string | null;
  academic_year: string;
  active: boolean;
  created_at: string;
  student_count: number;
}

export interface SchoolClassCreate {
  name: string;
  grade_group: GradeGroup;
  primary_teacher_id?: string;
  academic_year: string;
}

export interface SchoolClassUpdate {
  name?: string;
  grade_group?: GradeGroup;
  primary_teacher_id?: string;
  academic_year?: string;
  active?: boolean;
}

// ============================================================================
// SCHEDULE TYPES
// ============================================================================

export interface Schedule {
  id: string;
  week_number: number;
  year: number;
  solver_status: SolverStatus;
  objective_value: number | null;
  solve_time_ms: number | null;
  hard_constraints_met: boolean;
  soft_constraints_score: number | null;
  is_published: boolean;
  created_at: string;
  created_by: string | null;
}

export interface ScheduleDetail extends Schedule {
  assignments: Assignment[];
}

export interface ScheduleCreate {
  week_number: number;
  year: number;
  force_regenerate?: boolean;
  max_solve_time?: number;
  slot_duration_minutes?: 15 | 30 | 60;
}

export interface Assignment {
  id: string;
  schedule_id: string;
  staff_id: string;
  student_id: string | null;
  class_id: string | null;
  weekday: number;
  start_time: string;
  end_time: string;
  assignment_type: AssignmentType;
  is_manual_override: boolean;
  notes: string | null;
  created_at: string;
}

// ============================================================================
// AI SUGGESTION TYPES
// ============================================================================

export interface AISuggestion {
  conflict_id: string;
  root_cause: string;
  actions: SuggestionAction[];
}

export interface SuggestionAction {
  description: string;
  type: 'reassign' | 'substitute' | 'reduce_hours' | 'merge_classes';
  affected_staff: string[];
  affected_students: string[];
  estimated_cost_sek?: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

export interface PredictedProblem {
  problem: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  likelihood: 'high' | 'medium' | 'low';
  impact: string;
  preventive_actions: string[];
  early_warning_signs: string[];
}

// ============================================================================
// ABSENCE IMPACT TYPES
// ============================================================================

export interface StaffSuggestion {
  id: string;
  full_name: string;
  role: StaffRole;
  care_certifications: string[];
  match_score: number;
  available_hours: number;
  matching_certifications: string[];
  reason: string;
}

export interface StudentSummary {
  id: string;
  full_name: string;
  grade: number;
  requires_double_staffing: boolean;
}

export interface AbsenceImpactResponse {
  can_generate: boolean;
  affected_students: StudentSummary[];
  alternative_staff: StaffSuggestion[];
  severity: 'no_impact' | 'minor' | 'major' | 'critical';
  message?: string;
}

export interface TestAbsenceRequest {
  staff_id: string;
  absence_date: string;
  start_time?: string;
  end_time?: string;
  week_number: number;
  year: number;
}

// ============================================================================
// COVERAGE GAP TYPES
// ============================================================================

export interface TimeslotGap {
  weekday: number;
  start_time: string;
  end_time: string;
  required_staff: number;
  available_staff: number;
  affected_students: string[];
  severity: 'critical' | 'warning' | 'ok';
}

export interface CoverageGapsResponse {
  schedule_id: string;
  total_gaps: number;
  critical_gaps: number;
  understaffed_timeslots: TimeslotGap[];
  uncovered_students: StudentSummary[];
  double_staffing_violations: StudentSummary[];
}

// ============================================================================
// RULE-BASED SUGGESTION TYPES
// ============================================================================

export interface RuleActionDetail {
  type: 'reassign' | 'add_assignment' | 'swap' | 'remove';
  assignment_id?: string;
  new_staff_id?: string;
  new_staff_name?: string;
  student_id?: string;
  student_name?: string;
  weekday?: number;
  start_time?: string;
  end_time?: string;
  assignment_type?: string;
  swap_assignment_id?: string;
  side_effects: string[];
  description: string;
}

export interface RuleSuggestion {
  id: string;
  conflict_id: string;
  suggestion_type: 'coverage_gap' | 'double_staffing' | 'workload_balance' | 'continuity';
  priority: number;
  root_cause: string;
  actions: RuleActionDetail[];
}

export interface RuleSuggestionsResponse {
  suggestions: RuleSuggestion[];
  total: number;
}

export interface ApplyActionRequest {
  action: RuleActionDetail;
  suggestion_id: string;
}

export interface ApplyActionResponse {
  success: boolean;
  message: string;
  modified_assignment_id?: string;
  created_assignment_id?: string;
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

export interface AppState {
  currentWeek: number;
  currentYear: number;
  selectedView: 'week' | 'day';
  selectedDate: Date;
}
