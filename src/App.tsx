import React, { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { LoginForm } from './components/Auth/LoginForm';
import { Navbar } from './components/Layout/Navbar';
import { Sidebar } from './components/Layout/Sidebar';
import { AdminDashboard } from './components/Dashboard/AdminDashboard';
import { EmployeeDashboard } from './components/Dashboard/EmployeeDashboard';
import { TaskBoard } from './components/Tasks/TaskBoard';
import { socketManager } from './lib/socket';

function App() {
  const { isAuthenticated, user, accessToken } = useAuthStore();
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated && accessToken && user) {
      socketManager.connect(accessToken);
    }

    return () => {
      if (!isAuthenticated) {
        socketManager.disconnect();
      }
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
        return <div className="p-6"><h1>Teams Management</h1><p>Coming soon...</p></div>;
      case 'attendance':
        return <div className="p-6"><h1>Attendance</h1><p>Coming soon...</p></div>;
      case 'tracking':
      case 'map':
        return <div className="p-6"><h1>Location Tracking</h1><p>Coming soon...</p></div>;
      case 'reports':
        return <div className="p-6"><h1>Reports</h1><p>Coming soon...</p></div>;
      case 'settings':
        return <div className="p-6"><h1>Settings</h1><p>Coming soon...</p></div>;
      case 'timer':
        return <TaskBoard />;
      case 'chat':
        return <div className="p-6"><h1>Messages</h1><p>Coming soon...</p></div>;
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