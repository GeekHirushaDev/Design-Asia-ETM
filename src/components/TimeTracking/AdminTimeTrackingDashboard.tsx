import React, { useState, useEffect } from 'react';
import { Clock, TrendingUp, Users, Activity, BarChart3 } from 'lucide-react';
import { userApi, taskApi } from '../../lib/api';

interface AdminTimeTrackingDashboardProps {
  className?: string;
}

interface UserTimeStats {
  user: {
    _id: string;
    name: string;
    email: string;
  };
  totalTime: number;
  efficiency: number;
  tasksCompleted: number;
  activeTask?: {
    _id: string;
    title: string;
    startTime: string;
  };
}

export const AdminTimeTrackingDashboard: React.FC<AdminTimeTrackingDashboardProps> = ({ className = '' }) => {
  const [userStats, setUserStats] = useState<UserTimeStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadTimeStats();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(loadTimeStats, 30000);
    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const loadTimeStats = async () => {
    try {
      setIsLoading(true);
      
      // Get all users
      const usersResponse = await userApi.getUsers();
      const users = usersResponse.data.users.filter((user: any) => user.role === 'employee');
      
      // Get tasks with time stats
      const tasksResponse = await taskApi.getTasks();
      const tasks = tasksResponse.data.tasks;
      
      // Calculate stats for each user
      const stats: UserTimeStats[] = await Promise.all(
        users.map(async (user: any) => {
          const userTasks = tasks.filter((task: any) => 
            task.assignedTo?.some((assignee: any) => assignee._id === user._id)
          );
          
          let totalTime = 0;
          let totalEfficiency = 0;
          let tasksCompleted = 0;
          let activeTask = null;
          
          for (const task of userTasks) {
            if (task.timeStats) {
              totalTime += task.timeStats.totalMinutes || 0;
              totalEfficiency += task.timeStats.efficiency || 0;
              if (task.status === 'completed') {
                tasksCompleted++;
              }
            }
            
            // Check for active task
            if (task.status === 'in_progress') {
              try {
                const activeResponse = await taskApi.getActiveTimeLog(task._id);
                if (activeResponse.data.timeLog) {
                  activeTask = {
                    _id: task._id,
                    title: task.title,
                    startTime: activeResponse.data.timeLog.startTime,
                  };
                }
              } catch (error) {
                // No active time log
              }
            }
          }
          
          const avgEfficiency = userTasks.length > 0 ? totalEfficiency / userTasks.length : 0;
          
          return {
            user,
            totalTime,
            efficiency: Math.round(avgEfficiency),
            tasksCompleted,
            activeTask,
          };
        })
      );
      
      setUserStats(stats);
    } catch (error) {
      console.error('Failed to load time stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    } else {
      return `${mins}m`;
    }
  };

  const getActiveTime = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - start.getTime()) / (1000 * 60));
    return formatTime(diffMinutes);
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 80) return 'text-green-600 bg-green-100';
    if (efficiency >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const totalUsers = userStats.length;
  const activeUsers = userStats.filter(stat => stat.activeTask).length;
  const avgEfficiency = userStats.length > 0 
    ? Math.round(userStats.reduce((sum, stat) => sum + stat.efficiency, 0) / userStats.length)
    : 0;
  const totalTasksCompleted = userStats.reduce((sum, stat) => sum + stat.tasksCompleted, 0);

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 rounded mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Clock className="mr-2" size={20} />
            Time Tracking Dashboard
          </h3>
          <button
            onClick={loadTimeStats}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
          >
            <Activity size={16} className="mr-1" />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Users className="text-blue-600 mr-2" size={20} />
              <div>
                <div className="text-2xl font-bold text-blue-600">{activeUsers}/{totalUsers}</div>
                <div className="text-sm text-blue-800">Active Users</div>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <TrendingUp className="text-green-600 mr-2" size={20} />
              <div>
                <div className="text-2xl font-bold text-green-600">{avgEfficiency}%</div>
                <div className="text-sm text-green-800">Avg Efficiency</div>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center">
              <BarChart3 className="text-purple-600 mr-2" size={20} />
              <div>
                <div className="text-2xl font-bold text-purple-600">{totalTasksCompleted}</div>
                <div className="text-sm text-purple-800">Tasks Completed</div>
              </div>
            </div>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Clock className="text-orange-600 mr-2" size={20} />
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {formatTime(userStats.reduce((sum, stat) => sum + stat.totalTime, 0))}
                </div>
                <div className="text-sm text-orange-800">Total Time</div>
              </div>
            </div>
          </div>
        </div>

        {/* User Stats Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Employee</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Total Time</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Efficiency</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Completed</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Current Activity</th>
              </tr>
            </thead>
            <tbody>
              {userStats.map((stat) => (
                <tr key={stat.user._id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-medium text-gray-900">{stat.user.name}</div>
                      <div className="text-sm text-gray-500">{stat.user.email}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium">{formatTime(stat.totalTime)}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEfficiencyColor(stat.efficiency)}`}>
                      {stat.efficiency}%
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium">{stat.tasksCompleted}</span>
                  </td>
                  <td className="py-3 px-4">
                    {stat.activeTask ? (
                      <div>
                        <div className="text-sm font-medium text-green-600">
                          {stat.activeTask.title}
                        </div>
                        <div className="text-xs text-gray-500">
                          {getActiveTime(stat.activeTask.startTime)}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Inactive</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};