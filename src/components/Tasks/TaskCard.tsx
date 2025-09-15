import React, { useState } from 'react';
import { Clock, MapPin, User, Play, Pause, CheckCircle, Users, Crown, Trash2, Eye, Square, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { taskApi } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { LiveTimeTracker } from '../TimeTracking/LiveTimeTracker';
import { TaskDetails } from './TaskDetails';
import toast from 'react-hot-toast';

interface TaskCardProps {
  task: any;
  onUpdate: () => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onUpdate }) => {
  const { user } = useAuthStore();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

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

  // Check user permissions for this task
  const isAdmin = (user as any)?.isSuperAdmin || user?.role === 'admin';
  const isAssignedIndividually = task.assignmentType === 'individual' && 
    task.assignedTo?.some((assignee: any) => assignee._id === user?._id);
  const isTeamLeader = task.assignmentType === 'team' && 
    task.assignedTeam?.leader?._id === user?._id;
  const isTeamMember = task.assignmentType === 'team' && 
    task.assignedTeam?.members?.some((member: any) => member._id === user?._id);

  // Determine what actions the user can take
  const canControl = isAdmin || isAssignedIndividually || isTeamLeader;
  const canView = canControl || isTeamMember;

  // Get current location if needed
  const getCurrentLocation = (): Promise<{latitude: number, longitude: number}> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject('Geolocation not supported');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          resolve(location);
        },
        (error) => reject('Failed to get location: ' + error.message)
      );
    });
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      setIsUpdating(true);
      let location;

      // Get location if task requires it
      if (task.location && !isAdmin && ['in_progress', 'paused', 'completed'].includes(newStatus)) {
        try {
          location = await getCurrentLocation();
        } catch (error) {
          toast.error('Location access required for this task');
          return;
        }
      }

      const response = await taskApi.updateStatus(task._id, newStatus, location);
      toast.success(response.data.message || `Task ${newStatus.replace('_', ' ')}`);
      onUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.error || `Failed to change task status`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      setIsUpdating(true);
      await taskApi.deleteTask(task._id);
      toast.success('Task deleted successfully');
      onUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete task');
    } finally {
      setIsUpdating(false);
    }
  };

  // Don't render anything if user can't view this task
  if (!canView && !isAdmin) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 mb-1">{task.title}</h3>
          <p className="text-sm text-gray-600 line-clamp-2">{task.description}</p>
        </div>
        
        {/* Priority Badge */}
        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${priorityColors[task.priority as keyof typeof priorityColors] || priorityColors.low}`}>
          {task.priority}
        </span>
      </div>

      {/* Assignment Info */}
      <div className="flex items-center mb-3 text-sm text-gray-600">
        {task.assignmentType === 'team' ? (
          <div className="flex items-center">
            <Users size={14} className="mr-1" />
            <span>Team: {task.assignedTeam?.name}</span>
            {task.assignedTeam?.leader && (
              <span className="ml-2 flex items-center">
                <Crown size={12} className="mr-1 text-yellow-500" />
                {task.assignedTeam.leader.name}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center">
            <User size={14} className="mr-1" />
            <span>
              {task.assignedTo?.map((user: any) => user.name).join(', ') || 'Unassigned'}
            </span>
          </div>
        )}
      </div>

      {/* Location Info */}
      {task.location && (
        <div className="flex items-center mb-3 text-sm text-gray-600">
          <MapPin size={14} className="mr-1" />
          <span>Location required (within {task.location.radiusMeters || 100}m)</span>
        </div>
      )}

      {/* Time and Efficiency (Admin only) */}
      {isAdmin && task.timeStats && (
        <div className="bg-gray-50 rounded p-2 mb-3 text-xs">
          <div className="flex justify-between">
            <span>Time Spent: {task.timeStats.timeSpent}</span>
            <span className="font-medium" style={{color: task.timeStats.efficiencyColor}}>
              Efficiency: {task.timeStats.efficiency ? `${task.timeStats.efficiency}%` : 'N/A'}
            </span>
          </div>
        </div>
      )}

      {/* Due Date */}
      {task.dueDate && (
        <div className="flex items-center mb-3 text-sm text-gray-600">
          <Clock size={14} className="mr-1" />
          <span>Due: {format(new Date(task.dueDate), 'PPp')}</span>
        </div>
      )}

      {/* Action Buttons */}
      {canControl && (
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex space-x-2">
            {/* View Details Button */}
            <button
              onClick={() => setShowDetails(true)}
              className="flex items-center px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
            >
              <Eye size={14} className="mr-1" />
              Details
            </button>
            
            {task.status === 'not_started' && (
              <button
                onClick={() => handleStatusChange('in_progress')}
                disabled={isUpdating}
                className="flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
              >
                <Play size={14} className="mr-1" />
                Start
              </button>
            )}
            
            {task.status === 'in_progress' && (
              <>
                <button
                  onClick={() => handleStatusChange('paused')}
                  disabled={isUpdating}
                  className="flex items-center px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 disabled:opacity-50"
                >
                  <Pause size={14} className="mr-1" />
                  Pause
                </button>
                <button
                  onClick={() => handleStatusChange('completed')}
                  disabled={isUpdating}
                  className="flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  <CheckCircle size={14} className="mr-1" />
                  Complete
                </button>
              </>
            )}
            
            {task.status === 'paused' && (
              <>
                <button
                  onClick={() => handleStatusChange('in_progress')}
                  disabled={isUpdating}
                  className="flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                >
                  <RotateCcw size={14} className="mr-1" />
                  Resume
                </button>
                <button
                  onClick={() => handleStatusChange('completed')}
                  disabled={isUpdating}
                  className="flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  <CheckCircle size={14} className="mr-1" />
                  Complete
                </button>
              </>
            )}
          </div>

          {/* Admin Controls */}
          {isAdmin && (
            <div className="flex space-x-1">
              {task.status !== 'completed' && (
                <select
                  value={task.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="text-xs border rounded px-2 py-1"
                >
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                </select>
              )}
              <button
                onClick={handleDeleteTask}
                disabled={isUpdating}
                className="p-1 text-red-600 hover:bg-red-50 rounded"
                title="Delete task"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Status Display for non-controllers */}
      {!canControl && canView && (
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <span className={`text-xs font-medium ${statusColors[task.status as keyof typeof statusColors] || statusColors.not_started}`}>
            Status: {task.status.replace('_', ' ').toUpperCase()}
          </span>
          <button
            onClick={() => setShowDetails(true)}
            className="flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200"
          >
            <Eye size={12} className="mr-1" />
            Details
          </button>
        </div>
      )}

      {/* Live Time Tracker */}
      {canView && (
        <LiveTimeTracker task={task} user={user} />
      )}

      {/* Task Details Modal */}
      {showDetails && (
        <TaskDetails 
          taskId={task._id} 
          onClose={() => setShowDetails(false)}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
};