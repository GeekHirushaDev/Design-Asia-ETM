import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CheckSquare, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  MapPin,
  Calendar,
  Plus,
  UserPlus,
  Settings
} from 'lucide-react';
import { taskApi, trackingApi, authApi, api } from '../../lib/api';
import { TaskProgressDashboard } from './TaskProgressDashboard';
import { OverdueUpcomingSummary } from './OverdueUpcomingSummary';
import { EmployeeRegistrationForm } from '../Admin/EmployeeRegistrationForm';
import { AdminTimeTrackingDashboard } from '../TimeTracking/AdminTimeTrackingDashboard';
// Removed SettingsSection from overview to avoid showing User Management here

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
  const [activeEmployees, setActiveEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [tasksResponse, attendanceResponse] = await Promise.all([
        taskApi.getTasks(),
        attendanceApi.getTodayAttendance(),
      ]);

      const tasks = tasksResponse.data.tasks;
      const todayAttendance = attendanceResponse.data.attendance || [];

      // Calculate stats
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((t: any) => t.status === 'completed').length;
      const overdueTasks = tasks.filter((t: any) => 
        t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed'
      ).length;
      
      // Get employees who clocked in but not out (currently active)
      const currentlyActive = todayAttendance.filter((att: any) => 
        att.clockIn && !att.clockOut && att.userId
      );
      setActiveEmployees(currentlyActive);
      const activeEmployees = currentlyActive.length;
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
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewMap = () => {
    // Navigate to live map view
    const event = new CustomEvent('navigate-to-map');
    window.dispatchEvent(event);
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
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Overview of your team's performance and activity</p>
        </div>
        <button
          onClick={() => setShowEmployeeForm(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <UserPlus size={16} className="mr-2" />
          Add Employee
        </button>
      </div>


      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
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
              "Currently Active",
              activeEmployees.length.toString(),
              <Users className="text-white" size={24} />,
              "bg-purple-500"
            )}
      </div>

      {/* Recent Tasks and Active Employees */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Recent Tasks with Time Tracking */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Recent Tasks Progress</h2>
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
                        <div className="flex items-center space-x-2 text-xs text-gray-600">
                          <span>Assigned to: {task.assignedTo.map((u: any) => u.name).join(', ')}</span>
                          {task.dueDate && (
                            <span>• Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        task.status === 'completed' ? 'bg-green-100 text-green-800' :
                        task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
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

            {/* Currently Active Employees */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Currently Active Employees</h2>
                <button onClick={handleViewMap} className="text-sm text-blue-600 hover:text-blue-800">
                  View Map
                </button>
              </div>
              
              <div className="space-y-3">
                {activeEmployees.map((employee: any) => (
                  <div key={employee._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-medium">
                          {employee.userId?.name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          {employee.userId?.name || employee.name || 'Unknown User'}
                        </h4>
                        <p className="text-xs text-gray-600">
                          Clocked in: {employee.clockIn?.time ? new Date(employee.clockIn.time).toLocaleTimeString() : 'Unknown'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-green-600 font-medium">Active</span>
                    </div>
                  </div>
                ))}
                
                {activeEmployees.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Clock size={24} className="mx-auto mb-2" />
                    <p className="text-sm">No employees currently clocked in</p>
                  </div>
                )}
              </div>
            </div>

        {/* Location Management removed from overview */}

        {/* Time Tracking Dashboard */}
        <div className="lg:col-span-2">
          <AdminTimeTrackingDashboard />
        </div>

        {/* System Settings removed from overview */}
      </div>

      {/* Employee Registration Modal */}
      {showEmployeeForm && (
        <EmployeeRegistrationForm
          onClose={() => setShowEmployeeForm(false)}
          onSuccess={() => {
            setShowEmployeeForm(false);
            loadDashboardData();
          }}
        />
      )}
    </div>
  );
};