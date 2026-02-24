/**
 * API client for Kålgårdens Schemaläggningssystem
 */

import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';

// Get API URL from environment variable or default to localhost
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const API_VERSION = '/api/v1';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}${API_VERSION}`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available (for future use)
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle common errors
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data as any;

      switch (status) {
        case 401:
          // Unauthorized - clear token and reload to trigger login
          localStorage.removeItem('auth_token');
          if (window.location.pathname !== '/') {
            window.location.href = '/';
          }
          break;
        case 404:
          console.error('Resource not found');
          break;
        case 500:
          console.error('Server error:', data.detail || 'Internal server error');
          break;
        default:
          console.error(`Error ${status}:`, data.detail || error.message);
      }
    } else if (error.request) {
      // Request was made but no response
      console.error('Network error: No response from server');
    } else {
      // Error in request setup
      console.error('Request error:', error.message);
    }

    return Promise.reject(error);
  }
);

export default apiClient;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract error message from API error
 */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.detail) {
      return error.response.data.detail;
    }
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unknown error occurred';
}

/**
 * Check if API is available
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await axios.get(`${API_BASE_URL}/health`, {
      timeout: 5000,
    });
    return response.data.status === 'healthy';
  } catch {
    return false;
  }
}
