import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';

// Import components and pages
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Auth pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Employee pages
import Dashboard from './pages/employee/Dashboard';
import Tasks from './pages/employee/Tasks';
import TimeTracking from './pages/employee/TimeTracking';
import Calendar from './pages/employee/Calendar';
import Chat from './pages/employee/Chat';
import Profile from './pages/employee/Profile';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import Users from './pages/admin/Users';
import Projects from './pages/admin/Projects';
import AdminTasks from './pages/admin/Tasks';
import Attendance from './pages/admin/Attendance';
import Reports from './pages/admin/Reports';

// Import hooks and stores
import { useAuthStore } from './store/authStore';

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Layout wrapper for protected routes
const ProtectedLayout: React.FC = () => {
  return (
    <ProtectedRoute>
      <Layout>
        <Outlet />
      </Layout>
    </ProtectedRoute>
  );
};

const App: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Public routes */}
            <Route 
              path="/login" 
              element={
                isAuthenticated ? (
                  <Navigate to={user?.role === 'admin' ? '/admin/dashboard' : '/dashboard'} replace />
                ) : (
                  <Login />
                )
              } 
            />
            <Route 
              path="/register" 
              element={
                isAuthenticated ? (
                  <Navigate to={user?.role === 'admin' ? '/admin/dashboard' : '/dashboard'} replace />
                ) : (
                  <Register />
                )
              } 
            />

            {/* Protected routes */}
            <Route path="/" element={<ProtectedLayout />}>
              {/* Redirect root to appropriate dashboard */}
              <Route 
                index 
                element={
                  <Navigate 
                    to={user?.role === 'admin' ? '/admin/dashboard' : '/dashboard'} 
                    replace 
                  />
                } 
              />

              {/* Admin routes */}
              <Route 
                path="admin/dashboard" 
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="admin/users" 
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Users />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="admin/projects" 
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Projects />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="admin/tasks" 
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminTasks />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="admin/attendance" 
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Attendance />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="admin/reports" 
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Reports />
                  </ProtectedRoute>
                } 
              />

              {/* Employee routes */}
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="time-tracking" element={<TimeTracking />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="chat" element={<Chat />} />
              <Route path="profile" element={<Profile />} />

              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>

            {/* Catch all for non-authenticated users */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>

          {/* Global toast notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              className: 'toast',
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                iconTheme: {
                  primary: '#4ade80',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </div>
      </Router>

      {/* React Query DevTools (only in development) */}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
