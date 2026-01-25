/**
 * TypeScript types for Kålgårdens Schemaläggningssystem
 */

// ============================================================================
// TYPE DEFINITIONS (String Literal Unions)
// ============================================================================

export type StaffRole = 'elevassistent' | 'pedagog' | 'fritidspedagog';

export type ScheduleType = 'two_week_rotation' | 'fixed';

export type GradeGroup = 'grades_1_3' | 'grades_4_6';

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

// ============================================================================
// STAFF TYPES
// ============================================================================

export interface Staff {
  id: string;
  personal_number: string;
  first_name: string;
  last_name: string;
  role: StaffRole;
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
  care_certifications?: string[];
  schedule_type?: ScheduleType;
}

export interface StaffUpdate {
  first_name?: string;
  last_name?: string;
  role?: StaffRole;
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
  staff_id: string;
  absence_date: string;
  start_time?: string;
  end_time?: string;
  reason: AbsenceReason;
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
// UI STATE TYPES
// ============================================================================

export interface AppState {
  currentWeek: number;
  currentYear: number;
  selectedView: 'week' | 'day';
  selectedDate: Date;
}
