/**
 * Hook that fetches all 5 days of a week and computes summary statistics.
 */

import { useQueries } from '@tanstack/react-query';
import { weekSchedulesApi } from '../api/weekSchedules';
import type { DayData } from '../types/weekSchedule';

export interface DaySummary {
  weekday: number;
  students: number;
  unassignedFm: number;
  unassignedEm: number;
  warnings: number;
  staffCount: number;
}

export interface WeekSummaryData {
  days: DaySummary[];
  totalUnassigned: number;
  totalWarnings: number;
  isLoading: boolean;
}

const WEEKDAYS = [0, 1, 2, 3, 4];

function computeDaySummary(weekday: number, data: DayData): DaySummary {
  let unassignedFm = 0;
  let unassignedEm = 0;

  for (const sd of data.student_days) {
    const needsFm = sd.arrival_time != null && sd.arrival_time < '08:30';
    const needsEm = sd.departure_time != null && sd.departure_time > '13:30';
    if (needsFm && !sd.fm_staff_id) unassignedFm++;
    if (needsEm && !sd.em_staff_id) unassignedEm++;
  }

  return {
    weekday,
    students: data.student_days.length,
    unassignedFm,
    unassignedEm,
    warnings: data.warnings.length,
    staffCount: data.staff_shifts.length,
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
    if (!q.data) return { weekday: idx, students: 0, unassignedFm: 0, unassignedEm: 0, warnings: 0, staffCount: 0 };
    return computeDaySummary(idx, q.data);
  });

  const totalUnassigned = days.reduce((sum, d) => sum + d.unassignedFm + d.unassignedEm, 0);
  const totalWarnings = days.reduce((sum, d) => sum + d.warnings, 0);

  return { days, totalUnassigned, totalWarnings, isLoading };
}
