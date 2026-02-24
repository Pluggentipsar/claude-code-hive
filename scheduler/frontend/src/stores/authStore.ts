/**
 * Auth state management using Zustand
 */

import { create } from 'zustand';
import { authApi, type AuthUser } from '../api/auth';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  initialized: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  token: localStorage.getItem('auth_token'),
  loading: false,
  initialized: false,

  login: async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    localStorage.setItem('auth_token', response.access_token);
    set({
      user: response.user,
      token: response.access_token,
    });
  },

  logout: () => {
    localStorage.removeItem('auth_token');
    set({ user: null, token: null });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      set({ initialized: true, user: null, token: null });
      return;
    }
    try {
      const user = await authApi.me();
      set({ user, token, initialized: true });
    } catch {
      localStorage.removeItem('auth_token');
      set({ user: null, token: null, initialized: true });
    }
  },
}));
