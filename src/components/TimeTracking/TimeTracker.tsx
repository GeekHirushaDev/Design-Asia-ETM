import React, { useState, useEffect } from 'react';
import { 
  PlayIcon, 
  PauseIcon, 
  StopIcon, 
  ClockIcon, 
  TagIcon,
  CurrencyDollarIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

interface TimeLog {
  id: string;
  taskId: {
    _id: string;
    title: string;
    priority: string;
    status: string;
  };
  startTime: string;
  endTime?: string;
  duration: number;
  description?: string;
  isBreak: boolean;
  breakType?: string;
  billable: boolean;
  efficiency: number;
  tags: string[];
  isActive: boolean;
}

interface TaskOption {
  _id: string;
  title: string;
  priority: string;
  status: string;
  estimateMinutes?: number;
}

interface TimeTrackingProps {
  tasks?: TaskOption[];
}

export const TimeTracker: React.FC<TimeTrackingProps> = ({ tasks = [] }) => {
  const [activeLog, setActiveLog] = useState<TimeLog | null>(null);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string>('');
  const [description, setDescription] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showBreakEntry, setShowBreakEntry] = useState(false);

  // Manual entry state
  const [manualEntry, setManualEntry] = useState({
    taskId: '',
    startTime: '',
    endTime: '',
    description: '',
    tags: [] as string[],
    billable: true
  });

  // Break entry state
  const [breakEntry, setBreakEntry] = useState({
    startTime: '',
    endTime: '',
    breakType: 'coffee' as 'lunch' | 'coffee' | 'meeting' | 'other',
    description: ''
  });

  // Update current time every second for timer display
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchActiveLog();
    fetchTimeLogs();
  }, []);

  const fetchActiveLog = async () => {
    try {
      const response = await fetch('/api/time-tracking/active', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setActiveLog(result.activeLog);
      }
    } catch (error) {
      console.error('Error fetching active log:', error);
    }
  };

  const fetchTimeLogs = async () => {
    try {
      const response = await fetch('/api/time-tracking/logs', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setTimeLogs(result.timeLogs);
      }
    } catch (error) {
      console.error('Error fetching time logs:', error);
    }
  };

  const startTracking = async () => {
    if (!selectedTask) return;

    setLoading(true);
    try {
      const response = await fetch('/api/time-tracking/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          taskId: selectedTask,
          description,
          estimatedDurationSeconds: estimatedDuration * 60
        })
      });

      if (response.ok) {
        const result = await response.json();
        setActiveLog(result.timeLog);
        setDescription('');
        setEstimatedDuration(0);
        setSelectedTask('');
      }
    } catch (error) {
      console.error('Error starting tracking:', error);
    } finally {
      setLoading(false);
    }
  };

  const stopTracking = async () => {
    if (!activeLog) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/time-tracking/stop/${activeLog.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ description })
      });

      if (response.ok) {
        setActiveLog(null);
        setDescription('');
        fetchTimeLogs();
      }
    } catch (error) {
      console.error('Error stopping tracking:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitManualEntry = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/time-tracking/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(manualEntry)
      });

      if (response.ok) {
        setShowManualEntry(false);
        setManualEntry({
          taskId: '',
          startTime: '',
          endTime: '',
          description: '',
          tags: [],
          billable: true
        });
        fetchTimeLogs();
      }
    } catch (error) {
      console.error('Error submitting manual entry:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitBreakEntry = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/time-tracking/break', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(breakEntry)
      });

      if (response.ok) {
        setShowBreakEntry(false);
        setBreakEntry({
          startTime: '',
          endTime: '',
          breakType: 'coffee',
          description: ''
        });
        fetchTimeLogs();
      }
    } catch (error) {
      console.error('Error submitting break entry:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
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

  const getElapsedTime = () => {
    if (!activeLog) return 0;
    const start = new Date(activeLog.startTime);
    return Math.floor((currentTime.getTime() - start.getTime()) / 1000);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      case 'pending': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Timer */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Time Tracker</h3>
        
        {activeLog ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <ClockIcon className="w-5 h-5 text-blue-600" />
                  <span className="text-2xl font-mono font-bold text-blue-600">
                    {formatDuration(getElapsedTime())}
                  </span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{activeLog.taskId.title}</h4>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(activeLog.taskId.priority)}`}>
                      {activeLog.taskId.priority}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(activeLog.taskId.status)}`}>
                      {activeLog.taskId.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={stopTracking}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                <StopIcon className="w-4 h-4 mr-2" />
                Stop
              </button>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stop Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="What did you accomplish?"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Task
                </label>
                <select
                  value={selectedTask}
                  onChange={(e) => setSelectedTask(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose a task...</option>
                  {tasks.map((task) => (
                    <option key={task._id} value={task._id}>
                      {task.title} ({task.priority})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Duration (minutes)
                </label>
                <input
                  type="number"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="What will you work on?"
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={startTracking}
                disabled={!selectedTask || loading}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                <PlayIcon className="w-4 h-4 mr-2" />
                Start Timer
              </button>
              
              <button
                onClick={() => setShowManualEntry(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Manual Entry
              </button>
              
              <button
                onClick={() => setShowBreakEntry(true)}
                className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
              >
                <PauseIcon className="w-4 h-4 mr-2" />
                Log Break
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Recent Time Logs */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Time Logs</h3>
        
        <div className="space-y-3">
          {timeLogs.length > 0 ? (
            timeLogs.slice(0, 10).map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-full ${log.isBreak ? 'bg-orange-100' : 'bg-blue-100'}`}>
                    {log.isBreak ? (
                      <PauseIcon className={`w-4 h-4 ${log.isBreak ? 'text-orange-600' : 'text-blue-600'}`} />
                    ) : (
                      <ClockIcon className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900">
                        {log.isBreak ? `Break (${log.breakType})` : log.taskId?.title || 'Unknown Task'}
                      </h4>
                      {!log.isBreak && (
                        <>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(log.taskId?.priority || 'low')}`}>
                            {log.taskId?.priority || 'low'}
                          </span>
                          {log.billable && (
                            <CurrencyDollarIcon className="w-4 h-4 text-green-600" title="Billable" />
                          )}
                        </>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                      <span>{format(new Date(log.startTime), 'MMM dd, HH:mm')}</span>
                      {log.endTime && (
                        <>
                          <span>→</span>
                          <span>{format(new Date(log.endTime), 'HH:mm')}</span>
                        </>
                      )}
                      <span className="font-medium">{formatDuration(log.duration * 3600)}</span>
                      {log.efficiency > 0 && (
                        <span className={`font-medium ${log.efficiency >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                          {log.efficiency.toFixed(1)}% efficiency
                        </span>
                      )}
                    </div>
                    
                    {log.description && (
                      <p className="text-sm text-gray-600 mt-1">{log.description}</p>
                    )}
                    
                    {log.tags && log.tags.length > 0 && (
                      <div className="flex items-center space-x-1 mt-1">
                        <TagIcon className="w-3 h-3 text-gray-400" />
                        {log.tags.map((tag, index) => (
                          <span key={index} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <ClockIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No time logs yet. Start tracking your first task!</p>
            </div>
          )}
        </div>
      </div>

      {/* Manual Entry Modal */}
      {showManualEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Manual Time Entry</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Task</label>
                <select
                  value={manualEntry.taskId}
                  onChange={(e) => setManualEntry({ ...manualEntry, taskId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select task...</option>
                  {tasks.map((task) => (
                    <option key={task._id} value={task._id}>
                      {task.title}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                  <input
                    type="datetime-local"
                    value={manualEntry.startTime}
                    onChange={(e) => setManualEntry({ ...manualEntry, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                  <input
                    type="datetime-local"
                    value={manualEntry.endTime}
                    onChange={(e) => setManualEntry({ ...manualEntry, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={manualEntry.description}
                  onChange={(e) => setManualEntry({ ...manualEntry, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="What did you work on?"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="billable"
                  checked={manualEntry.billable}
                  onChange={(e) => setManualEntry({ ...manualEntry, billable: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="billable" className="ml-2 text-sm text-gray-700">
                  Billable time
                </label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowManualEntry(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitManualEntry}
                disabled={!manualEntry.taskId || !manualEntry.startTime || !manualEntry.endTime || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Add Entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Break Entry Modal */}
      {showBreakEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Log Break Time</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Break Type</label>
                <select
                  value={breakEntry.breakType}
                  onChange={(e) => setBreakEntry({ ...breakEntry, breakType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="coffee">Coffee Break</option>
                  <option value="lunch">Lunch Break</option>
                  <option value="meeting">Meeting</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                  <input
                    type="datetime-local"
                    value={breakEntry.startTime}
                    onChange={(e) => setBreakEntry({ ...breakEntry, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                  <input
                    type="datetime-local"
                    value={breakEntry.endTime}
                    onChange={(e) => setBreakEntry({ ...breakEntry, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                <textarea
                  value={breakEntry.description}
                  onChange={(e) => setBreakEntry({ ...breakEntry, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional details..."
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowBreakEntry(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitBreakEntry}
                disabled={!breakEntry.startTime || !breakEntry.endTime || loading}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
              >
                Log Break
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};