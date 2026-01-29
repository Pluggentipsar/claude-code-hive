/**
 * API service for schedule operations
 */

import apiClient from './client';
import type {
  Schedule,
  ScheduleDetail,
  ScheduleCreate,
  AISuggestion,
  PredictedProblem,
  TestAbsenceRequest,
  AbsenceImpactResponse,
  CoverageGapsResponse,
} from '../types';

export const schedulesApi = {
  /**
   * Generate new schedule
   */
  async generate(data: ScheduleCreate): Promise<ScheduleDetail> {
    const response = await apiClient.post<ScheduleDetail>('/schedules/generate', data);
    return response.data;
  },

  /**
   * Get schedule by ID
   */
  async getById(id: string): Promise<ScheduleDetail> {
    const response = await apiClient.get<ScheduleDetail>(`/schedules/${id}`);
    return response.data;
  },

  /**
   * Get schedule by week number
   */
  async getByWeek(year: number, weekNumber: number): Promise<ScheduleDetail> {
    const response = await apiClient.get<ScheduleDetail>(
      `/schedules/week/${year}/${weekNumber}`
    );
    return response.data;
  },

  /**
   * Publish schedule
   */
  async publish(id: string): Promise<Schedule> {
    const response = await apiClient.put<Schedule>(`/schedules/${id}/publish`);
    return response.data;
  },

  /**
   * Get AI suggestions for schedule
   */
  async getAISuggestions(id: string): Promise<AISuggestion[]> {
    const response = await apiClient.post<AISuggestion[]>(
      `/schedules/${id}/ai-suggestions`
    );
    return response.data;
  },

  /**
   * Get AI-generated summary for schedule
   */
  async getSummary(id: string): Promise<string> {
    const response = await apiClient.get<{ summary: string }>(
      `/schedules/${id}/summary`
    );
    return response.data.summary;
  },

  /**
   * Get predicted problems for schedule
   */
  async getPredictedProblems(id: string): Promise<PredictedProblem[]> {
    const response = await apiClient.post<{ predictions: PredictedProblem[] }>(
      `/schedules/${id}/predict-problems`
    );
    return response.data.predictions;
  },

  /**
   * Test impact of an absence without saving it
   */
  async testAbsenceImpact(data: TestAbsenceRequest): Promise<AbsenceImpactResponse> {
    const response = await apiClient.post<AbsenceImpactResponse>(
      '/schedules/test-absence',
      data
    );
    return response.data;
  },

  /**
   * Get coverage gaps for a schedule
   */
  async getCoverageGaps(id: string): Promise<CoverageGapsResponse> {
    const response = await apiClient.get<CoverageGapsResponse>(
      `/schedules/${id}/coverage-gaps`
    );
    return response.data;
  },
};
