/**
 * API client for week schedules — the "Digital Excel" endpoints.
 */

import axios from 'axios';
import apiClient from './client';
import type {
  WeekSchedule,
  WeekScheduleCreate,
  WeekScheduleCopy,
  WeekScheduleUpdate,
  StudentDay,
  StudentDayCreate,
  StudentDayUpdate,
  DayAssignment,
  DayAssignmentCreate,
  DayAssignmentUpdate,
  StaffShift,
  StaffShiftCreate,
  StaffShiftUpdate,
  DayData,
  WarningsResponse,
  AbsenceImpactResult,
  VulnerabilityResponse,
  CoverageSlot,
  ClassBalanceResponse,
  SubstituteReportResponse,
  SuggestAssignmentsResponse,
  VulnerabilityMapResponse,
  StaffWellbeingResponse,
} from '../types/weekSchedule';

export const weekSchedulesApi = {
  // Week schedule — returns null on 404 (no schedule for this week yet)
  getWeek: async (year: number, week: number): Promise<WeekSchedule | null> => {
    try {
      const r = await apiClient.get<WeekSchedule>(`/weeks/${year}/${week}`);
      return r.data;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        return null;
      }
      throw err;
    }
  },

  createWeek: (data: WeekScheduleCreate) =>
    apiClient.post<WeekSchedule>('/weeks/', data).then(r => r.data),

  copyWeek: (weekId: string, data: WeekScheduleCopy) =>
    apiClient.post<WeekSchedule>(`/weeks/${weekId}/copy`, data).then(r => r.data),

  updateWeek: (weekId: string, data: WeekScheduleUpdate) =>
    apiClient.put<WeekSchedule>(`/weeks/${weekId}`, data).then(r => r.data),

  // Day data (aggregated)
  getDayData: (weekId: string, weekday: number) =>
    apiClient.get<DayData>(`/weeks/${weekId}/days/${weekday}`).then(r => r.data),

  // Student days
  createStudentDay: (weekId: string, data: StudentDayCreate) =>
    apiClient.post<StudentDay>(`/weeks/${weekId}/student-days`, data).then(r => r.data),

  updateStudentDay: (weekId: string, sdId: string, data: StudentDayUpdate) =>
    apiClient.put<StudentDay>(`/weeks/${weekId}/student-days/${sdId}`, data).then(r => r.data),

  deleteStudentDay: (weekId: string, sdId: string) =>
    apiClient.delete(`/weeks/${weekId}/student-days/${sdId}`),

  // Day assignments
  createDayAssignment: (weekId: string, data: DayAssignmentCreate) =>
    apiClient.post<DayAssignment>(`/weeks/${weekId}/day-assignments`, data).then(r => r.data),

  updateDayAssignment: (weekId: string, daId: string, data: DayAssignmentUpdate) =>
    apiClient.put<DayAssignment>(`/weeks/${weekId}/day-assignments/${daId}`, data).then(r => r.data),

  deleteDayAssignment: (weekId: string, daId: string) =>
    apiClient.delete(`/weeks/${weekId}/day-assignments/${daId}`),

  // Staff shifts
  createStaffShift: (weekId: string, data: StaffShiftCreate) =>
    apiClient.post<StaffShift>(`/weeks/${weekId}/shifts`, data).then(r => r.data),

  updateStaffShift: (weekId: string, shiftId: string, data: StaffShiftUpdate) =>
    apiClient.put<StaffShift>(`/weeks/${weekId}/shifts/${shiftId}`, data).then(r => r.data),

  deleteStaffShift: (weekId: string, shiftId: string) =>
    apiClient.delete(`/weeks/${weekId}/shifts/${shiftId}`),

  // Warnings
  getWarnings: (weekId: string) =>
    apiClient.get<WarningsResponse>(`/weeks/${weekId}/warnings`).then(r => r.data),

  // Auto-assign (re-run smart matching for a day)
  autoAssignDay: (weekId: string, weekday: number) =>
    apiClient.post<DayData>(`/weeks/${weekId}/days/${weekday}/auto-assign`).then(r => r.data),

  // Absence impact analysis
  getAbsenceImpact: (weekId: string, weekday: number, absentStaffIds: string[]) =>
    apiClient.post<AbsenceImpactResult>(`/weeks/${weekId}/days/${weekday}/absence-impact`, { absent_staff_ids: absentStaffIds }).then(r => r.data),

  // Vulnerability check
  getVulnerabilities: (weekId: string) =>
    apiClient.get<VulnerabilityResponse>(`/weeks/${weekId}/vulnerabilities`).then(r => r.data),

  // Coverage timeline
  getCoverageTimeline: (weekId: string, weekday: number) =>
    apiClient.get<CoverageSlot[]>(`/weeks/${weekId}/days/${weekday}/coverage-timeline`).then(r => r.data),

  // Class balance
  getClassBalance: (weekId: string, weekday: number) =>
    apiClient.get<ClassBalanceResponse>(`/weeks/${weekId}/class-balance?weekday=${weekday}`).then(r => r.data),

  // Substitute report
  getSubstituteReport: (weekId: string) =>
    apiClient.get<SubstituteReportResponse>(`/weeks/${weekId}/substitute-report`).then(r => r.data),

  // Auto-suggest assignments (preview without applying)
  suggestAssignments: (weekId: string, weekday: number) =>
    apiClient.post<SuggestAssignmentsResponse>(`/weeks/${weekId}/days/${weekday}/suggest-assignments`).then(r => r.data),

  // Vulnerability map (student × weekday risk matrix)
  getVulnerabilityMap: (weekId: string) =>
    apiClient.get<VulnerabilityMapResponse>(`/weeks/${weekId}/vulnerability-map`).then(r => r.data),

  // Staff wellbeing analysis
  getStaffWellbeing: (weekId: string) =>
    apiClient.get<StaffWellbeingResponse>(`/weeks/${weekId}/staff-wellbeing`).then(r => r.data),
};
