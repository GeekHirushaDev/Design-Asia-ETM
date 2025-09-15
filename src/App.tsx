import React, { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { LoginForm } from './components/Auth/LoginForm';
import { ChangePasswordInitial } from './components/Auth/ChangePasswordInitial';
import { Navbar } from './components/Layout/Navbar';
import { Modal } from './components/Common/Modal';
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

  // Simple in-app router for login vs forced password change
  const [forcePasswordChange, setForcePasswordChange] = useState<{ show: boolean; } | null>(null);
  const [tempPasswordChoice, setTempPasswordChoice] = useState(false);
  const [showInlineChangePwd, setShowInlineChangePwd] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [newPwd2, setNewPwd2] = useState('');

  useEffect(() => {
    const toChange = () => setForcePasswordChange({ show: true });
    const toLogin = () => setForcePasswordChange(null);
    const showTempChoice = () => setTempPasswordChoice(true);
    window.addEventListener('require-password-change', toChange);
    window.addEventListener('navigate-to-login', toLogin);
    window.addEventListener('show-temp-password-choice', showTempChoice);
    return () => {
      window.removeEventListener('require-password-change', toChange);
      window.removeEventListener('navigate-to-login', toLogin);
      window.removeEventListener('show-temp-password-choice', showTempChoice);
    };
  }, []);

  // Show login or change password if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        {forcePasswordChange?.show ? <ChangePasswordInitial onBackToLogin={() => setForcePasswordChange(null)} /> : <LoginForm />}
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
        return user?.isSuperAdmin ? <AdminDashboard /> : <EmployeeDashboard />;
      case 'tasks':
        return <TaskBoard />;
      case 'teams':
        return <SettingsSection />;
      case 'attendance':
        return <AttendanceTracker />;
      case 'tracking':
      case 'map':
        return <LiveMap />;
      case 'analytics':
        return <TaskProgressDashboard />;
      case 'reports':
        return <WeeklyReport />;
      case 'userManagement':
        return <SettingsSection />;
      case 'settings':
        return (
          <div className="p-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Settings</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Theme</h3>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => document.documentElement.classList.remove('dark')} className="px-3 py-1 bg-gray-100 rounded">Light</button>
                    <button onClick={() => document.documentElement.classList.add('dark')} className="px-3 py-1 bg-gray-800 text-white rounded">Dark</button>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Change Password</h3>
                  <button onClick={() => setShowInlineChangePwd(true)} className="px-4 py-2 bg-blue-600 text-white rounded">Change Password</button>
                </div>
              </div>
            </div>
          </div>
        );
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
        return user?.isSuperAdmin ? <AdminDashboard /> : <EmployeeDashboard />;
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

      <Modal
        open={tempPasswordChoice}
        title="Temporary password detected"
        onClose={() => setTempPasswordChoice(false)}
        size="sm"
        footer={(
          <>
            <button onClick={() => setTempPasswordChoice(false)} className="px-3 py-2 border rounded">Continue Using This Password</button>
            <button onClick={() => { setTempPasswordChoice(false); setShowInlineChangePwd(true); }} className="px-3 py-2 bg-blue-600 text-white rounded">Change Password Now</button>
          </>
        )}
      >
        <p className="text-sm text-gray-700">You are using a temporary password set by an administrator. You can change it now or continue using it.</p>
      </Modal>

      <Modal
        open={showInlineChangePwd}
        title="Change Password"
        onClose={() => { setShowInlineChangePwd(false); setCurrentPwd(''); setNewPwd(''); setNewPwd2(''); }}
        size="sm"
        footer={(
          <>
            <button onClick={() => { setShowInlineChangePwd(false); setCurrentPwd(''); setNewPwd(''); setNewPwd2(''); }} className="px-3 py-2 border rounded">Cancel</button>
            <button onClick={async () => {
              if (!currentPwd || !newPwd) { window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error', message: 'Please fill all fields' } })); return; }
              if (newPwd !== newPwd2) { window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error', message: 'Passwords do not match' } })); return; }
              try {
                const { authApi } = await import('./lib/api');
                await authApi.changePassword({ currentPassword: currentPwd, newPassword: newPwd });
                setShowInlineChangePwd(false); setCurrentPwd(''); setNewPwd(''); setNewPwd2('');
                window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: 'Password changed successfully' } }));
              } catch (e: any) {
                const msg = e?.response?.data?.error || 'Failed to change password';
                window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error', message: msg } }));
              }
            }} className="px-3 py-2 bg-blue-600 text-white rounded">Save</button>
          </>
        )}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Current (temporary) password</label>
            <input type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} className="w-full border px-3 py-2 rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">New password</label>
            <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} className="w-full border px-3 py-2 rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Confirm new password</label>
            <input type="password" value={newPwd2} onChange={(e) => setNewPwd2(e.target.value)} className="w-full border px-3 py-2 rounded" />
          </div>
          <p className="text-xs text-gray-500">Minimum 6 characters. Use a strong, unique password.</p>
        </div>
      </Modal>

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