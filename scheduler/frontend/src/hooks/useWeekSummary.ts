/**
 * Hook that fetches all 5 days of a week and computes summary statistics.
 */

import { useQueries } from '@tanstack/react-query';
import { weekSchedulesApi } from '../api/weekSchedules';
import type { DayData } from '../types/weekSchedule';

export interface DaySummary {
  weekday: number;
  students: number;
  absentCount: number;
  presentCount: number;
  needsFm: number;
  needsEm: number;
  assignedFm: number;
  assignedEm: number;
  unassignedFm: number;
  unassignedEm: number;
  fmCoverage: number;
  emCoverage: number;
  staffCount: number;
  warnings: number;
  errorCount: number;
  warningCount: number;
}

export interface WeekSummaryData {
  days: DaySummary[];
  totalUnassigned: number;
  totalWarnings: number;
  overallFmCoverage: number;
  overallEmCoverage: number;
  totalAbsent: number;
  isLoading: boolean;
}

const WEEKDAYS = [0, 1, 2, 3, 4];

const EMPTY_DAY: DaySummary = {
  weekday: 0,
  students: 0,
  absentCount: 0,
  presentCount: 0,
  needsFm: 0,
  needsEm: 0,
  assignedFm: 0,
  assignedEm: 0,
  unassignedFm: 0,
  unassignedEm: 0,
  fmCoverage: 1,
  emCoverage: 1,
  staffCount: 0,
  warnings: 0,
  errorCount: 0,
  warningCount: 0,
};

function computeDaySummary(weekday: number, data: DayData): DaySummary {
  const absentStaffIds = new Set(
    data.warnings
      .filter(w => w.type === 'absence' && w.staff_id)
      .map(w => w.staff_id!)
  );

  let absentCount = 0;
  let needsFm = 0;
  let needsEm = 0;
  let assignedFm = 0;
  let assignedEm = 0;

  for (const sd of data.student_days) {
    const isAbsent = sd.absent_type !== 'none';
    if (isAbsent) absentCount++;

    const absentFm = sd.absent_type === 'full_day' || sd.absent_type === 'am';
    const absentEm = sd.absent_type === 'full_day' || sd.absent_type === 'pm';

    const sdNeedsFm = !absentFm && sd.arrival_time != null && sd.arrival_time < '08:30';
    const sdNeedsEm = !absentEm && sd.departure_time != null && sd.departure_time > '13:30';

    if (sdNeedsFm) {
      needsFm++;
      if (sd.fm_staff_id && !absentStaffIds.has(sd.fm_staff_id)) assignedFm++;
    }
    if (sdNeedsEm) {
      needsEm++;
      if (sd.em_staff_id && !absentStaffIds.has(sd.em_staff_id)) assignedEm++;
    }
  }

  const students = data.student_days.length;
  const presentCount = students - absentCount;
  const unassignedFm = needsFm - assignedFm;
  const unassignedEm = needsEm - assignedEm;
  const fmCoverage = needsFm > 0 ? assignedFm / needsFm : 1;
  const emCoverage = needsEm > 0 ? assignedEm / needsEm : 1;

  let errorCount = 0;
  let warningCount = 0;
  for (const w of data.warnings) {
    if (w.severity === 'error') errorCount++;
    else if (w.severity === 'warning') warningCount++;
  }

  return {
    weekday,
    students,
    absentCount,
    presentCount,
    needsFm,
    needsEm,
    assignedFm,
    assignedEm,
    unassignedFm,
    unassignedEm,
    fmCoverage,
    emCoverage,
    staffCount: data.staff_shifts.length,
    warnings: data.warnings.length,
    errorCount,
    warningCount,
  };
}

export function useWeekSummary(weekId: string | null): WeekSummaryData {
  const queries = useQueries({
    queries: WEEKDAYS.map((wd) => ({
      queryKey: ['dayData', weekId, wd],
      queryFn: () => weekSchedulesApi.getDayData(weekId!, wd),
      enabled: !!weekId,
      staleTime: 30_000,
    })),
  });

  const isLoading = queries.some(q => q.isLoading);

  const days: DaySummary[] = queries.map((q, idx) => {
    if (!q.data) return { ...EMPTY_DAY, weekday: idx };
    return computeDaySummary(idx, q.data);
  });

  const totalUnassigned = days.reduce((sum, d) => sum + d.unassignedFm + d.unassignedEm, 0);
  const totalWarnings = days.reduce((sum, d) => sum + d.warnings, 0);
  const totalAbsent = days.reduce((sum, d) => sum + d.absentCount, 0);

  const totalNeedsFm = days.reduce((sum, d) => sum + d.needsFm, 0);
  const totalAssignedFm = days.reduce((sum, d) => sum + d.assignedFm, 0);
  const totalNeedsEm = days.reduce((sum, d) => sum + d.needsEm, 0);
  const totalAssignedEm = days.reduce((sum, d) => sum + d.assignedEm, 0);

  const overallFmCoverage = totalNeedsFm > 0 ? totalAssignedFm / totalNeedsFm : 1;
  const overallEmCoverage = totalNeedsEm > 0 ? totalAssignedEm / totalNeedsEm : 1;

  return { days, totalUnassigned, totalWarnings, overallFmCoverage, overallEmCoverage, totalAbsent, isLoading };
}
