/**
 * Custom hooks for school class data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { classesApi } from '../api/classes';
import type { SchoolClassCreate, SchoolClassUpdate } from '../types';

/**
 * Fetch all school classes
 */
export function useClasses() {
  return useQuery({
    queryKey: ['classes'],
    queryFn: () => classesApi.getAll(),
  });
}

/**
 * Fetch single school class
 */
export function useClass(classId: string | null) {
  return useQuery({
    queryKey: ['classes', classId],
    queryFn: () => (classId ? classesApi.getById(classId) : null),
    enabled: !!classId,
  });
}

/**
 * Create school class
 */
export function useCreateClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SchoolClassCreate) => classesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
  });
}

/**
 * Update school class
 */
export function useUpdateClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SchoolClassUpdate }) =>
      classesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
  });
}

/**
 * Delete school class
 */
export function useDeleteClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => classesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
  });
}
