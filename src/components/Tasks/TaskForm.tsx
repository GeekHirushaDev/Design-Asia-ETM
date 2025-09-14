import React, { useState, useEffect } from 'react';
import { X, MapPin, Plus } from 'lucide-react';
import { taskApi, userApi, teamApi } from '../../lib/api';
import { getSriLankanTime } from '../../lib/timezone';
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
    assignmentType: task?.assignmentType || 'individual',
    assignedTo: task?.assignedTo?.map((user: any) => user._id) || [],
    assignedTeam: task?.assignedTeam?._id || '',
    estimateMinutes: task?.estimateMinutes || '',
    dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().slice(0, -1) : '',
    tags: task?.tags?.join(', ') || '',
    location: task?.location || null,
  });

  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [locationOption, setLocationOption] = useState<'none' | 'current' | 'manual'>('none');
  const [locationInput, setLocationInput] = useState({
    latitude: '',
    longitude: '',
    address: ''
  });

  useEffect(() => {
    loadUsers();
    loadTeams();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await userApi.getUsers();
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Failed to load users');
      setUsers([]);
    }
  };

  const loadTeams = async () => {
    try {
      const response = await teamApi.getTeams();
      setTeams(response.data.teams || []);
    } catch (error) {
      console.error('Failed to load teams');
      setTeams([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    // Validate assignments
    if (formData.assignmentType === 'individual' && formData.assignedTo.length === 0) {
      toast.error('Please assign the task to at least one user');
      return;
    }

    if (formData.assignmentType === 'team' && !formData.assignedTeam) {
      toast.error('Please select a team for this task');
      return;
    }

    // Validate location if provided
    if (locationOption !== 'none' && !formData.location) {
      toast.error('Please complete the location setup or select "No Location Required"');
      return;
    }

    try {
      setIsLoading(true);
      
      // Convert due date to Sri Lankan timezone
      let dueDateSriLanka = undefined;
      if (formData.dueDate) {
        dueDateSriLanka = getSriLankanTime(new Date(formData.dueDate));
      }
      
      const payload = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        assignmentType: formData.assignmentType,
        tags: formData.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean),
        estimateMinutes: formData.estimateMinutes ? parseInt(formData.estimateMinutes) : undefined,
        dueDate: dueDateSriLanka,
        assignedTo: formData.assignmentType === 'individual' ? formData.assignedTo : [],
        assignedTeam: formData.assignmentType === 'team' ? formData.assignedTeam : undefined,
        location: formData.location || undefined,
      };

      if (task) {
        await taskApi.updateTask(task._id, payload);
        toast.success('Task updated successfully');
      } else {
        await taskApi.createTask(payload);
        toast.success('Task created successfully');
      }
      
      onSubmit();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save task');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationFromInput = () => {
    const lat = parseFloat(locationInput.latitude);
    const lng = parseFloat(locationInput.longitude);
    const address = locationInput.address.trim();
    
    if (isNaN(lat) || isNaN(lng)) {
      toast.error('Please enter valid latitude and longitude values');
      return;
    }
    
    if (!address) {
      toast.error('Please enter a location address');
      return;
    }
    
    if (lat < -90 || lat > 90) {
      toast.error('Latitude must be between -90 and 90');
      return;
    }
    
    if (lng < -180 || lng > 180) {
      toast.error('Longitude must be between -180 and 180');
      return;
    }

    setFormData({
      ...formData,
      location: {
        lat,
        lng,
        address,
        radiusMeters: 100,
      },
    });
    
    setLocationInput({ latitude: '', longitude: '', address: '' });
    setLocationOption('none');
    toast.success('Location added successfully');
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Prompt for address when using current location
          const address = prompt('Please enter the address for this location:');
          if (!address || !address.trim()) {
            toast.error('Address is required when using current location');
            return;
          }
          
          setFormData({
            ...formData,
            location: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              address: address.trim(),
              radiusMeters: 100,
            },
          });
          setLocationOption('none');
          toast.success('Current location added');
        },
        () => {
          toast.error('Failed to get current location. Please check your browser settings.');
        }
      );
    } else {
      toast.error('Geolocation is not supported by this browser');
    }
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

          {/* Assignment Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assignment Type
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="assignmentType"
                  value="individual"
                  checked={formData.assignmentType === 'individual'}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    assignmentType: e.target.value,
                    assignedTeam: '' // Clear team when switching to individual
                  })}
                  className="mr-2"
                />
                Individual
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="assignmentType"
                  value="team"
                  checked={formData.assignmentType === 'team'}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    assignmentType: e.target.value,
                    assignedTo: [] // Clear individual assignments when switching to team
                  })}
                  className="mr-2"
                />
                Team
              </label>
            </div>
          </div>

          {/* Team Assignment */}
          {formData.assignmentType === 'team' && teams.length > 0 && (
            <div>
              <label htmlFor="assignedTeam" className="block text-sm font-medium text-gray-700 mb-1">
                Assign to Team
              </label>
              <select
                id="assignedTeam"
                value={formData.assignedTeam}
                onChange={(e) => setFormData({ ...formData, assignedTeam: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a team...</option>
                {teams.map((team: any) => (
                  <option key={team._id} value={team._id}>
                    {team.name} ({team.members?.length || 0} members)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Individual Assignment */}
          {formData.assignmentType === 'individual' && users.length > 0 && (
            <div>
              <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-700 mb-1">
                Assign To Users
              </label>
              <div className="border border-gray-300 rounded-lg p-3 max-h-32 overflow-y-auto">
                {users.map((user: any) => (
                  <label key={user._id} className="flex items-center space-x-2 py-1">
                    <input
                      type="checkbox"
                      checked={formData.assignedTo.includes(user._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            assignedTo: [...formData.assignedTo, user._id]
                          });
                        } else {
                          setFormData({
                            ...formData,
                            assignedTo: formData.assignedTo.filter((id: string) => id !== user._id)
                          });
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">{user.name} ({user.email})</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Due Date */}
          <div>
            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
              Due Date <span className="text-xs text-gray-500">(Sri Lankan Time)</span>
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
                Location (Optional)
              </label>
              {!formData.location && locationOption === 'none' && (
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLocationOption('current');
                      getCurrentLocation();
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    Use Current Location
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={() => setLocationOption('manual')}
                    className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    Enter Coordinates
                  </button>
                </div>
              )}
            </div>
            
            {locationOption === 'manual' && !formData.location && (
              <div className="border border-gray-300 rounded-lg p-4 space-y-3 mb-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Latitude *
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g., 6.9271"
                      value={locationInput.latitude}
                      onChange={(e) => setLocationInput({ ...locationInput, latitude: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Longitude *
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g., 79.8612"
                      value={locationInput.longitude}
                      onChange={(e) => setLocationInput({ ...locationInput, longitude: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Address *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Main Office, Colombo"
                    value={locationInput.address}
                    onChange={(e) => setLocationInput({ ...locationInput, address: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={handleLocationFromInput}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Add Location
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLocationOption('none');
                      setLocationInput({ latitude: '', longitude: '', address: '' });
                    }}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            {formData.location && (
              <div className="space-y-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <MapPin size={16} className="text-green-600" />
                  <span className="text-sm text-green-800 font-medium">
                    {formData.location.address}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, location: null });
                      setLocationOption('none');
                    }}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
                <div className="text-xs text-green-700">
                  Coordinates: {formData.location.lat.toFixed(6)}, {formData.location.lng.toFixed(6)}
                </div>
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
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Saving...
                </>
              ) : (
                task ? 'Update Task' : 'Create Task'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};