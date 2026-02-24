/**
 * Main App component with routing and auth
 */

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MainLayout } from './components/Layout/MainLayout';
import { SchedulePage, StudentsPage, StaffPage, ClassesPage } from './pages';
import { ImportPage } from './pages/ImportPage';
import { LoginPage } from './pages/LoginPage';
import { useAuthStore } from './stores/authStore';

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

function AuthenticatedApp() {
  const { user, initialized, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (!initialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Laddar...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<SchedulePage />} />
        <Route path="/students" element={<StudentsPage />} />
        <Route path="/staff" element={<StaffPage />} />
        <Route path="/classes" element={<ClassesPage />} />
        <Route path="/import" element={<ImportPage />} />
      </Routes>
    </MainLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthenticatedApp />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
