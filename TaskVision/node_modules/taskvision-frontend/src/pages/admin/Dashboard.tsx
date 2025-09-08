import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';

interface AdminStats {
  totalEmployees: number;
  activeEmployees: number;
  totalProjects: number;
  activeProjects: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  todayAttendance: number;
  attendanceRate: number;
}

interface RecentActivity {
  id: string;
  type: 'task_created' | 'task_completed' | 'user_registered' | 'project_created';
  message: string;
  user: {
    firstName: string;
    lastName: string;
  };
  timestamp: string;
}

interface ProjectProgress {
  id: string;
  name: string;
  progress: number;
  totalTasks: number;
  completedTasks: number;
  dueDate: string;
  status: 'on-track' | 'at-risk' | 'delayed';
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    totalProjects: 0,
    activeProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    todayAttendance: 0,
    attendanceRate: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [projectProgress, setProjectProgress] = useState<ProjectProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch admin dashboard stats
      const [statsResponse, activityResponse, projectsResponse] = await Promise.all([
        api.get('/admin/dashboard/stats'),
        api.get('/admin/dashboard/activities'),
        api.get('/admin/dashboard/projects')
      ]);

      setStats(statsResponse.data);
      setRecentActivity(activityResponse.data || []);
      setProjectProgress(projectsResponse.data || []);
    } catch (error) {
      console.error('Failed to fetch admin dashboard data:', error);
      // Set some mock data for demo
      setStats({
        totalEmployees: 25,
        activeEmployees: 22,
        totalProjects: 8,
        activeProjects: 5,
        totalTasks: 124,
        completedTasks: 89,
        pendingTasks: 28,
        overdueTasks: 7,
        todayAttendance: 20,
        attendanceRate: 91,
      });
      setRecentActivity([
        {
          id: '1',
          type: 'task_completed',
          message: 'completed task "Design landing page"',
          user: { firstName: 'John', lastName: 'Doe' },
          timestamp: '2024-01-15T10:30:00Z'
        },
        {
          id: '2',
          type: 'user_registered',
          message: 'registered as a new employee',
          user: { firstName: 'Jane', lastName: 'Smith' },
          timestamp: '2024-01-15T09:15:00Z'
        },
        {
          id: '3',
          type: 'project_created',
          message: 'created project "Mobile App Redesign"',
          user: { firstName: 'Admin', lastName: 'User' },
          timestamp: '2024-01-15T08:45:00Z'
        }
      ]);
      setProjectProgress([
        {
          id: '1',
          name: 'Website Redesign',
          progress: 75,
          totalTasks: 20,
          completedTasks: 15,
          dueDate: '2024-02-15',
          status: 'on-track'
        },
        {
          id: '2',
          name: 'Mobile App',
          progress: 45,
          totalTasks: 16,
          completedTasks: 7,
          dueDate: '2024-01-30',
          status: 'at-risk'
        },
        {
          id: '3',
          name: 'Documentation Update',
          progress: 90,
          totalTasks: 10,
          completedTasks: 9,
          dueDate: '2024-01-20',
          status: 'on-track'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'task_completed':
        return '✅';
      case 'task_created':
        return '📋';
      case 'user_registered':
        return '👤';
      case 'project_created':
        return '📁';
      default:
        return '📌';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-track':
        return 'bg-green-100 text-green-800';
      case 'at-risk':
        return 'bg-yellow-100 text-yellow-800';
      case 'delayed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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
              Admin Dashboard 🎛️
            </h1>
            <p className="text-gray-600 mt-1">
              Overview of your organization's task management
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
              <span className="text-2xl">👥</span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Employees</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalEmployees}</p>
              <p className="text-xs text-green-600">{stats.activeEmployees} active</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <span className="text-2xl">📁</span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Active Projects</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.activeProjects}</p>
              <p className="text-xs text-gray-500">of {stats.totalProjects} total</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <span className="text-2xl">📋</span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Tasks</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalTasks}</p>
              <p className="text-xs text-green-600">{stats.completedTasks} completed</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <span className="text-2xl">⏰</span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Attendance Rate</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.attendanceRate}%</p>
              <p className="text-xs text-gray-500">{stats.todayAttendance} present today</p>
            </div>
          </div>
        </div>
      </div>

      {/* Task Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Overview</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Completed</span>
              <div className="flex items-center">
                <span className="text-lg font-semibold text-green-600 mr-2">{stats.completedTasks}</span>
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${(stats.completedTasks / stats.totalTasks) * 100}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Pending</span>
              <div className="flex items-center">
                <span className="text-lg font-semibold text-yellow-600 mr-2">{stats.pendingTasks}</span>
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-600 h-2 rounded-full" 
                    style={{ width: `${(stats.pendingTasks / stats.totalTasks) * 100}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Overdue</span>
              <div className="flex items-center">
                <span className="text-lg font-semibold text-red-600 mr-2">{stats.overdueTasks}</span>
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-600 h-2 rounded-full" 
                    style={{ width: `${(stats.overdueTasks / stats.totalTasks) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              to="/admin/users/new"
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-150"
            >
              <span className="text-2xl mb-2">👤➕</span>
              <span className="text-sm font-medium text-gray-900 text-center">Add User</span>
            </Link>
            <Link
              to="/admin/projects/new"
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-150"
            >
              <span className="text-2xl mb-2">📁➕</span>
              <span className="text-sm font-medium text-gray-900 text-center">New Project</span>
            </Link>
            <Link
              to="/admin/reports"
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-150"
            >
              <span className="text-2xl mb-2">📊</span>
              <span className="text-sm font-medium text-gray-900 text-center">Reports</span>
            </Link>
            <Link
              to="/admin/attendance"
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-150"
            >
              <span className="text-2xl mb-2">⏰</span>
              <span className="text-sm font-medium text-gray-900 text-center">Attendance</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Project Progress and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Project Progress</h3>
            <Link
              to="/admin/projects"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all
            </Link>
          </div>
          <div className="space-y-4">
            {projectProgress.length > 0 ? (
              projectProgress.map((project) => (
                <div key={project.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900">{project.name}</h4>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">
                      {project.completedTasks}/{project.totalTasks} tasks
                    </span>
                    <span className="text-sm font-medium text-gray-900">{project.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">Due {formatDate(project.dueDate)}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No projects found</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <Link
              to="/admin/activity"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <span className="text-lg">{getActivityIcon(activity.type)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">
                        {activity.user.firstName} {activity.user.lastName}
                      </span>{' '}
                      {activity.message}
                    </p>
                    <p className="text-xs text-gray-500">{formatTime(activity.timestamp)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
