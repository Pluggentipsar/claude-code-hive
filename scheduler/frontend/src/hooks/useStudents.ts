/**
 * Custom hooks for student data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentsApi } from '../api';
import type { StudentCreate, StudentUpdate } from '../types';

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
