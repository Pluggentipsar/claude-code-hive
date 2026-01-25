/**
 * Global app state using Zustand
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  // Current week selection
  currentWeek: number;
  currentYear: number;

  // View preferences
  selectedView: 'week' | 'day';
  selectedWeekday: number;

  // UI state
  sidebarOpen: boolean;

  // Actions
  setCurrentWeek: (week: number, year: number) => void;
  setView: (view: 'week' | 'day') => void;
  setSelectedWeekday: (weekday: number) => void;
  toggleSidebar: () => void;
}

// Get current week number
function getCurrentWeek(): { week: number; year: number } {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return { week, year: now.getFullYear() };
}

const { week, year } = getCurrentWeek();

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentWeek: week,
      currentYear: year,
      selectedView: 'week',
      selectedWeekday: 0,
      sidebarOpen: true,

      setCurrentWeek: (week, year) => set({ currentWeek: week, currentYear: year }),
      setView: (view) => set({ selectedView: view }),
      setSelectedWeekday: (weekday) => set({ selectedWeekday: weekday }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    }),
    {
      name: 'scheduler-app-state',
      partialize: (state) => ({
        selectedView: state.selectedView,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
