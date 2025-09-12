import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  Clock, 
  Play, 
  Square, 
  Calendar,
  MapPin,
  TrendingUp
} from 'lucide-react';
import { useTaskStore } from '../../store/taskStore';
import { useAuthStore } from '../../store/authStore';
import { taskApi, attendanceApi } from '../../lib/api';
import toast from 'react-hot-toast';

export const EmployeeDashboard: React.FC = () => {
  const { tasks, setTasks, activeTimer, startTimer, stopTimer } = useTaskStore();
  const { user } = useAuthStore();
  const [todaysTasks, setTodaysTasks] = useState([]);
  const [attendance, setAttendance] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    loadDashboardData();
    getCurrentLocation();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [tasksResponse, attendanceResponse] = await Promise.all([
        taskApi.getTasks(),
        attendanceApi.getAttendance({
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
        }),
      ]);

      const allTasks = tasksResponse.data.tasks;
      const myTasks = allTasks.filter((task: any) => 
        task.assignedTo.some((assignee: any) => assignee._id === user?._id)
      );

      setTasks(myTasks);
      setTodaysTasks(myTasks.filter((task: any) => task.status !== 'completed'));
      
      const todayAttendance = attendanceResponse.data.attendance[0];
      setAttendance(todayAttendance);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Failed to get location:', error);
        }
      );
    }
  };

  const handleClockIn = async () => {
    if (!location) {
      toast.error('Location access required for attendance');
      return;
    }

    try {
      await attendanceApi.clockIn(location);
      toast.success('Clocked in successfully');
      loadDashboardData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to clock in');
    }
  };

  const handleClockOut = async () => {
    if (!location) {
      toast.error('Location access required for attendance');
      return;
    }

    try {
      await attendanceApi.clockOut(location);
      toast.success('Clocked out successfully');
      loadDashboardData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to clock out');
    }
  };

  const handleTimerToggle = async (taskId: string) => {
    try {
      if (activeTimer?.taskId === taskId) {
        await taskApi.stopTimer(taskId);
        stopTimer();
        toast.success('Timer stopped');
      } else {
        if (activeTimer) {
          toast.error('Please stop the current timer first');
          return;
        }
        await taskApi.startTimer(taskId);
        startTimer(taskId);
        toast.success('Timer started');
      }
      loadDashboardData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to toggle timer');
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const completedToday = tasks.filter((task: any) => 
    task.status === 'completed' && 
    new Date(task.updatedAt).toDateString() === new Date().toDateString()
  ).length;

  const highPriorityTasks = todaysTasks.filter((task: any) => task.priority === 'high').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name}!</h1>
        <p className="text-gray-600">Here's what you need to focus on today</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tasks Today</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{todaysTasks.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <CheckSquare size={24} className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{completedToday}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp size={24} className="text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">High Priority</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{highPriorityTasks}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <Clock size={24} className="text-red-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Tasks */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Today's Tasks</h2>
            {activeTimer && (
              <div className="flex items-center space-x-2 bg-green-100 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-700">Timer Running</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {todaysTasks.map((task: any) => (
              <div key={task._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-medium text-gray-900">{task.title}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{task.description}</p>
                    
                    {task.location && (
                      <div className="flex items-center mt-2 text-xs text-gray-500">
                        <MapPin size={12} className="mr-1" />
                        <span>Location required</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleTimerToggle(task._id)}
                      className={`p-2 rounded-lg transition-colors ${
                        activeTimer?.taskId === task._id
                          ? 'bg-red-100 text-red-600 hover:bg-red-200'
                          : 'bg-green-100 text-green-600 hover:bg-green-200'
                      }`}
                    >
                      {activeTimer?.taskId === task._id ? (
                        <Square size={16} fill="currentColor" />
                      ) : (
                        <Play size={16} fill="currentColor" />
                      )}
                    </button>
                    
                    <span className={`px-3 py-1 text-xs rounded-full ${getTaskStatusColor(task.status)}`}>
                      {task.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                </div>
                
                {task.dueDate && (
                  <div className="text-xs text-gray-500">
                    Due: {new Date(task.dueDate).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}

            {todaysTasks.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <CheckSquare size={32} className="mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">All caught up!</p>
                <p className="text-sm">No pending tasks for today</p>
              </div>
            )}
          </div>
        </div>

        {/* Attendance & Quick Actions */}
        <div className="space-y-6">
          {/* Attendance */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Attendance</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Clock In:</span>
                <span className="text-sm text-gray-900">
                  {attendance?.clockIn?.time 
                    ? new Date(attendance.clockIn.time).toLocaleTimeString()
                    : 'Not clocked in'
                  }
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Clock Out:</span>
                <span className="text-sm text-gray-900">
                  {attendance?.clockOut?.time 
                    ? new Date(attendance.clockOut.time).toLocaleTimeString()
                    : 'Not clocked out'
                  }
                </span>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                {!attendance?.clockIn ? (
                  <button
                    onClick={handleClockIn}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
                  >
                    <Calendar size={16} className="inline mr-2" />
                    Clock In
                  </button>
                ) : !attendance?.clockOut ? (
                  <button
                    onClick={handleClockOut}
                    className="w-full bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors"
                  >
                    <Calendar size={16} className="inline mr-2" />
                    Clock Out
                  </button>
                ) : (
                  <div className="text-center text-sm text-green-600 font-medium">
                    ✓ Attendance Complete
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Location Status */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Location Status</h3>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MapPin size={16} className="text-gray-600" />
                <span className="text-sm text-gray-600">Location Access:</span>
              </div>
              <div className={`flex items-center space-x-1 ${location ? 'text-green-600' : 'text-red-600'}`}>
                <div className={`w-2 h-2 rounded-full ${location ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-xs font-medium">{location ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
            
            {!location && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-700">
                  Please enable location access for attendance and location-based tasks.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};