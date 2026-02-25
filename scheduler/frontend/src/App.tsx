/**
 * Main App component with routing and auth
 */

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AnimatePresence } from 'framer-motion';
import { MainLayout } from './components/Layout/MainLayout';
import { PageTransition } from './components/Layout/PageTransition';
import { SchedulePage, StaffPage, ClassesPage } from './pages';
import { ImportPage } from './pages/ImportPage';
import { LoginPage } from './pages/LoginPage';
import { useAuthStore } from './stores/authStore';
import { LoadingSpinner } from './components/Common/LoadingSpinner';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><SchedulePage /></PageTransition>} />
        <Route path="/students" element={<Navigate to="/classes" replace />} />
        <Route path="/staff" element={<PageTransition><StaffPage /></PageTransition>} />
        <Route path="/classes" element={<PageTransition><ClassesPage /></PageTransition>} />
        <Route path="/import" element={<PageTransition><ImportPage /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

function AuthenticatedApp() {
  const { user, initialized, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (!initialized) {
    return (
      <div className="min-h-screen bg-surface-50 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 rounded-2xl bg-primary-600 flex items-center justify-center">
          <span className="text-white font-bold text-lg">K</span>
        </div>
        <LoadingSpinner size="md" label="Laddar Kålgården..." />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <MainLayout>
      <AnimatedRoutes />
    </MainLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthenticatedApp />
        <Toaster
          position="bottom-right"
          toastOptions={{
            className: 'font-sans',
            style: {
              borderRadius: '1rem',
              fontSize: '0.875rem',
            },
          }}
          richColors
          closeButton
        />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
