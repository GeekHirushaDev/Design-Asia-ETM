import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  HomeIcon,
  ClipboardListIcon,
  MapPinIcon,
  ChatBubbleLeftIcon,
  ChartBarIcon,
  CogIcon,
  UsersIcon,
  ClockIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { UserRole } from '../../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: UserRole;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, roles: [UserRole.ADMIN, UserRole.EMPLOYEE] },
  { name: 'Tasks', href: '/tasks', icon: ClipboardListIcon, roles: [UserRole.ADMIN, UserRole.EMPLOYEE] },
  { name: 'Location', href: '/location', icon: MapPinIcon, roles: [UserRole.ADMIN, UserRole.EMPLOYEE] },
  { name: 'Chat', href: '/chat', icon: ChatBubbleLeftIcon, roles: [UserRole.ADMIN, UserRole.EMPLOYEE] },
  { name: 'Time Tracking', href: '/time', icon: ClockIcon, roles: [UserRole.ADMIN, UserRole.EMPLOYEE] },
  { name: 'Team', href: '/team', icon: UsersIcon, roles: [UserRole.ADMIN] },
  { name: 'Reports', href: '/reports', icon: ChartBarIcon, roles: [UserRole.ADMIN] },
  { name: 'Settings', href: '/settings', icon: CogIcon, roles: [UserRole.ADMIN, UserRole.EMPLOYEE] },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, userRole }) => {
  const location = useLocation();

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(userRole)
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <img
                className="h-8 w-8"
                src="/logo192.png"
                alt="TaskVision"
              />
            </div>
            <div className="ml-3">
              <h1 className="text-lg font-semibold text-gray-900">TaskVision</h1>
            </div>
          </div>
          
          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {filteredNavigation.map((item) => {
              const isActive = location.pathname === item.href || 
                             (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={onClose}
                  className={`
                    group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200
                    ${isActive
                      ? 'bg-primary-100 text-primary-900 border-r-2 border-primary-600'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                    }
                  `}
                >
                  <item.icon
                    className={`
                      mr-3 h-5 w-5 transition-colors duration-200
                      ${isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600'}
                    `}
                  />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 w-full p-4 border-t border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-primary-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {userRole === UserRole.ADMIN ? 'A' : 'E'}
                </span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">
                {userRole === UserRole.ADMIN ? 'Administrator' : 'Employee'}
              </p>
              <p className="text-xs text-gray-500">v1.0.0</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
