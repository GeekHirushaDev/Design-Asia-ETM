import React, { useState, useEffect } from 'react';
import { X, Download, FileText, Calendar, MapPin, User, Users, Crown, Clock, Upload, History, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { taskApi, attachmentApi } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface TaskDetailsProps {
  taskId: string;
  onClose: () => void;
  onUpdate?: () => void;
}

export const TaskDetails: React.FC<TaskDetailsProps> = ({ taskId, onClose, onUpdate }) => {
  const { user } = useAuthStore();
  const [task, setTask] = useState<any>(null);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [timeAnalytics, setTimeAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadTask();
    loadStatusHistory();
    loadTimeAnalytics();
  }, [taskId]);

  const loadTask = async () => {
    try {
      setIsLoading(true);
      const response = await taskApi.getTask(taskId);
      setTask(response.data);
    } catch (error) {
      toast.error('Failed to load task details');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStatusHistory = async () => {
    try {
      const response = await taskApi.getStatusHistory(taskId);
      setStatusHistory(response.data.history || []);
    } catch (error) {
      console.error('Failed to load status history:', error);
    }
  };

  const loadTimeAnalytics = async () => {
    try {
      const response = await taskApi.getAnalytics(taskId, user?._id || '');
      setTimeAnalytics(response.data);
    } catch (error) {
      console.error('Failed to load time analytics:', error);
    }
  };

  const handleFileUpload = async (files: FileList) => {
    if (!files || files.length === 0) return;

    // Validate file constraints
    if (files.length > 20) {
      toast.error('Maximum 20 files allowed');
      return;
    }

    const oversizedFiles = Array.from(files).filter(file => file.size > 20 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast.error('Each file must be under 20MB');
      return;
    }

    // Check current attachment count
    const currentCount = task?.attachments?.length || 0;
    if (currentCount + files.length > 20) {
      toast.error(`Cannot upload ${files.length} files. Maximum 20 attachments per task (current: ${currentCount})`);
      return;
    }

    try {
      setUploading(true);
      await attachmentApi.uploadTaskAttachments(taskId, files);
      toast.success(`${files.length} file(s) uploaded successfully`);
      loadTask(); // Reload to show new attachments
      onUpdate?.();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (attachment: any) => {
    try {
      const response = await attachmentApi.downloadTaskAttachment(taskId, attachment.filename);
      window.open(response.data.downloadUrl, '_blank');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to download file');
    }
  };

  const handleDeleteAttachment = async (attachment: any) => {
    if (!window.confirm(`Are you sure you want to delete "${attachment.originalName}"?`)) {
      return;
    }

    try {
      await attachmentApi.deleteTaskAttachment(taskId, attachment.filename);
      toast.success('Attachment deleted successfully');
      loadTask();
      onUpdate?.();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete attachment');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Check permissions
  const isAdmin = user?.role === 'admin';
  const isCreator = task?.createdBy?._id === user?._id;
  const isAssigned = task?.assignedTo?.some((assignee: any) => assignee._id === user?._id);
  const isTeamMember = task?.assignmentType === 'team' && 
    task.assignedTeam?.members?.some((member: any) => member._id === user?._id);
  
  const canUpload = isAdmin || isCreator || isAssigned;
  const canView = canUpload || isTeamMember;

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-2 text-center">Loading task details...</p>
        </div>
      </div>
    );
  }

  if (!task || !canView) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-8 text-center">
          <p className="text-gray-500">Task not found or access denied</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const priorityColors = {
    high: 'bg-red-100 text-red-800 border-red-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-green-100 text-green-800 border-green-200',
  };

  const statusColors = {
    not_started: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-blue-100 text-blue-800',
    paused: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Task Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div>
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{task.title}</h3>
                <p className="text-gray-600">{task.description}</p>
              </div>
              <div className="flex space-x-2 ml-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                  priorityColors[task.priority as keyof typeof priorityColors] || priorityColors.low
                }`}>
                  {task.priority} priority
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  statusColors[task.status as keyof typeof statusColors] || statusColors.not_started
                }`}>
                  {task.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Assignment & Timeline */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Assignment</h4>
              
              {/* Assignment Info */}
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                {task.assignmentType === 'team' ? (
                  <>
                    <Users size={16} />
                    <span>Team: {task.assignedTeam?.name}</span>
                    {task.assignedTeam?.leader && (
                      <span className="ml-2 flex items-center">
                        <Crown size={12} className="mr-1 text-yellow-500" />
                        {task.assignedTeam.leader.name}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <User size={16} />
                    <span>
                      {task.assignedTo?.map((user: any) => user.name).join(', ') || 'Unassigned'}
                    </span>
                  </>
                )}
              </div>

              {/* Creator */}
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User size={16} />
                <span>Created by: {task.createdBy?.name}</span>
              </div>

              {/* Tags */}
              {task.tags && task.tags.length > 0 && (
                <div>
                  <span className="text-sm text-gray-600">Tags: </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {task.tags.map((tag: string, index: number) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Timeline</h4>
              
              {/* Due Date */}
              {task.dueDate && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Calendar size={16} />
                  <span>Due: {format(new Date(task.dueDate), 'PPp')}</span>
                </div>
              )}

              {/* Estimate */}
              {task.estimateMinutes && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Clock size={16} />
                  <span>Estimate: {task.estimateMinutes} minutes</span>
                </div>
              )}

              {/* Created */}
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar size={16} />
                <span>Created: {format(new Date(task.createdAt), 'PPp')}</span>
              </div>
            </div>
          </div>

          {/* Location */}
          {task.location && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Location</h4>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <MapPin size={16} />
                <span>{task.location.address}</span>
                <span className="text-gray-400">
                  (within {task.location.radiusMeters || 100}m radius)
                </span>
              </div>
              {task.location.savedLocationName && (
                <p className="text-xs text-gray-500 mt-1">
                  Saved location: {task.location.savedLocationName}
                </p>
              )}
              <div className="text-xs text-gray-500 mt-1">
                Coordinates: {task.location.lat?.toFixed(6)}, {task.location.lng?.toFixed(6)}
              </div>
            </div>
          )}

          {/* Time Analytics */}
          {timeAnalytics && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                <Activity size={16} className="mr-2" />
                Time Analytics
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">{timeAnalytics.totalHours}h</div>
                  <div className="text-xs text-gray-600">Total Time</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{timeAnalytics.estimatedMinutes}m</div>
                  <div className="text-xs text-gray-600">Estimated</div>
                </div>
                <div className="text-center">
                  <div className={`text-lg font-bold ${timeAnalytics.efficiency >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                    {timeAnalytics.efficiency}%
                  </div>
                  <div className="text-xs text-gray-600">Efficiency</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-600">{timeAnalytics.timeLogs}</div>
                  <div className="text-xs text-gray-600">Sessions</div>
                </div>
              </div>
            </div>
          )}

          {/* Status History */}
          {statusHistory.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                <History size={16} className="mr-2" />
                Status History
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {statusHistory.map((log: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{log.userId?.name}</span>
                      <span className="text-gray-500">changed status from</span>
                      <span className="px-2 py-1 bg-gray-200 rounded text-xs">{log.fromStatus.replace('_', ' ')}</span>
                      <span className="text-gray-500">to</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{log.toStatus.replace('_', ' ')}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {format(new Date(log.timestamp), 'MMM dd, HH:mm')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Time Analytics */}
          {timeAnalytics && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                <Activity size={16} className="mr-2" />
                Time Analytics
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">{timeAnalytics.totalHours}h</div>
                  <div className="text-xs text-gray-600">Total Time</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{timeAnalytics.estimatedMinutes}m</div>
                  <div className="text-xs text-gray-600">Estimated</div>
                </div>
                <div className="text-center">
                  <div className={`text-lg font-bold ${timeAnalytics.efficiency >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                    {timeAnalytics.efficiency}%
                  </div>
                  <div className="text-xs text-gray-600">Efficiency</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-600">{timeAnalytics.timeLogs}</div>
                  <div className="text-xs text-gray-600">Sessions</div>
                </div>
              </div>
            </div>
          )}

          {/* Status History */}
          {statusHistory.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                <History size={16} className="mr-2" />
                Status History
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {statusHistory.map((log: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{log.userId?.name}</span>
                      <span className="text-gray-500">changed status from</span>
                      <span className="px-2 py-1 bg-gray-200 rounded text-xs">{log.fromStatus.replace('_', ' ')}</span>
                      <span className="text-gray-500">to</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{log.toStatus.replace('_', ' ')}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {format(new Date(log.timestamp), 'MMM dd, HH:mm')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attachments */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900">
                Attachments ({task.attachments?.length || 0}/20)
              </h4>
              {canUpload && (
                <div>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                    className="hidden"
                    id="attachment-upload"
                    accept="*"
                  />
                  <label
                    htmlFor="attachment-upload"
                    className={`inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors cursor-pointer ${
                      uploading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Upload size={16} className="mr-2" />
                    {uploading ? 'Uploading...' : 'Upload Files'}
                  </label>
                </div>
              )}
            </div>

            {task.attachments && task.attachments.length > 0 ? (
              <div className="space-y-2">
                {task.attachments.map((attachment: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center space-x-3">
                      <FileText size={20} className="text-gray-500" />
                      <div>
                        <p className="font-medium text-gray-900">{attachment.originalName}</p>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span>{formatFileSize(attachment.size)}</span>
                          <span>•</span>
                          <span>
                            Uploaded by {attachment.uploadedBy?.name || 'Unknown'} on{' '}
                            {format(new Date(attachment.uploadedAt), 'PPp')}
                          </span>
                          {attachment.downloadCount > 0 && (
                            <>
                              <span>•</span>
                              <span>{attachment.downloadCount} downloads</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleDownload(attachment)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download size={16} />
                      </button>
                      {(isAdmin || isCreator || attachment.uploadedBy._id === user?._id) && (
                        <button
                          onClick={() => handleDeleteAttachment(attachment)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                <p>No attachments</p>
                {canUpload && (
                  <p className="text-sm">Upload files to share with the team</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};