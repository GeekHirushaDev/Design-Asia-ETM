import React, { useState, useEffect } from 'react';
import { taskApi } from '../../lib/api';
import { format, isToday, isTomorrow, isYesterday, differenceInDays } from 'date-fns';

interface OverdueTask {
  _id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  status: 'not_started' | 'in_progress' | 'paused' | 'completed';
  dueDate: string;
  assignedTo: Array<{ name: string; email: string }>;
  createdBy: { name: string; email: string };
  carryoverInfo?: {
    isCarriedOver: boolean;
    carryoverCount: number;
  };
}

const priorityColors = {
  high: 'bg-red-100 text-red-800 border-red-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-green-100 text-green-800 border-green-200',
};

const statusColors = {
  not_started: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  paused: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
};

export const OverdueUpcomingSummary: React.FC = () => {
  const [tasks, setTasks] = useState<OverdueTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverdueTasks();
  }, []);

  const fetchOverdueTasks = async () => {
    try {
      const response = await taskApi.getUpcomingOverdue();
      setTasks(response.data);
    } catch (error) {
      console.error('Failed to fetch overdue tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDueDate = (dueDate: string) => {
    const date = new Date(dueDate);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isYesterday(date)) return 'Yesterday';
    
    const days = differenceInDays(new Date(), date);
    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} overdue`;
    } else {
      return format(date, 'MMM dd, yyyy');
    }
  };

  const getDueDateColor = (dueDate: string) => {
    const date = new Date(dueDate);
    const days = differenceInDays(new Date(), date);
    
    if (days > 0) return 'text-red-600'; // Overdue
    if (days === 0) return 'text-orange-600'; // Due today
    if (days >= -1) return 'text-yellow-600'; // Due tomorrow
    return 'text-gray-600'; // Future
  };

  const categorizedTasks = {
    overdue: tasks.filter(task => new Date(task.dueDate) < new Date()),
    today: tasks.filter(task => isToday(new Date(task.dueDate))),
    tomorrow: tasks.filter(task => isTomorrow(new Date(task.dueDate))),
    upcoming: tasks.filter(task => {
      const date = new Date(task.dueDate);
      const days = differenceInDays(date, new Date());
      return days > 1 && days <= 7;
    }),
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  const TaskItem: React.FC<{ task: OverdueTask }> = ({ task }) => (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <h4 className="text-sm font-medium text-gray-900 truncate">{task.title}</h4>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[task.priority]}`}>
            {task.priority}
          </span>
          {task.carryoverInfo?.isCarriedOver && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              Carried {task.carryoverInfo.carryoverCount}x
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
          <span className={`${statusColors[task.status]} px-2 py-0.5 rounded-full`}>
            {task.status.replace('_', ' ')}
          </span>
          <span>Assigned to: {task.assignedTo.map(u => u.name).join(', ')}</span>
        </div>
      </div>
      <div className={`text-sm font-medium ${getDueDateColor(task.dueDate)} ml-4`}>
        {formatDueDate(task.dueDate)}
      </div>
    </div>
  );

  const CategorySection: React.FC<{ title: string; tasks: OverdueTask[]; color: string }> = ({ 
    title, tasks, color 
  }) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className={`text-lg font-semibold ${color}`}>{title}</h3>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color.includes('red') ? 'bg-red-100 text-red-800' : color.includes('yellow') ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
          {tasks.length}
        </span>
      </div>
      {tasks.length === 0 ? (
        <p className="text-gray-500 text-sm italic">No tasks in this category</p>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => (
            <TaskItem key={task._id} task={task} />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Task Summary</h2>
        <p className="text-sm text-gray-600 mt-1">
          Overview of overdue and upcoming tasks requiring attention
        </p>
      </div>

      <div className="p-6 space-y-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{categorizedTasks.overdue.length}</div>
            <div className="text-sm text-red-800">Overdue</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{categorizedTasks.today.length}</div>
            <div className="text-sm text-orange-800">Due Today</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{categorizedTasks.tomorrow.length}</div>
            <div className="text-sm text-yellow-800">Due Tomorrow</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{categorizedTasks.upcoming.length}</div>
            <div className="text-sm text-blue-800">This Week</div>
          </div>
        </div>

        {/* Detailed Sections */}
        <CategorySection 
          title="Overdue Tasks" 
          tasks={categorizedTasks.overdue} 
          color="text-red-600" 
        />

        <CategorySection 
          title="Due Today" 
          tasks={categorizedTasks.today} 
          color="text-orange-600" 
        />

        <CategorySection 
          title="Due Tomorrow" 
          tasks={categorizedTasks.tomorrow} 
          color="text-yellow-600" 
        />

        <CategorySection 
          title="Upcoming This Week" 
          tasks={categorizedTasks.upcoming} 
          color="text-blue-600" 
        />
      </div>
    </div>
  );
};