import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { useTaskStore } from '../../store/taskStore';
import { NotificationCenter } from '../Notifications/NotificationCenter';
import { Bell, Menu, User, LogOut } from 'lucide-react';
import { socketManager } from '../../lib/socket';

interface NavbarProps {
  onMenuToggle: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuToggle }) => {
  const { user, clearAuth } = useAuthStore();
  const { activeTimer } = useTaskStore();

  const handleLogout = () => {
    socketManager.disconnect();
    clearAuth();
    window.location.href = '/login';
  };

  const formatTimer = (startTime: Date) => {
    const [time, setTime] = React.useState('00:00:00');

    React.useEffect(() => {
      const interval = setInterval(() => {
        const now = new Date();
        const diff = now.getTime() - startTime.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setTime(
          `${hours.toString().padStart(2, '0')}:${minutes
            .toString()
            .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }, 1000);

      return () => clearInterval(interval);
    }, [startTime]);

    return time;
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3 md:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuToggle}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 md:hidden transition-colors"
          >
            <Menu size={20} />
          </button>
          
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold text-gray-900">TaskFlow</h1>
            {activeTimer && (
              <div className="hidden sm:flex items-center space-x-2 bg-green-100 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-700">
                  {formatTimer(activeTimer.startTime)}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <NotificationCenter />

          <div className="flex items-center space-x-3 pl-3 border-l border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};