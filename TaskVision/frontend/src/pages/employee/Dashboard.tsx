import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';

interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  todayHours: number;
  weekHours: number;
}

interface RecentTask {
  id: string;
  title: string;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  project?: {
    name: string;
  };
}

interface UpcomingEvent {
  id: string;
  title: string;
  date: string;
  type: 'meeting' | 'deadline' | 'event';
}

const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    todayHours: 0,
    weekHours: 0,
  });
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch dashboard stats
      const [statsResponse, tasksResponse, eventsResponse] = await Promise.all([
        api.get('/api/dashboard/stats'),
        api.get('/api/tasks?limit=5&sort=-updatedAt'),
        api.get('/api/calendar/upcoming?limit=5')
      ]);

      setStats(statsResponse.data);
      setRecentTasks(tasksResponse.data.tasks || []);
      setUpcomingEvents(eventsResponse.data.events || []);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      // Set some mock data for demo
      setStats({
        totalTasks: 12,
        completedTasks: 8,
        pendingTasks: 3,
        overdueTasks: 1,
        todayHours: 6.5,
        weekHours: 35.5,
      });
      setRecentTasks([
        {
          id: '1',
          title: 'Design landing page mockup',
          status: 'in-progress',
          priority: 'high',
          dueDate: '2024-01-15',
          project: { name: 'Website Redesign' }
        },
        {
          id: '2',
          title: 'Review client feedback',
          status: 'pending',
          priority: 'medium',
          dueDate: '2024-01-16',
          project: { name: 'Mobile App' }
        },
        {
          id: '3',
          title: 'Update user documentation',
          status: 'completed',
          priority: 'low',
          dueDate: '2024-01-14',
          project: { name: 'Documentation' }
        }
      ]);
      setUpcomingEvents([
        {
          id: '1',
          title: 'Team standup meeting',
          date: '2024-01-15T09:00:00Z',
          type: 'meeting'
        },
        {
          id: '2',
          title: 'Project deadline',
          date: '2024-01-20T17:00:00Z',
          type: 'deadline'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {user?.firstName}! 👋
            </h1>
            <p className="text-gray-600 mt-1">
              Here's what's happening with your tasks today.
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Today</p>
            <p className="text-lg font-semibold text-gray-900">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <span className="text-2xl">📋</span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Tasks</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalTasks}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.completedTasks}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <span className="text-2xl">⏳</span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.pendingTasks}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-lg">
              <span className="text-2xl">🚨</span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Overdue</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.overdueTasks}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Time Tracking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Time Tracking</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Today's Hours</span>
              <span className="text-lg font-semibold text-blue-600">{stats.todayHours}h</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">This Week</span>
              <span className="text-lg font-semibold text-green-600">{stats.weekHours}h</span>
            </div>
            <div className="pt-4">
              <Link
                to="/time-tracking"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors duration-150"
              >
                Start Timer
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            <Link
              to="/tasks/new"
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-150"
            >
              <span className="text-2xl mb-2">➕</span>
              <span className="text-sm font-medium text-gray-900">New Task</span>
            </Link>
            <Link
              to="/calendar"
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-150"
            >
              <span className="text-2xl mb-2">📅</span>
              <span className="text-sm font-medium text-gray-900">Calendar</span>
            </Link>
            <Link
              to="/chat"
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-150"
            >
              <span className="text-2xl mb-2">💬</span>
              <span className="text-sm font-medium text-gray-900">Team Chat</span>
            </Link>
            <Link
              to="/profile"
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-150"
            >
              <span className="text-2xl mb-2">👤</span>
              <span className="text-sm font-medium text-gray-900">Profile</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Tasks and Upcoming Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Tasks</h3>
            <Link
              to="/tasks"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {recentTasks.length > 0 ? (
              recentTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">{task.title}</h4>
                    {task.project && (
                      <p className="text-xs text-gray-500">{task.project.name}</p>
                    )}
                    <div className="flex items-center mt-1 space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                      <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority} priority
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Due {formatDate(task.dueDate)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No recent tasks</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Events</h3>
            <Link
              to="/calendar"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View calendar
            </Link>
          </div>
          <div className="space-y-3">
            {upcomingEvents.length > 0 ? (
              upcomingEvents.map((event) => (
                <div key={event.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0 mr-3">
                    <div className={`w-3 h-3 rounded-full ${
                      event.type === 'meeting' ? 'bg-blue-500' :
                      event.type === 'deadline' ? 'bg-red-500' : 'bg-green-500'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">{event.title}</h4>
                    <p className="text-xs text-gray-500 capitalize">{event.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-900">{formatDate(event.date)}</p>
                    <p className="text-xs text-gray-500">{formatTime(event.date)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No upcoming events</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
