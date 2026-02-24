/**
 * API service for authentication
 */

import apiClient from './client';

export interface AuthUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'teacher' | 'staff';
  active: boolean;
  created_at: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export interface RegisterFirstRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export const authApi = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  async registerFirst(data: RegisterFirstRequest): Promise<AuthUser> {
    const response = await apiClient.post<AuthUser>('/auth/register-first', {
      ...data,
      role: 'admin',
    });
    return response.data;
  },

  async me(): Promise<AuthUser> {
    const response = await apiClient.get<AuthUser>('/auth/me');
    return response.data;
  },
};
