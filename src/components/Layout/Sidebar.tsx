import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Clock, 
  MapPin, 
  Users, 
  BarChart3, 
  Settings,
  Calendar,
  MessageCircle
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeView, 
  onViewChange, 
  isOpen, 
  onClose 
}) => {
  const { user } = useAuthStore();

  const adminMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'attendance', label: 'Attendance', icon: Calendar },
    { id: 'tracking', label: 'Live Map', icon: MapPin },
    { id: 'locations', label: 'Location Management', icon: MapPin },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'reports', label: 'Weekly Reports', icon: BarChart3 },
    { id: 'userManagement', label: 'User Management', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const employeeMenuItems = [
    { id: 'dashboard', label: 'My Tasks', icon: CheckSquare },
    { id: 'timer', label: 'Time Tracker', icon: Clock },
    { id: 'attendance', label: 'Attendance', icon: Calendar },
    { id: 'map', label: 'My Location', icon: MapPin },
    { id: 'chat', label: 'Messages', icon: MessageCircle },
  ];

  const isSuper = user?.isSuperAdmin || user?.role === 'admin';
  const menuItems = isSuper ? adminMenuItems : employeeMenuItems;

  const handleItemClick = (itemId: string) => {
    onViewChange(itemId);
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out z-50
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:z-auto
      `}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <CheckSquare size={18} className="text-white" />
              </div>
              <span className="text-lg font-semibold text-gray-900">TaskFlow</span>
            </div>
          </div>

          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => handleItemClick(item.id)}
                      className={`
                        w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200
                        ${isActive 
                          ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }
                      `}
                    >
                      <Icon size={20} />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-medium">
                  {user?.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};