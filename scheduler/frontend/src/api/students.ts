/**
 * API service for student operations
 */

import apiClient from './client';
import type { Student, StudentCreate, StudentUpdate } from '../types';

export const studentsApi = {
  /**
   * Get all students
   */
  async getAll(): Promise<Student[]> {
    const response = await apiClient.get<Student[]>('/students/');
    return response.data;
  },

  /**
   * Get student by ID
   */
  async getById(id: string): Promise<Student> {
    const response = await apiClient.get<Student>(`/students/${id}/`);
    return response.data;
  },

  /**
   * Create new student
   */
  async create(data: StudentCreate): Promise<Student> {
    const response = await apiClient.post<Student>('/students/', data);
    return response.data;
  },

  /**
   * Update student
   */
  async update(id: string, data: StudentUpdate): Promise<Student> {
    const response = await apiClient.put<Student>(`/students/${id}/`, data);
    return response.data;
  },

  /**
   * Delete student (soft delete)
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/students/${id}/`);
  },
};
