/**
 * Types for the simplified week schedule model.
 */

export type WeekStatus = 'draft' | 'published';
export type AbsentType = 'none' | 'full_day' | 'am' | 'pm';
export type DayAssignmentRole = 'school_support' | 'double_staffing' | 'extra_care';
export type WarningSeverity = 'error' | 'warning' | 'info';
export type WarningType = 'conflict' | 'gap' | 'workload' | 'absence';

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
