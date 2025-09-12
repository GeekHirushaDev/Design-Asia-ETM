import React, { useState, useEffect } from 'react';
import { Bell, X, Check, AlertCircle, CheckCircle, Clock, User } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { socketManager } from '../../lib/socket';

interface Notification {
  _id: string;
  type: 'task_assigned' | 'task_completed' | 'task_overdue' | 'approval_required' | 'attendance_reminder';
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  meta?: {
    taskId?: string;
    userId?: string;
    [key: string]: any;
  };
}

export const NotificationCenter: React.FC = () => {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
    
    const socket = socketManager.getSocket();
    if (socket) {
      socket.on('notification', handleNewNotification);
    }

    // Request notification permission
    requestNotificationPermission();

    return () => {
      if (socket) {
        socket.off('notification', handleNewNotification);
      }
    };
  }, []);

  useEffect(() => {
    const unread = notifications.filter(n => !n.read).length;
    setUnreadCount(unread);
  }, [notifications]);

  const loadNotifications = async () => {
    try {
      // In a real app, you'd fetch from API
      // For now, we'll simulate some notifications
      const mockNotifications: Notification[] = [
        {
          _id: '1',
          type: 'task_assigned',
          title: 'New Task Assigned',
          body: 'You have been assigned to "Setup Development Environment"',
          read: false,
          createdAt: new Date().toISOString(),
          meta: { taskId: 'task1' }
        },
        {
          _id: '2',
          type: 'task_overdue',
          title: 'Task Overdue',
          body: 'Task "Design Database Schema" is overdue',
          read: false,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          meta: { taskId: 'task2' }
        }
      ];
      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const handleNewNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev]);
    
    // Show browser notification if permission granted
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.body,
        icon: '/favicon.ico',
        tag: notification._id,
      });
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n =>
        n._id === notificationId ? { ...n, read: true } : n
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_assigned':
        return <User size={16} className="text-blue-600" />;
      case 'task_completed':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'task_overdue':
        return <AlertCircle size={16} className="text-red-600" />;
      case 'approval_required':
        return <Clock size={16} className="text-yellow-600" />;
      default:
        return <Bell size={16} className="text-gray-600" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors relative"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                <div className="flex items-center space-x-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <div
                      key={notification._id}
                      className={`p-4 hover:bg-gray-50 cursor-pointer ${
                        !notification.read ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => markAsRead(notification._id)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.body}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};