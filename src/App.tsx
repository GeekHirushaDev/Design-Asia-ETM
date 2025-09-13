import React, { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { LoginForm } from './components/Auth/LoginForm';
import { Navbar } from './components/Layout/Navbar';
import { Sidebar } from './components/Layout/Sidebar';
import { AdminDashboard } from './components/Dashboard/AdminDashboard';
import { EmployeeDashboard } from './components/Dashboard/EmployeeDashboard';
import { TaskBoard } from './components/Tasks/TaskBoard';
import { LiveMap } from './components/Maps/LiveMap';
import { ChatInterface } from './components/Chat/ChatInterface';
import { AttendanceTracker } from './components/Attendance/AttendanceTracker';
import { ReportGenerator } from './components/Reports/ReportGenerator';
import { WeeklyReport } from './components/Reports/WeeklyReport';
import { TaskProgressDashboard } from './components/Dashboard/TaskProgressDashboard';
import TeamManagement from './components/Admin/TeamManagement';
import { SettingsSection } from './components/Admin/SettingsSection';
import { socketManager } from './lib/socket';

function App() {
  const { isAuthenticated, user, accessToken } = useAuthStore();
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated && accessToken && user) {
      socketManager.connect(accessToken);
    }

    // Listen for navigation events
    const handleNavigateToMap = () => {
      setActiveView('tracking');
    };

    window.addEventListener('navigate-to-map', handleNavigateToMap);
    return () => {
      if (!isAuthenticated) {
        socketManager.disconnect();
      }
      window.removeEventListener('navigate-to-map', handleNavigateToMap);
    };
  }, [isAuthenticated, accessToken, user]);

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <LoginForm />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </>
    );
  }

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return user?.role === 'admin' ? <AdminDashboard /> : <EmployeeDashboard />;
      case 'tasks':
        return <TaskBoard />;
      case 'teams':
        return <TeamManagement />;
      case 'attendance':
        return <AttendanceTracker />;
      case 'tracking':
      case 'map':
        return <LiveMap />;
      case 'analytics':
        return <TaskProgressDashboard />;
      case 'reports':
        return <WeeklyReport />;
      case 'settings':
        return <SettingsSection />;
      case 'timer':
        return <TaskBoard />;
      case 'chat':
        return (
          <div className="p-6">
            <ChatInterface 
              roomId="general" 
              roomType="dm" 
              roomName="General Chat" 
            />
          </div>
        );
      default:
        return user?.role === 'admin' ? <AdminDashboard /> : <EmployeeDashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 overflow-auto">
          {renderContent()}
        </main>
      </div>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </div>
  );
}

export default App;