/**
 * API service for school class operations
 */

import apiClient from './client';
import type { SchoolClass, SchoolClassCreate, SchoolClassUpdate } from '../types';

export const classesApi = {
  /**
   * Get all school classes
   */
  async getAll(): Promise<SchoolClass[]> {
    const response = await apiClient.get<SchoolClass[]>('/classes/');
    return response.data;
  },

  /**
   * Get school class by ID
   */
  async getById(id: string): Promise<SchoolClass> {
    const response = await apiClient.get<SchoolClass>(`/classes/${id}/`);
    return response.data;
  },

  /**
   * Create new school class
   */
  async create(data: SchoolClassCreate): Promise<SchoolClass> {
    const response = await apiClient.post<SchoolClass>('/classes/', data);
    return response.data;
  },

  /**
   * Update school class
   */
  async update(id: string, data: SchoolClassUpdate): Promise<SchoolClass> {
    const response = await apiClient.put<SchoolClass>(`/classes/${id}/`, data);
    return response.data;
  },

  /**
   * Delete school class (soft delete)
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/classes/${id}/`);
  },
};
