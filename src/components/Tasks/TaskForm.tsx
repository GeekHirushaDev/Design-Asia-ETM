import React, { useState, useEffect } from 'react';
import { X, MapPin } from 'lucide-react';
import { taskApi, authApi } from '../../lib/api';
import toast from 'react-hot-toast';

interface TaskFormProps {
  onClose: () => void;
  onSubmit: () => void;
  task?: any;
}

export const TaskForm: React.FC<TaskFormProps> = ({ onClose, onSubmit, task }) => {
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    priority: task?.priority || 'medium',
    assignedTo: task?.assignedTo?.map((user: any) => user._id) || [],
    estimateMinutes: task?.estimateMinutes || '',
    dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().slice(0, -1) : '',
    tags: task?.tags?.join(', ') || '',
    location: task?.location || null,
  });

  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      // In a real app, you'd have a users endpoint
      // For now, we'll simulate this
      setUsers([]);
    } catch (error) {
      console.error('Failed to load users');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      setIsLoading(true);
      
      const payload = {
        ...formData,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        estimateMinutes: formData.estimateMinutes ? parseInt(formData.estimateMinutes) : undefined,
        dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
      };

      if (task) {
        await taskApi.updateTask(task._id, payload);
      } else {
        await taskApi.createTask(payload);
      }
      
      onSubmit();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save task');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationSelect = (location: { lat: number; lng: number }) => {
    setFormData({
      ...formData,
      location: {
        ...location,
        radiusMeters: 100,
      },
    });
    setShowLocationPicker(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {task ? 'Edit Task' : 'Create New Task'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              id="description"
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              required
            />
          </div>

          {/* Priority and Estimate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label htmlFor="estimate" className="block text-sm font-medium text-gray-700 mb-1">
                Estimate (minutes)
              </label>
              <input
                type="number"
                id="estimate"
                min="1"
                value={formData.estimateMinutes}
                onChange={(e) => setFormData({ ...formData, estimateMinutes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
              Due Date
            </label>
            <input
              type="datetime-local"
              id="dueDate"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="frontend, urgent, client-work"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Location */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Location
              </label>
              {!formData.location && (
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        (position) => {
                          setFormData({
                            ...formData,
                            location: {
                              lat: position.coords.latitude,
                              lng: position.coords.longitude,
                              radiusMeters: 100,
                            },
                          });
                        },
                        (error) => {
                          toast.error('Failed to get current location');
                        }
                      );
                    }
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Use Current Location
                </button>
              )}
            </div>
            
            {formData.location && (
              <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                <MapPin size={16} className="text-gray-600" />
                <span className="text-sm text-gray-700">
                  Location: {formData.location.lat.toFixed(4)}, {formData.location.lng.toFixed(4)}
                </span>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, location: null })}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Saving...' : (task ? 'Update Task' : 'Create Task')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};