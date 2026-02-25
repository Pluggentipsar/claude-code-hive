/**
 * Types for the simplified week schedule model.
 */

export type WeekStatus = 'draft' | 'published';
export type AbsentType = 'none' | 'full_day' | 'am' | 'pm';
export type DayAssignmentRole = 'school_support' | 'double_staffing' | 'extra_care';
export type WarningSeverity = 'error' | 'warning' | 'info';
export type WarningType = 'conflict' | 'gap' | 'workload' | 'absence' | 'vulnerability';

export interface WeekSchedule {
  id: string;
  year: number;
  week_number: number;
  status: WeekStatus;
  notes: string | null;
  copied_from_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeekScheduleCreate {
  year: number;
  week_number: number;
  notes?: string;
}

export interface WeekScheduleCopy {
  target_year: number;
  target_week: number;
}

export interface WeekScheduleUpdate {
  status?: WeekStatus;
  notes?: string;
}

export interface StudentDay {
  id: string;
  week_schedule_id: string;
  student_id: string;
  weekday: number;
  arrival_time: string | null;
  departure_time: string | null;
  fm_staff_id: string | null;
  em_staff_id: string | null;
  notes: string | null;
  absent_type: AbsentType;
  student_name: string | null;
  class_name: string | null;
  class_id: string | null;
  grade: number | null;
  has_care_needs: boolean | null;
  fm_staff_name: string | null;
  em_staff_name: string | null;
}

export interface StudentDayCreate {
  student_id: string;
  weekday: number;
  arrival_time?: string;
  departure_time?: string;
  fm_staff_id?: string | null;
  em_staff_id?: string | null;
  notes?: string;
}

export interface StudentDayUpdate {
  arrival_time?: string;
  departure_time?: string;
  fm_staff_id?: string | null;
  em_staff_id?: string | null;
  notes?: string;
  absent_type?: AbsentType;
}

export interface DayAssignment {
  id: string;
  week_schedule_id: string;
  student_id: string;
  staff_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  role: DayAssignmentRole;
  notes: string | null;
  student_name: string | null;
  staff_name: string | null;
}

export interface DayAssignmentCreate {
  student_id: string;
  staff_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  role: DayAssignmentRole;
  notes?: string;
}

export interface DayAssignmentUpdate {
  staff_id?: string;
  start_time?: string;
  end_time?: string;
  role?: DayAssignmentRole;
  notes?: string;
}

export interface StaffShift {
  id: string;
  week_schedule_id: string;
  staff_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  break_minutes: number;
  notes: string | null;
  staff_name: string | null;
  class_name: string | null;
}

export interface StaffShiftCreate {
  staff_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  break_minutes?: number;
  notes?: string;
}

export interface StaffShiftUpdate {
  start_time?: string;
  end_time?: string;
  break_minutes?: number;
  notes?: string;
}

export interface ScheduleWarning {
  type: WarningType;
  severity: WarningSeverity;
  message: string;
  staff_id: string | null;
  student_id: string | null;
  weekday: number;
  time: string | null;
}

export interface WarningsResponse {
  warnings: ScheduleWarning[];
  summary: {
    conflicts: number;
    gaps: number;
    workload_issues: number;
    absence_issues: number;
  };
}

export interface DayData {
  weekday: number;
  student_days: StudentDay[];
  staff_shifts: StaffShift[];
  day_assignments: DayAssignment[];
  warnings: ScheduleWarning[];
}

// === Absence Impact ===

export interface AffectedStudent {
  student_id: string;
  student_name: string;
  grade: number;
  class_name: string | null;
  severity: 'critical' | 'high' | 'medium';
  care_requirements: string[];
  missing_period: 'fm' | 'em' | 'both';
  absent_staff_name: string;
}

export interface ReplacementCandidate {
  staff_id: string;
  staff_name: string;
  score: number;
  reason: string;
  care_certifications: string[];
}

export interface SuggestedReassignment {
  student_id: string;
  student_name: string;
  period: 'fm' | 'em';
  suggested_staff_id: string;
  suggested_staff_name: string;
  score: number;
}

export interface AbsenceImpactResult {
  absent_count: number;
  affected_students: AffectedStudent[];
  replacement_candidates: ReplacementCandidate[];
  suggested_reassignments: SuggestedReassignment[];
}

// === Vulnerability ===

export interface VulnerabilityItem {
  student_id: string;
  student_name: string;
  care_requirement: string;
  qualified_staff: { staff_id: string; staff_name: string }[];
  severity: 'critical' | 'warning';
  message: string;
}

export interface VulnerabilityResponse {
  vulnerabilities: VulnerabilityItem[];
  critical_count: number;
  warning_count: number;
}

// === Coverage Timeline ===

export interface CoverageSlot {
  time_start: string;
  time_end: string;
  students_present: number;
  staff_present: number;
  surplus: number;
  status: 'surplus' | 'balanced' | 'deficit';
}

// === Class Balance ===

export interface ClassBalanceItem {
  class_id: string;
  class_name: string;
  grade_group: string;
  student_count: number;
  staff_count: number;
  ratio: number;
  surplus: number;
  status: 'surplus' | 'balanced' | 'deficit';
}

export interface ClassBalanceResponse {
  weekday: number;
  low_grades: ClassBalanceItem[];
  high_grades: ClassBalanceItem[];
  rebalancing_suggestions: RebalancingSuggestion[];
}

export interface RebalancingSuggestion {
  staff_id: string;
  staff_name: string;
  from_class: string;
  from_class_name: string;
  to_class: string;
  to_class_name: string;
  reason: string;
}

// === Substitute Report ===

export interface SubstituteDayReport {
  weekday: number;
  day_name: string;
  absent_staff: { staff_id: string; staff_name: string; role: string }[];
  deficit_hours: number;
  uncovered_needs: { description: string; grade_group: string; certification_needed: string[] }[];
}

export interface SubstituteReportResponse {
  week_year: number;
  week_number: number;
  days: SubstituteDayReport[];
  total_deficit_hours: number;
  total_absent_staff: number;
}

// === Auto-Suggest ===

export interface AssignmentSuggestion {
  student_day_id: string;
  student_id: string;
  student_name: string;
  period: 'fm' | 'em';
  current_staff_id: string | null;
  current_staff_name: string | null;
  suggested_staff_id: string;
  suggested_staff_name: string;
  score: number;
  reason: string;
}

export interface SuggestAssignmentsResponse {
  suggestions: AssignmentSuggestion[];
  total: number;
}

// === Vulnerability Map ===

export type VulnerabilityRisk = 'green' | 'yellow' | 'red' | 'black' | 'none';

export interface VulnerabilityDayCell {
  weekday: number;
  risk: VulnerabilityRisk;
  detail: string;
}

export interface VulnerabilityMapStudent {
  student_id: string;
  student_name: string;
  grade: number | null;
  class_name: string | null;
  care_requirements: string[];
  days: VulnerabilityDayCell[];
}

export interface VulnerabilityMapResponse {
  students: VulnerabilityMapStudent[];
  summary: {
    black: number;
    red: number;
    yellow: number;
    green: number;
  };
}

// === Staff Wellbeing ===

export type WellbeingAlertType = 'high_daily_load' | 'high_week_load' | 'consecutive_care' | 'sole_handler';

export interface WellbeingAlert {
  type: WellbeingAlertType;
  severity: 'warning' | 'critical';
  message: string;
  weekday: number | null;
  value: number;
}

export interface StaffWellbeingItem {
  staff_id: string;
  staff_name: string;
  alerts: WellbeingAlert[];
  alert_count: number;
  has_critical: boolean;
}

export interface StaffWellbeingResponse {
  staff_alerts: StaffWellbeingItem[];
  total_alerts: number;
  staff_with_alerts: number;
}
