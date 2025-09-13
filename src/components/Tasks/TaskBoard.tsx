import React, { useState, useEffect } from 'react';
import { useTaskStore } from '../../store/taskStore';
import { useAuthStore } from '../../store/authStore';
import { taskApi, timeTrackingApi } from '../../lib/api';
import { TaskCard } from './TaskCard';
import { TaskForm } from './TaskForm';
import { Plus, Filter, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const statusColumns = [
  { id: 'not_started', title: 'Not Started', color: 'bg-gray-100' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-blue-100' },
  { id: 'paused', title: 'Paused', color: 'bg-yellow-100' },
  { id: 'completed', title: 'Completed', color: 'bg-green-100' },
];

export const TaskBoard: React.FC = () => {
  const { tasks, setTasks, setLoading, isLoading } = useTaskStore();
  const { user } = useAuthStore();
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [taskTimeLogs, setTaskTimeLogs] = useState<{ [taskId: string]: any }>({});

  useEffect(() => {
    loadTasks();
    if (user?.role === 'admin') {
      loadTaskTimeLogs();
    }
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await taskApi.getTasks();
      
      let tasksToShow = response.data.tasks;
      
      // Filter tasks based on user role
      if (user?.role === 'employee') {
        tasksToShow = tasksToShow.filter((task: any) => 
          task.assignedTo.some((assignee: any) => assignee._id === user._id)
        );
      }
      
      // Sort tasks by priority (high first) for employees
      if (user?.role === 'employee') {
        tasksToShow = tasksToShow.sort((a: any, b: any) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
          const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
          return bPriority - aPriority;
        });
      }
      
      setTasks(tasksToShow);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const loadTaskTimeLogs = async () => {
    try {
      const timeLogsMap: { [taskId: string]: any } = {};
      
      // Get time logs for all tasks (admin only)
      for (const task of tasks) {
        try {
          const response = await timeTrackingApi.getTaskAnalysis(task._id);
          timeLogsMap[task._id] = response.data;
        } catch (error) {
          // Ignore errors for individual tasks
        }
      }
      
      setTaskTimeLogs(timeLogsMap);
    } catch (error) {
      console.error('Failed to load task time logs:', error);
    }
  };
  const handleTaskCreated = () => {
    setShowTaskForm(false);
    loadTasks();
    toast.success('Task created successfully');
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = !priorityFilter || task.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const getTasksForStatus = (status: string) => {
    return filteredTasks.filter(task => task.status === status);
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
        <h1 className="text-2xl font-bold text-gray-900">
          {user?.role === 'admin' ? 'Task Management' : 'My Tasks'}
        </h1>
        
        {user?.role === 'admin' && (
          <button
            onClick={() => setShowTaskForm(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} className="mr-2" />
            New Task
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All Priorities</option>
          <option value="high">High Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="low">Low Priority</option>
        </select>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {statusColumns.map((column) => {
          const columnTasks = getTasksForStatus(column.id);
          
          return (
            <div
              key={column.id}
              className={`${column.color} rounded-lg p-4 min-h-96`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">{column.title}</h3>
                <span className="bg-white px-2 py-1 rounded-full text-xs font-medium text-gray-600">
                  {columnTasks.length}
                </span>
              </div>
              
              <div className="space-y-3">
                {columnTasks.map((task) => (
                  <div key={task._id}>
                    <TaskCard
                      task={task}
                      onUpdate={loadTasks}
                    />
                    {/* Admin can see time tracking info */}
                    {user?.role === 'admin' && taskTimeLogs[task._id] && (
                      <div className="mt-2 p-2 bg-white bg-opacity-50 rounded text-xs">
                        <div className="flex justify-between">
                          <span>Time Spent:</span>
                          <span className="font-medium">
                            {taskTimeLogs[task._id].totalActualTime?.toFixed(1) || 0}h
                          </span>
                        </div>
                        {taskTimeLogs[task._id].estimatedTime > 0 && (
                          <div className="flex justify-between">
                            <span>Efficiency:</span>
                            <span className={`font-medium ${
                              taskTimeLogs[task._id].efficiency >= 100 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {taskTimeLogs[task._id].efficiency?.toFixed(1) || 0}%
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                
                {columnTasks.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No tasks</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Form Modal */}
      {showTaskForm && (
        <TaskForm
          onClose={() => setShowTaskForm(false)}
          onSubmit={handleTaskCreated}
        />
      )}
    </div>
  );
};