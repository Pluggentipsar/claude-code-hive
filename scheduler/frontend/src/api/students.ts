/**
 * API service for student operations
 */

import apiClient from './client';
import type { Student, StudentCreate, StudentUpdate, CareTime, CareTimeCreate, CareTimeUpdate } from '../types';

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

  // ========== Care Times ==========

  /**
   * Get all care times for a student
   */
  async getCareTimes(studentId: string): Promise<CareTime[]> {
    const response = await apiClient.get<CareTime[]>(`/students/${studentId}/care-times/`);
    return response.data;
  },

  /**
   * Create a care time for a student
   */
  async createCareTime(studentId: string, data: CareTimeCreate): Promise<CareTime> {
    const response = await apiClient.post<CareTime>(`/students/${studentId}/care-times/`, data);
    return response.data;
  },

  /**
   * Update a care time
   */
  async updateCareTime(careTimeId: string, data: CareTimeUpdate): Promise<CareTime> {
    const response = await apiClient.put<CareTime>(`/students/care-times/${careTimeId}/`, data);
    return response.data;
  },

  /**
   * Delete a care time
   */
  async deleteCareTime(careTimeId: string): Promise<void> {
    await apiClient.delete(`/students/care-times/${careTimeId}/`);
  },
};
