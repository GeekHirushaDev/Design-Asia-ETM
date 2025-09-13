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
import { taskApi, trackingApi } from '../../lib/api';
import { TaskProgressDashboard } from './TaskProgressDashboard';
import { OverdueUpcomingSummary } from './OverdueUpcomingSummary';
import { WeeklyReport } from '../Reports/WeeklyReport';
import { TimeTracker } from '../TimeTracking/TimeTracker';
import { TimeAnalytics } from '../TimeTracking/TimeAnalytics';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'analytics' | 'timetracking'>('overview');

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

  const renderStatCard = (title: string, value: string | number, icon: React.ReactNode, color: string, trend?: string) => (
    <StatCard title={title} value={value} icon={icon} color={color} trend={trend} />
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

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: Users },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp },
            { id: 'timetracking', label: 'Time Tracking', icon: Clock },
            { id: 'reports', label: 'Weekly Reports', icon: Calendar }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center px-1 py-4 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-5 h-5 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {renderStatCard(
              "Total Tasks",
              stats.totalTasks.toString(),
              <CheckSquare className="text-white" size={24} />,
              "bg-blue-500",
              "12% increase"
            )}
            {renderStatCard(
              "Completed",
              stats.completedTasks.toString(),
              <CheckSquare className="text-white" size={24} />,
              "bg-green-500",
              `${stats.completionRate.toFixed(1)}% rate`
            )}
            {renderStatCard(
              "Overdue",
              stats.overdueTasks.toString(),
              <AlertTriangle className="text-white" size={24} />,
              "bg-red-500"
            )}
            {renderStatCard(
              "Active Employees",
              stats.activeEmployees.toString(),
              <Users className="text-white" size={24} />,
              "bg-purple-500"
            )}
          </div>

          {/* Recent Tasks and Active Employees */}
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
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        task.priority === 'high' ? 'bg-red-500' :
                        task.priority === 'medium' ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}></div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          {task.title}
                        </h4>
                        <p className="text-xs text-gray-600">
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      task.status === 'completed' ? 'bg-green-100 text-green-800' :
                      task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
                
                {recentTasks.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <CheckSquare size={24} className="mx-auto mb-2" />
                    <p className="text-sm">No recent tasks</p>
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
        </>
      )}

      {activeTab === 'analytics' && (
        <>
          {/* Task Progress Dashboard */}
          <div>
            <TaskProgressDashboard />
          </div>

          {/* Overdue and Upcoming Tasks Summary */}
          <div>
            <OverdueUpcomingSummary />
          </div>
        </>
      )}

      {activeTab === 'timetracking' && (
        <>
          <div>
            <TimeTracker tasks={recentTasks} />
          </div>
          <div>
            <TimeAnalytics />
          </div>
        </>
      )}

      {activeTab === 'reports' && (
        <div>
          <WeeklyReport />
        </div>
      )}
    </div>
  );
};