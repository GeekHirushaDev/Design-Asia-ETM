import React, { useState, useEffect } from 'react';
import { Clock, Play, Pause, Square } from 'lucide-react';
import { taskApi } from '../../lib/api';

interface LiveTimeTrackerProps {
  task: any;
  user: any;
  onUpdate: () => void;
}

export const LiveTimeTracker: React.FC<LiveTimeTrackerProps> = ({ task, user, onUpdate }) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [timeStats, setTimeStats] = useState<any>(null);

  useEffect(() => {
    // Check if user has active time tracking for this task
    checkActiveTimeTracking();
    // Load time statistics
    loadTimeStats();
  }, [task._id]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isActive) {
      interval = setInterval(() => {
        setCurrentTime(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive]);

  const checkActiveTimeTracking = async () => {
    try {
      const response = await taskApi.getActiveTimeLog(task._id);
      if (response.data.timeLog) {
        setIsActive(true);
        const startTime = new Date(response.data.timeLog.startTime);
        const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
        setCurrentTime(elapsed);
      }
    } catch (error) {
      // No active time tracking
      setIsActive(false);
      setCurrentTime(0);
    }
  };

  const loadTimeStats = async () => {
    try {
      const response = await taskApi.getTaskTimeStats(task._id);
      setTimeStats(response.data);
    } catch (error) {
      console.error('Failed to load time stats:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    } else {
      return `${mins}m`;
    }
  };

  const handleStartTracking = async () => {
    try {
      await taskApi.startTimeTracking(task._id);
      setIsActive(true);
      setCurrentTime(0);
      onUpdate();
    } catch (error: any) {
      console.error('Failed to start time tracking:', error);
    }
  };

  const handlePauseTracking = async () => {
    try {
      await taskApi.pauseTimeTracking(task._id);
      setIsActive(false);
      loadTimeStats();
      onUpdate();
    } catch (error: any) {
      console.error('Failed to pause time tracking:', error);
    }
  };

  const handleStopTracking = async () => {
    try {
      await taskApi.stopTimeTracking(task._id);
      setIsActive(false);
      setCurrentTime(0);
      loadTimeStats();
      onUpdate();
    } catch (error: any) {
      console.error('Failed to stop time tracking:', error);
    }
  };

  // Check if user can control time tracking
  const isAdmin = user?.role === 'admin';
  const isAssignedIndividually = task.assignmentType === 'individual' && 
    task.assignedTo?.some((assignee: any) => assignee._id === user?._id);
  const isTeamLeader = task.assignmentType === 'team' && 
    task.assignedTeam?.leader?._id === user?._id;
  
  const canControl = isAdmin || isAssignedIndividually || isTeamLeader;

  if (!canControl && !timeStats) {
    return null;
  }

  return (
    <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Clock size={16} className="text-blue-600" />
          <span className="text-sm font-medium text-gray-700">Time Tracking</span>
        </div>
        
        {canControl && (
          <div className="flex space-x-1">
            {!isActive ? (
              <button
                onClick={handleStartTracking}
                className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                title="Start Timer"
              >
                <Play size={14} />
              </button>
            ) : (
              <>
                <button
                  onClick={handlePauseTracking}
                  className="p-1 text-yellow-600 hover:bg-yellow-100 rounded transition-colors"
                  title="Pause Timer"
                >
                  <Pause size={14} />
                </button>
                <button
                  onClick={handleStopTracking}
                  className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                  title="Stop Timer"
                >
                  <Square size={14} />
                </button>
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Current Session */}
      {isActive && (
        <div className="mb-2">
          <div className="text-xs text-gray-600">Current Session:</div>
          <div className="text-lg font-bold text-blue-600">
            {formatTime(currentTime)}
          </div>
        </div>
      )}
      
      {/* Time Statistics */}
      {timeStats && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Total Time:</span>
            <span className="font-medium">{formatDuration(timeStats.totalMinutes || 0)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Efficiency:</span>
            <span className={`font-medium ${timeStats.efficiency >= 80 ? 'text-green-600' : timeStats.efficiency >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
              {timeStats.efficiency || 0}%
            </span>
          </div>
          {task.estimateMinutes && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Progress:</span>
              <span className="font-medium">
                {Math.round(((timeStats.totalMinutes || 0) / task.estimateMinutes) * 100)}%
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};