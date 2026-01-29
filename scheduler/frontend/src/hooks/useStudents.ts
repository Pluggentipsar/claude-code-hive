/**
 * Custom hooks for student data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentsApi } from '../api';
import type { StudentCreate, StudentUpdate, CareTimeCreate, CareTimeUpdate } from '../types';

/**
 * Fetch all students
 */
export function useStudents() {
  return useQuery({
    queryKey: ['students'],
    queryFn: () => studentsApi.getAll(),
  });
}

/**
 * Fetch single student
 */
export function useStudent(studentId: string | null) {
  return useQuery({
    queryKey: ['students', studentId],
    queryFn: () => (studentId ? studentsApi.getById(studentId) : null),
    enabled: !!studentId,
  });
}

/**
 * Create student
 */
export function useCreateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: StudentCreate) => studentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
}

/**
 * Update student
 */
export function useUpdateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: StudentUpdate }) =>
      studentsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
}

/**
 * Delete student
 */
export function useDeleteStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => studentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
}

// ============================================================================
// CARE TIME HOOKS
// ============================================================================

/**
 * Fetch care times for a student
 */
export function useCareTimes(studentId: string | null) {
  return useQuery({
    queryKey: ['care-times', studentId],
    queryFn: () => (studentId ? studentsApi.getCareTimes(studentId) : []),
    enabled: !!studentId,
  });
}

/**
 * Create care time
 */
export function useCreateCareTime() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ studentId, data }: { studentId: string; data: CareTimeCreate }) =>
      studentsApi.createCareTime(studentId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['care-times', variables.studentId] });
    },
  });
}

/**
 * Update care time
 */
export function useUpdateCareTime() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data, studentId }: { id: string; data: CareTimeUpdate; studentId: string }) =>
      studentsApi.updateCareTime(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['care-times', variables.studentId] });
    },
  });
}

/**
 * Delete care time
 */
export function useDeleteCareTime() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, studentId }: { id: string; studentId: string }) =>
      studentsApi.deleteCareTime(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['care-times', variables.studentId] });
    },
  });
}
