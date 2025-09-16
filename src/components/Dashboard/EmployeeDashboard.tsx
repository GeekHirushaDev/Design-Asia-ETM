import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  Clock, 
  Play, 
  Square, 
  Calendar,
  MapPin,
  TrendingUp,
  Pause,
  CheckCircle
} from 'lucide-react';
import { useTaskStore } from '../../store/taskStore';
import { useAuthStore } from '../../store/authStore';
import { taskApi, attendanceApi } from '../../lib/api';
import { format, isToday } from 'date-fns';
import toast from 'react-hot-toast';

export const EmployeeDashboard: React.FC = () => {
  const { tasks, setTasks, activeTimer, startTimer, stopTimer } = useTaskStore();
  const { user } = useAuthStore();
  const [todaysTasks, setTodaysTasks] = useState([]);
  const [attendance, setAttendance] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadDashboardData();
    getCurrentLocation();
    
    // Update current time every second for timer display
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const loadDashboardData = async () => {
    try {
      const [tasksResponse, attendanceResponse] = await Promise.all([
        taskApi.getTasks(),
        attendanceApi.getTodayAttendance(),
      ]);

      const allTasks = tasksResponse.data.tasks;
      const myTasks = allTasks.filter((task: any) => 
        task.assignedTo.some((assignee: any) => assignee._id === user?._id)
      );

      // Sort tasks by priority (high first) and then by due date
      const sortedTasks = myTasks.sort((a: any, b: any) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority; // High priority first
        }
        
        // If same priority, sort by due date
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        
        return 0;
      });

      setTasks(sortedTasks);
      setTodaysTasks(sortedTasks);
      
      const todayAttendance = attendanceResponse.data.attendance?.find((record: any) => 
        record.userId === user?._id || record.userId?._id === user?._id
      );
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
      const response = await attendanceApi.clockIn(location);
      setAttendance(response.data.attendance);
      toast.success('Clocked in successfully');
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
      const response = await attendanceApi.clockOut(location);
      setAttendance(response.data.attendance);
      toast.success('Clocked out successfully');
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
        
        // Update task status to in_progress
        await taskApi.updateTask(taskId, { status: 'in_progress' });
        
        toast.success('Timer started');
      }
      loadDashboardData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to toggle timer');
    }
  };

  const handlePauseTimer = async (taskId: string) => {
    try {
      await taskApi.pauseTimer(taskId);
      stopTimer();
      
      // Update task status to paused
      await taskApi.updateTask(taskId, { status: 'paused' });
      
      toast.success('Timer paused');
      loadDashboardData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to pause timer');
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      // Stop timer if running
      if (activeTimer?.taskId === taskId) {
        await taskApi.stopTimer(taskId);
        stopTimer();
      }
      
      // Mark task as completed
      await taskApi.updateTask(taskId, { status: 'completed' });
      
      toast.success('Task completed!');
      loadDashboardData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to complete task');
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

  const formatTimer = (startTime: Date) => {
    const diff = currentTime.getTime() - startTime.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTasksByStatus = (status: string) => {
    return todaysTasks.filter((task: any) => task.status === status);
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Task Columns */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Not Started Tasks */}
            <div className="bg-gray-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">Not Started</h3>
                <span className="bg-white px-2 py-1 rounded-full text-xs font-medium text-gray-600">
                  {getTasksByStatus('not_started').length}
                </span>
              </div>
              
              <div className="space-y-3">
                {getTasksByStatus('not_started').map((task: any) => (
                  <div key={task._id} className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium text-gray-900 text-sm">{task.title}</h4>
                          <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2">{task.description}</p>
                        
                        {task.dueDate && (
                          <div className="text-xs text-gray-500 mt-2">
                            Due: {format(new Date(task.dueDate), 'MMM dd')}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => handleTimerToggle(task._id)}
                        className="p-2 bg-green-100 text-green-600 hover:bg-green-200 rounded-lg transition-colors"
                        title="Start Task"
                      >
                        <Play size={14} fill="currentColor" />
                      </button>
                      
                      <span className="text-xs text-gray-500">
                        {task.estimateMinutes ? `${task.estimateMinutes}m` : 'No estimate'}
                      </span>
                    </div>
                  </div>
                ))}
                
                {getTasksByStatus('not_started').length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No pending tasks</p>
                  </div>
                )}
              </div>
            </div>

            {/* In Progress Tasks */}
            <div className="bg-blue-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">In Progress</h3>
                <span className="bg-white px-2 py-1 rounded-full text-xs font-medium text-gray-600">
                  {getTasksByStatus('in_progress').length}
                </span>
              </div>
              
              <div className="space-y-3">
                {getTasksByStatus('in_progress').map((task: any) => (
                  <div key={task._id} className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium text-gray-900 text-sm">{task.title}</h4>
                          <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        </div>
                        
                        {activeTimer?.taskId === task._id && (
                          <div className="text-sm font-mono text-blue-600 mb-2">
                            ⏱️ {formatTimer(activeTimer.startTime)}
                          </div>
                        )}
                        
                        <p className="text-xs text-gray-600 line-clamp-2">{task.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {activeTimer?.taskId === task._id ? (
                          <>
                            <button
                              onClick={() => handlePauseTimer(task._id)}
                              className="p-2 bg-yellow-100 text-yellow-600 hover:bg-yellow-200 rounded-lg transition-colors"
                              title="Pause Task"
                            >
                              <Pause size={14} />
                            </button>
                            <button
                              onClick={() => handleTimerToggle(task._id)}
                              className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors"
                              title="Stop Timer"
                            >
                              <Square size={14} fill="currentColor" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleTimerToggle(task._id)}
                            className="p-2 bg-green-100 text-green-600 hover:bg-green-200 rounded-lg transition-colors"
                            title="Resume Timer"
                          >
                            <Play size={14} fill="currentColor" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleCompleteTask(task._id)}
                          className="p-2 bg-green-100 text-green-600 hover:bg-green-200 rounded-lg transition-colors"
                          title="Complete Task"
                        >
                          <CheckCircle size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {getTasksByStatus('in_progress').length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No active tasks</p>
                  </div>
                )}
              </div>
            </div>

            {/* Completed Tasks */}
            <div className="bg-green-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">Completed</h3>
                <span className="bg-white px-2 py-1 rounded-full text-xs font-medium text-gray-600">
                  {getTasksByStatus('completed').length}
                </span>
              </div>
              
              <div className="space-y-3">
                {getTasksByStatus('completed').map((task: any) => (
                  <div key={task._id} className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium text-gray-900 text-sm">{task.title}</h4>
                          <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2">{task.description}</p>
                        
                        <div className="text-xs text-green-600 mt-2 flex items-center">
                          <CheckCircle size={12} className="mr-1" />
                          Completed
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {getTasksByStatus('completed').length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No completed tasks</p>
                  </div>
                )}
              </div>
            </div>
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
                    ? format(new Date(attendance.clockIn.time), 'HH:mm:ss')
                    : 'Not clocked in'
                  }
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Clock Out:</span>
                <span className="text-sm text-gray-900">
                  {attendance?.clockOut?.time 
                    ? format(new Date(attendance.clockOut.time), 'HH:mm:ss')
                    : 'Not clocked out'
                  }
                </span>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                {!attendance?.clockIn ? (
                  <button
                    onClick={handleClockIn}
                    disabled={!location}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Calendar size={16} className="inline mr-2" />
                    Clock In
                  </button>
                ) : !attendance?.clockOut ? (
                  <button
                    onClick={handleClockOut}
                    disabled={!location}
                    className="w-full bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Calendar size={16} className="inline mr-2" />
                    Clock Out
                  </button>
                ) : (
                  <div className="text-center text-green-600 font-medium py-3">
                    <CheckCircle size={16} className="inline mr-2" />
                    Attendance Complete
                  </div>
                )}
              </div>
              
              {!location && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs text-yellow-700">
                    Please enable location access for attendance.
                  </p>
                  <button
                    onClick={getCurrentLocation}
                    className="text-xs text-blue-600 hover:text-blue-800 underline mt-1"
                  >
                    Enable Location Access
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Active Timer */}
          {activeTimer && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Timer</h3>
              
              <div className="text-center">
                <div className="text-3xl font-mono font-bold text-blue-600 mb-2">
                  {formatTimer(activeTimer.startTime)}
                </div>
                <p className="text-sm text-gray-600">
                  {todaysTasks.find((t: any) => t._id === activeTimer.taskId)?.title || 'Unknown Task'}
                </p>
              </div>
            </div>
          )}

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
          </div>
        </div>
      </div>
    </div>
  );
};