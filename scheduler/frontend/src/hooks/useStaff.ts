/**
 * Custom hooks for staff data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { staffApi } from '../api';
import type { StaffCreate, StaffUpdate, AbsenceCreate } from '../types';

/**
 * Fetch all staff
 */
export function useStaff() {
  return useQuery({
    queryKey: ['staff'],
    queryFn: () => staffApi.getAll(),
  });
}

/**
 * Fetch single staff member
 */
export function useStaffMember(staffId: string | null) {
  return useQuery({
    queryKey: ['staff', staffId],
    queryFn: () => (staffId ? staffApi.getById(staffId) : null),
    enabled: !!staffId,
  });
}

/**
 * Create staff
 */
export function useCreateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: StaffCreate) => staffApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}

/**
 * Update staff
 */
export function useUpdateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: StaffUpdate }) =>
      staffApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}

/**
 * Delete staff
 */
export function useDeleteStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => staffApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}

/**
 * Fetch absences for staff member
 */
export function useStaffAbsences(staffId: string | null) {
  return useQuery({
    queryKey: ['staff', staffId, 'absences'],
    queryFn: () => (staffId ? staffApi.getAbsences(staffId) : []),
    enabled: !!staffId,
  });
}

/**
 * Create absence
 */
export function useCreateAbsence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ staffId, data }: { staffId: string; data: AbsenceCreate }) =>
      staffApi.createAbsence(staffId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['staff', variables.staffId, 'absences'] });
      queryClient.invalidateQueries({ queryKey: ['schedule'] }); // Refresh schedules
    },
  });
}

/**
 * Delete absence
 */
export function useDeleteAbsence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (absenceId: string) => staffApi.deleteAbsence(absenceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
    },
  });
}
