import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useTheme } from './contexts/ThemeContext';

// Layout components
import DashboardLayout from './components/layout/DashboardLayout';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Auth pages
import LoginPage from './pages/auth/LoginPage';

// Dashboard pages (lazy loaded for better performance)
const OverviewPage = React.lazy(() => import('./pages/dashboard/OverviewPage'));
const SystemHealthPage = React.lazy(() => import('./pages/dashboard/SystemHealthPage'));
const ServicesPage = React.lazy(() => import('./pages/dashboard/ServicesPage'));
const NestsPage = React.lazy(() => import('./pages/dashboard/NestsPage'));
const UsersPage = React.lazy(() => import('./pages/dashboard/UsersPage'));
const MonitoringPage = React.lazy(() => import('./pages/dashboard/MonitoringPage'));
const AlertsPage = React.lazy(() => import('./pages/dashboard/AlertsPage'));
const AnalyticsPage = React.lazy(() => import('./pages/dashboard/AnalyticsPage'));
const LogsPage = React.lazy(() => import('./pages/dashboard/LogsPage'));
const SettingsPage = React.lazy(() => import('./pages/dashboard/SettingsPage'));
const DeploymentsPage = React.lazy(() => import('./pages/dashboard/DeploymentsPage'));
const SecurityPage = React.lazy(() => import('./pages/dashboard/SecurityPage'));

// Fallback component for lazy loading
const PageFallback = () => (
  <div className="flex items-center justify-center h-64">
    <LoadingSpinner size="lg" />
  </div>
);

// Protected route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has admin permissions
  if (user.role !== 'admin' && user.role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600 mb-6">
            You don't have permission to access the system dashboard. This area is restricted to administrators only.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            Return to Main Site
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

function App() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();

  // Apply theme class to document
  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Routes>
        {/* Auth routes */}
        <Route 
          path="/login" 
          element={
            user ? <Navigate to="/dashboard" replace /> : <LoginPage />
          } 
        />
        
        {/* Dashboard routes */}
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Suspense fallback={<PageFallback />}>
                  <Routes>
                    <Route index element={<OverviewPage />} />
                    <Route path="system-health" element={<SystemHealthPage />} />
                    <Route path="services" element={<ServicesPage />} />
                    <Route path="nests" element={<NestsPage />} />
                    <Route path="users" element={<UsersPage />} />
                    <Route path="monitoring" element={<MonitoringPage />} />
                    <Route path="alerts" element={<AlertsPage />} />
                    <Route path="analytics" element={<AnalyticsPage />} />
                    <Route path="logs" element={<LogsPage />} />
                    <Route path="deployments" element={<DeploymentsPage />} />
                    <Route path="security" element={<SecurityPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </Suspense>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Default redirect */}
        <Route 
          path="/" 
          element={
            <Navigate to={user ? "/dashboard" : "/login"} replace />
          } 
        />
        
        {/* 404 page */}
        <Route 
          path="*" 
          element={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
              <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h1 className="text-xl font-semibold text-gray-900 mb-2">
                  Page Not Found
                </h1>
                <p className="text-gray-600 mb-6">
                  The page you're looking for doesn't exist or has been moved.
                </p>
                <button
                  onClick={() => window.history.back()}
                  className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Go Back
                </button>
              </div>
            </div>
          } 
        />
      </Routes>
    </div>
  );
}

export default App;