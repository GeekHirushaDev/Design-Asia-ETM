import React from 'react';
import { useState } from 'react';
import { Clock, MapPin, User, Play, Square, AlertCircle, Pause, CheckCircle } from 'lucide-react';
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
      updateTask(task._id, { status: newStatus as 'not_started' | 'in_progress' | 'paused' | 'completed' });
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
        
        // Automatically update task status to in_progress
        if (task.status === 'not_started') {
          await taskApi.updateTask(task._id, { status: 'in_progress' });
          updateTask(task._id, { status: 'in_progress' });
        }
        
        toast.success('Timer started');
        onUpdate();
      }
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
      updateTask(taskId, { status: 'paused' });
      
      toast.success('Timer paused');
      onUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to pause timer');
    }
  };

  const handleResumeTimer = async (taskId: string) => {
    try {
      if (activeTimer) {
        toast.error('Please stop the current timer first');
        return;
      }
      await taskApi.resumeTimer(taskId);
      startTimer(taskId);
      
      // Update task status to in_progress
      await taskApi.updateTask(taskId, { status: 'in_progress' });
      updateTask(taskId, { status: 'in_progress' });
      
      toast.success('Timer resumed');
      onUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to resume timer');
    }
  };

  const handleCompleteTask = async () => {
    try {
      // Stop timer if running
      if (activeTimer?.taskId === task._id) {
        await taskApi.stopTimer(task._id);
        stopTimer();
      }
      
      // Mark task as completed
      await taskApi.updateTask(task._id, { status: 'completed' });
      updateTask(task._id, { status: 'completed' });
      
      toast.success('Task completed!');
      onUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to complete task');
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
          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${priorityColors[task.priority as keyof typeof priorityColors] || priorityColors.low}`}>
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
          
              
              {/* Pause button when timer is active */}
              {activeTimer?.taskId === task._id && (
                <button
                  onClick={() => handlePauseTimer(task._id)}
                  disabled={isUpdating}
                  className="p-2 rounded-lg bg-yellow-100 text-yellow-600 hover:bg-yellow-200 transition-colors"
                  title="Pause Timer"
                >
                  <Pause size={14} />
                </button>
              )}
              
              {/* Complete button for in-progress tasks */}
              {(task.status === 'in_progress' || task.status === 'paused') && (
                <button
                  onClick={handleCompleteTask}
                  disabled={isUpdating}
                  className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
                  title="Complete Task"
                >
                  <CheckCircle size={14} />
                </button>
              )}
          {task.status === 'paused' && (
            <button
              onClick={() => handleResumeTimer(task._id)}
              disabled={isUpdating}
              className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
              title="Resume Timer"
            >
              <Play size={14} fill="currentColor" />
            </button>
          )}
        </div>
        
        <span className={`text-xs font-medium ${statusColors[task.status as keyof typeof statusColors] || statusColors.not_started}`}>
          {task.status.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
        </span>
      </div>
    </div>
  );
};