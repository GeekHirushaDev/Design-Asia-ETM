import React from 'react';
import { Clock, MapPin, User, Play, Square, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { taskApi } from '../../lib/api';
import { useTaskStore } from '../../store/taskStore';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface TaskCardProps {
  task: any;
  onUpdate: () => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onUpdate }) => {
  const { activeTimer, startTimer, stopTimer, updateTask } = useTaskStore();
  const { user } = useAuthStore();
  const [isUpdating, setIsUpdating] = useState(false);

  const priorityColors = {
    high: 'bg-red-100 text-red-800 border-red-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-green-100 text-green-800 border-green-200',
  };

  const statusColors = {
    not_started: 'text-gray-600',
    in_progress: 'text-blue-600',
    paused: 'text-yellow-600',
    completed: 'text-green-600',
  };

  const canStartTimer = user?.role === 'employee' && 
                       task.assignedTo.some((assignee: any) => assignee._id === user._id) &&
                       task.status !== 'completed';

  const handleStatusChange = async (newStatus: string) => {
    try {
      setIsUpdating(true);
      await taskApi.updateTask(task._id, { status: newStatus });
      updateTask(task._id, { status: newStatus });
      onUpdate();
      toast.success('Task status updated');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update task');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTimerToggle = async () => {
    try {
      if (activeTimer?.taskId === task._id) {
        await taskApi.stopTimer(task._id);
        stopTimer();
        toast.success('Timer stopped');
        onUpdate();
      } else {
        if (activeTimer) {
          toast.error('Please stop the current timer first');
          return;
        }
        await taskApi.startTimer(task._id);
        startTimer(task._id);
        toast.success('Timer started');
        onUpdate();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to toggle timer');
    }
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 mb-1 line-clamp-2">{task.title}</h4>
          <p className="text-sm text-gray-600 line-clamp-2">{task.description}</p>
        </div>
        
        <div className="flex flex-col items-end space-y-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${priorityColors[task.priority]}`}>
            {task.priority}
          </span>
          
          {isOverdue && (
            <AlertCircle size={16} className="text-red-500" />
          )}
        </div>
      </div>

      {/* Task Details */}
      <div className="space-y-2 mb-4">
        {task.dueDate && (
          <div className="flex items-center text-xs text-gray-500">
            <Clock size={12} className="mr-1" />
            <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
              Due: {format(new Date(task.dueDate), 'MMM dd, yyyy')}
            </span>
          </div>
        )}
        
        {task.location && (
          <div className="flex items-center text-xs text-gray-500">
            <MapPin size={12} className="mr-1" />
            <span>{task.location.address || 'Location Required'}</span>
          </div>
        )}
        
        <div className="flex items-center text-xs text-gray-500">
          <User size={12} className="mr-1" />
          <span>
            {task.assignedTo.map((user: any) => user.name).join(', ') || 'Unassigned'}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center space-x-2">
          {canStartTimer && (
            <button
              onClick={handleTimerToggle}
              disabled={isUpdating}
              className={`p-2 rounded-lg transition-colors ${
                activeTimer?.taskId === task._id
                  ? 'bg-red-100 text-red-600 hover:bg-red-200'
                  : 'bg-green-100 text-green-600 hover:bg-green-200'
              }`}
            >
              {activeTimer?.taskId === task._id ? (
                <Square size={14} fill="currentColor" />
              ) : (
                <Play size={14} fill="currentColor" />
              )}
            </button>
          )}
          
          {user?.role === 'employee' && task.assignedTo.some((assignee: any) => assignee._id === user._id) && (
            <select
              value={task.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={isUpdating}
              className="text-xs bg-transparent border-none focus:ring-0 cursor-pointer"
            >
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
          )}
        </div>
        
        <span className={`text-xs font-medium ${statusColors[task.status]}`}>
          {task.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </span>
      </div>
    </div>
  );
};