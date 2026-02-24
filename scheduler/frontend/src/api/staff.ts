/**
 * API service for staff operations
 */

import apiClient from './client';
import type { Staff, StaffCreate, StaffUpdate, Absence, AbsenceCreate, BulkAbsenceCreate, BulkAbsenceResponse, WorkHour, WorkHourCreate, WorkHourUpdate } from '../types';

export const staffApi = {
  /**
   * Get all staff
   */
  async getAll(): Promise<Staff[]> {
    const response = await apiClient.get<Staff[]>('/staff');
    return response.data;
  },

  /**
   * Get staff by ID
   */
  async getById(id: string): Promise<Staff> {
    const response = await apiClient.get<Staff>(`/staff/${id}`);
    return response.data;
  },

  /**
   * Create new staff member
   */
  async create(data: StaffCreate): Promise<Staff> {
    const response = await apiClient.post<Staff>('/staff', data);
    return response.data;
  },

  /**
   * Update staff member
   */
  async update(id: string, data: StaffUpdate): Promise<Staff> {
    const response = await apiClient.put<Staff>(`/staff/${id}`, data);
    return response.data;
  },

  /**
   * Delete staff member (soft delete)
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/staff/${id}`);
  },

  /**
   * Get absences for staff member
   */
  async getAbsences(staffId: string): Promise<Absence[]> {
    const response = await apiClient.get<Absence[]>(`/staff/${staffId}/absences`);
    return response.data;
  },

  /**
   * Create absence for staff member
   */
  async createAbsence(staffId: string, data: AbsenceCreate): Promise<Absence> {
    const response = await apiClient.post<Absence>(`/staff/${staffId}/absences`, data);
    return response.data;
  },

  /**
   * Create bulk absences for a date range
   */
  async createBulkAbsences(staffId: string, data: BulkAbsenceCreate): Promise<BulkAbsenceResponse> {
    const response = await apiClient.post<BulkAbsenceResponse>(`/staff/${staffId}/absences/bulk`, data);
    return response.data;
  },

  /**
   * Delete absence
   */
  async deleteAbsence(absenceId: string): Promise<void> {
    await apiClient.delete(`/staff/absences/${absenceId}`);
  },

  // ========== Work Hours ==========

  /**
   * Get all work hours for a staff member
   */
  async getWorkHours(staffId: string): Promise<WorkHour[]> {
    const response = await apiClient.get<WorkHour[]>(`/staff/${staffId}/work-hours`);
    return response.data;
  },

  /**
   * Create a work hour for a staff member
   */
  async createWorkHour(staffId: string, data: WorkHourCreate): Promise<WorkHour> {
    const response = await apiClient.post<WorkHour>(`/staff/${staffId}/work-hours`, data);
    return response.data;
  },

  /**
   * Update a work hour
   */
  async updateWorkHour(workHourId: string, data: WorkHourUpdate): Promise<WorkHour> {
    const response = await apiClient.put<WorkHour>(`/staff/work-hours/${workHourId}`, data);
    return response.data;
  },

  /**
   * Delete a work hour
   */
  async deleteWorkHour(workHourId: string): Promise<void> {
    await apiClient.delete(`/staff/work-hours/${workHourId}`);
  },
};
