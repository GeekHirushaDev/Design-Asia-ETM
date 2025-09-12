import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CheckSquare, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  MapPin,
  Calendar
} from 'lucide-react';
import { taskApi, trackingApi, attendanceApi } from '../../lib/api';

interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  activeEmployees: number;
  completionRate: number;
  avgTaskTime: number;
}

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    activeEmployees: 0,
    completionRate: 0,
    avgTaskTime: 0,
  });
  const [recentTasks, setRecentTasks] = useState([]);
  const [currentLocations, setCurrentLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [tasksResponse, locationsResponse] = await Promise.all([
        taskApi.getTasks(),
        trackingApi.getCurrentLocations(),
      ]);

      const tasks = tasksResponse.data.tasks;
      const locations = locationsResponse.data.locations;

      // Calculate stats
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((t: any) => t.status === 'completed').length;
      const overdueTasks = tasks.filter((t: any) => 
        t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed'
      ).length;
      const activeEmployees = locations.length;
      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      setStats({
        totalTasks,
        completedTasks,
        overdueTasks,
        activeEmployees,
        completionRate,
        avgTaskTime: 0, // TODO: Calculate from time logs
      });

      setRecentTasks(tasks.slice(0, 5));
      setCurrentLocations(locations);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    trend?: string;
  }> = ({ title, value, icon, color, trend }) => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
          {trend && (
            <p className="text-xs text-green-600 mt-1 flex items-center">
              <TrendingUp size={12} className="mr-1" />
              {trend}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600">Overview of your team's performance and activity</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Tasks"
          value={stats.totalTasks}
          icon={<CheckSquare size={24} className="text-blue-600" />}
          color="bg-blue-100"
          trend="+12% from last week"
        />
        
        <StatCard
          title="Completion Rate"
          value={`${stats.completionRate.toFixed(1)}%`}
          icon={<TrendingUp size={24} className="text-green-600" />}
          color="bg-green-100"
          trend="+5% from last week"
        />
        
        <StatCard
          title="Overdue Tasks"
          value={stats.overdueTasks}
          icon={<AlertTriangle size={24} className="text-red-600" />}
          color="bg-red-100"
        />
        
        <StatCard
          title="Active Employees"
          value={stats.activeEmployees}
          icon={<Users size={24} className="text-purple-600" />}
          color="bg-purple-100"
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Tasks</h2>
            <button className="text-sm text-blue-600 hover:text-blue-800">
              View All
            </button>
          </div>
          
          <div className="space-y-3">
            {recentTasks.map((task: any) => (
              <div key={task._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {task.title}
                  </h4>
                  <p className="text-xs text-gray-600 mt-1">
                    Assigned to: {task.assignedTo.map((u: any) => u.name).join(', ')}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    task.priority === 'high' 
                      ? 'bg-red-100 text-red-800' 
                      : task.priority === 'medium'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {task.priority}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${
                    task.status === 'completed'
                      ? 'bg-green-500'
                      : task.status === 'in_progress'
                      ? 'bg-blue-500'
                      : 'bg-gray-400'
                  }`}></span>
                </div>
              </div>
            ))}
            
            {recentTasks.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <CheckSquare size={24} className="mx-auto mb-2" />
                <p className="text-sm">No tasks yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Active Employees */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Active Employees</h2>
            <button className="text-sm text-blue-600 hover:text-blue-800">
              View Map
            </button>
          </div>
          
          <div className="space-y-3">
            {currentLocations.map((location: any) => (
              <div key={location.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-medium">
                      {location.user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      {location.user.name}
                    </h4>
                    <p className="text-xs text-gray-600">
                      Last seen: {new Date(location.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {location.batteryLevel && (
                    <span className="text-xs text-gray-600">
                      {location.batteryLevel}%
                    </span>
                  )}
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
              </div>
            ))}
            
            {currentLocations.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <MapPin size={24} className="mx-auto mb-2" />
                <p className="text-sm">No active employees</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};