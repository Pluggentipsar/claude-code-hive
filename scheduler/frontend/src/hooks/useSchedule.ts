/**
 * Custom hook for schedule data fetching
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schedulesApi } from '../api';
import type { ScheduleCreate } from '../types';

/**
 * Fetch schedule by week
 */
export function useScheduleByWeek(year: number, weekNumber: number) {
  return useQuery({
    queryKey: ['schedule', year, weekNumber],
    queryFn: () => schedulesApi.getByWeek(year, weekNumber),
    retry: false, // Don't retry if schedule doesn't exist
  });
}

/**
 * Fetch schedule by ID
 */
export function useSchedule(scheduleId: string | null) {
  return useQuery({
    queryKey: ['schedule', scheduleId],
    queryFn: () => (scheduleId ? schedulesApi.getById(scheduleId) : null),
    enabled: !!scheduleId,
  });
}

/**
 * Generate new schedule
 */
export function useGenerateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ScheduleCreate) => schedulesApi.generate(data),
    onSuccess: (newSchedule) => {
      // Invalidate schedule queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.setQueryData(
        ['schedule', newSchedule.year, newSchedule.week_number],
        newSchedule
      );
    },
  });
}

/**
 * Publish schedule
 */
export function usePublishSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (scheduleId: string) => schedulesApi.publish(scheduleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
    },
  });
}

/**
 * Get AI suggestions
 */
export function useAISuggestions(scheduleId: string | null) {
  return useQuery({
    queryKey: ['ai-suggestions', scheduleId],
    queryFn: () => (scheduleId ? schedulesApi.getAISuggestions(scheduleId) : null),
    enabled: !!scheduleId,
  });
}
