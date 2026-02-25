/**
 * React Query hooks for the week schedule model.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { weekSchedulesApi } from '../api/weekSchedules';
import type {
  WeekScheduleCreate,
  WeekScheduleCopy,
  WeekScheduleUpdate,
  StudentDayCreate,
  StudentDayUpdate,
  DayAssignmentCreate,
  DayAssignmentUpdate,
  StaffShiftCreate,
  StaffShiftUpdate,
} from '../types/weekSchedule';

// ============================================================
// Week schedule
// ============================================================

export function useWeekSchedule(year: number, week: number) {
  return useQuery({
    queryKey: ['weekSchedule', year, week],
    queryFn: () => weekSchedulesApi.getWeek(year, week),
    retry: false,
  });
}

export function useCreateWeek() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: WeekScheduleCreate) => weekSchedulesApi.createWeek(data),
    onSuccess: (ws) => {
      qc.invalidateQueries({ queryKey: ['weekSchedule', ws.year, ws.week_number] });
    },
  });
}

export function useCopyWeek() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ weekId, data }: { weekId: string; data: WeekScheduleCopy }) =>
      weekSchedulesApi.copyWeek(weekId, data),
    onSuccess: (ws) => {
      qc.invalidateQueries({ queryKey: ['weekSchedule', ws.year, ws.week_number] });
    },
  });
}

export function useUpdateWeek() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ weekId, data }: { weekId: string; data: WeekScheduleUpdate }) =>
      weekSchedulesApi.updateWeek(weekId, data),
    onSuccess: (ws) => {
      qc.invalidateQueries({ queryKey: ['weekSchedule', ws.year, ws.week_number] });
    },
  });
}

// ============================================================
// Day data
// ============================================================

export function useDayData(weekId: string | null, weekday: number) {
  return useQuery({
    queryKey: ['dayData', weekId, weekday],
    queryFn: () => weekSchedulesApi.getDayData(weekId!, weekday),
    enabled: !!weekId,
  });
}

// ============================================================
// Student days
// ============================================================

export function useUpdateStudentDay(weekId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sdId, data }: { sdId: string; data: StudentDayUpdate }) =>
      weekSchedulesApi.updateStudentDay(weekId, sdId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dayData', weekId] });
    },
  });
}

export function useCreateStudentDay(weekId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: StudentDayCreate) =>
      weekSchedulesApi.createStudentDay(weekId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dayData', weekId] });
    },
  });
}

export function useDeleteStudentDay(weekId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sdId: string) =>
      weekSchedulesApi.deleteStudentDay(weekId, sdId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dayData', weekId] });
    },
  });
}

// ============================================================
// Day assignments
// ============================================================

export function useCreateDayAssignment(weekId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: DayAssignmentCreate) =>
      weekSchedulesApi.createDayAssignment(weekId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dayData', weekId] });
    },
  });
}

export function useUpdateDayAssignment(weekId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ daId, data }: { daId: string; data: DayAssignmentUpdate }) =>
      weekSchedulesApi.updateDayAssignment(weekId, daId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dayData', weekId] });
    },
  });
}

export function useDeleteDayAssignment(weekId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (daId: string) =>
      weekSchedulesApi.deleteDayAssignment(weekId, daId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dayData', weekId] });
    },
  });
}

// ============================================================
// Staff shifts
// ============================================================

export function useCreateStaffShift(weekId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: StaffShiftCreate) =>
      weekSchedulesApi.createStaffShift(weekId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dayData', weekId] });
    },
  });
}

export function useUpdateStaffShift(weekId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ shiftId, data }: { shiftId: string; data: StaffShiftUpdate }) =>
      weekSchedulesApi.updateStaffShift(weekId, shiftId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dayData', weekId] });
    },
  });
}

export function useDeleteStaffShift(weekId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shiftId: string) =>
      weekSchedulesApi.deleteStaffShift(weekId, shiftId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dayData', weekId] });
    },
  });
}

// ============================================================
// Warnings
// ============================================================

export function useWarnings(weekId: string | null) {
  return useQuery({
    queryKey: ['warnings', weekId],
    queryFn: () => weekSchedulesApi.getWarnings(weekId!),
    enabled: !!weekId,
  });
}

// ============================================================
// Auto-assign
// ============================================================

export function useAutoAssignDay(weekId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (weekday: number) => weekSchedulesApi.autoAssignDay(weekId, weekday),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dayData', weekId] });
    },
  });
}

// ============================================================
// Absence impact
// ============================================================

export function useAbsenceImpact(weekId: string | null, weekday: number, absentStaffIds: string[]) {
  return useQuery({
    queryKey: ['absenceImpact', weekId, weekday, absentStaffIds.sort().join(',')],
    queryFn: () => weekSchedulesApi.getAbsenceImpact(weekId!, weekday, absentStaffIds),
    enabled: !!weekId && absentStaffIds.length > 0,
  });
}

// ============================================================
// Vulnerabilities
// ============================================================

export function useVulnerabilities(weekId: string | null) {
  return useQuery({
    queryKey: ['vulnerabilities', weekId],
    queryFn: () => weekSchedulesApi.getVulnerabilities(weekId!),
    enabled: !!weekId,
  });
}

// ============================================================
// Coverage timeline
// ============================================================

export function useCoverageTimeline(weekId: string | null, weekday: number) {
  return useQuery({
    queryKey: ['coverageTimeline', weekId, weekday],
    queryFn: () => weekSchedulesApi.getCoverageTimeline(weekId!, weekday),
    enabled: !!weekId,
  });
}

// ============================================================
// Class balance
// ============================================================

export function useClassBalance(weekId: string | null, weekday: number) {
  return useQuery({
    queryKey: ['classBalance', weekId, weekday],
    queryFn: () => weekSchedulesApi.getClassBalance(weekId!, weekday),
    enabled: !!weekId,
  });
}

// ============================================================
// Substitute report
// ============================================================

export function useSubstituteReport(weekId: string | null) {
  return useQuery({
    queryKey: ['substituteReport', weekId],
    queryFn: () => weekSchedulesApi.getSubstituteReport(weekId!),
    enabled: !!weekId,
  });
}

// ============================================================
// Auto-suggest assignments
// ============================================================

export function useSuggestAssignments(weekId: string) {
  return useMutation({
    mutationFn: (weekday: number) => weekSchedulesApi.suggestAssignments(weekId, weekday),
  });
}

// ============================================================
// Vulnerability map
// ============================================================

export function useVulnerabilityMap(weekId: string | null) {
  return useQuery({
    queryKey: ['vulnerabilityMap', weekId],
    queryFn: () => weekSchedulesApi.getVulnerabilityMap(weekId!),
    enabled: !!weekId,
  });
}

// ============================================================
// Staff wellbeing
// ============================================================

export function useStaffWellbeing(weekId: string | null) {
  return useQuery({
    queryKey: ['staffWellbeing', weekId],
    queryFn: () => weekSchedulesApi.getStaffWellbeing(weekId!),
    enabled: !!weekId,
  });
}
