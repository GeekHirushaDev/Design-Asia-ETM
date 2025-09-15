import React, { useState, useEffect } from 'react';
import { Users, Edit, Trash2, Mail, Phone, Calendar, Plus, Search, Save, X, Crown, UserPlus, Shield } from 'lucide-react';
import { userApi, teamApi } from '../../lib/api';
import toast from 'react-hot-toast';

interface Employee {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'employee';
  phone?: string;
  status: 'active' | 'inactive';
  lastLoginAt?: string;
  createdAt: string;
}

interface Team {
  _id: string;
  name: string;
  description?: string;
  members: Employee[];
  leader?: Employee;
  status: 'active' | 'inactive';
  createdBy: Employee;
  createdAt: string;
}

interface TeamFormData {
  name: string;
  description: string;
  members: string[];
  leader: string;
  status: 'active' | 'inactive';
}

interface UserFormData {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'employee';
  phone: string;
}

const TeamModal: React.FC<{
  team?: Team | null;
  employees: Employee[];
  onClose: () => void;
  onSuccess: () => void;
}> = ({ team, employees, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<TeamFormData>({
    name: team?.name || '',
    description: team?.description || '',
    members: team?.members?.map(m => m._id) || [],
    leader: team?.leader?._id || '',
    status: team?.status || 'active'
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Team name is required');
      return;
    }

    try {
      setIsLoading(true);
      const data = {
        ...formData,
        leader: formData.leader || undefined
      };

      if (team) {
        await teamApi.updateTeam(team._id, data);
        toast.success('Team updated successfully');
      } else {
        await teamApi.createTeam(data);
        toast.success('Team created successfully');
      }
      
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save team');
    } finally {
      setIsLoading(false);
    }
  };

  const availableEmployees = employees.filter(emp => emp.status === 'active');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 sm:p-6 border-b">
          <h3 className="text-lg font-semibold">
            {team ? 'Edit Team' : 'Create New Team'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Team Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter team name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Enter team description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Team Members
              </label>
              <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto">
                {availableEmployees.length === 0 ? (
                  <p className="text-gray-500 text-sm">No active employees available</p>
                ) : (
                  <div className="space-y-2">
                    {availableEmployees.map((employee) => (
                      <label key={employee._id} className="flex items-start space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.members.includes(employee._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                members: [...formData.members, employee._id]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                members: formData.members.filter(id => id !== employee._id),
                                leader: formData.leader === employee._id ? '' : formData.leader
                              });
                            }
                          }}
                          className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="block text-sm font-medium truncate">{employee.name}</span>
                          <span className="block text-xs text-gray-500 truncate">{employee.email}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Team Leader
              </label>
              <select
                value={formData.leader}
                onChange={(e) => setFormData({ ...formData, leader: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select team leader</option>
                {availableEmployees
                  .filter(emp => formData.members.includes(emp._id))
                  .map((employee) => (
                    <option key={employee._id} value={employee._id}>
                      {employee.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <>
                    <Save size={16} className="mr-2" />
                    {team ? 'Update Team' : 'Create Team'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const UserModal: React.FC<{
  user?: Employee | null;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ user, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<UserFormData>({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'employee',
    phone: user?.phone || ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Name and email are required');
      return;
    }

    if (!user && !formData.password) {
      toast.error('Password is required for new users');
      return;
    }

    try {
      setIsLoading(true);
      
      if (user) {
        const updateData = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          phone: formData.phone
        };
        await userApi.updateUser(user._id, updateData);
        toast.success('User updated successfully');
      } else {
        await userApi.createUser(formData);
        toast.success('User created successfully');
      }
      
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save user');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 sm:p-6 border-b">
          <h3 className="text-lg font-semibold">
            {user ? 'Edit User' : 'Create New User'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter full name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter email address"
                required
              />
            </div>

            {!user && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter password (min 6 characters)"
                  minLength={6}
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'employee' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <>
                    <Save size={16} className="mr-2" />
                    {user ? 'Update User' : 'Create User'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const TeamManagement: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editingUser, setEditingUser] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'teams' | 'users'>('teams');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [teamsResponse, usersResponse] = await Promise.all([
        teamApi.getTeams(),
        userApi.getUsers()
      ]);
      
      setTeams(teamsResponse.data?.teams || teamsResponse.data || []);
      setEmployees(usersResponse.data?.users || usersResponse.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return;
    
    try {
      await teamApi.deleteTeam(teamId);
      toast.success('Team deleted successfully');
      await loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete team');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await userApi.deleteUser(userId);
      toast.success('User deleted successfully');
      await loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleResetPassword = async (userId: string) => {
    const newPassword = prompt('Enter new password (min 6 characters):');
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    try {
      await userApi.resetPassword(userId, { newPassword });
      toast.success('Password reset successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reset password');
    }
  };

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Team Management</h2>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={() => {
                setEditingUser(null);
                setShowUserModal(true);
              }}
              className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <UserPlus size={16} className="mr-2" />
              Add User
            </button>
            <button
              onClick={() => {
                setEditingTeam(null);
                setShowTeamModal(true);
              }}
              className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} className="mr-2" />
              Add Team
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('teams')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'teams'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Teams ({teams.length})
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'users'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Users ({employees.length})
            </button>
          </div>

          <div className="flex-1 max-w-md relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {activeTab === 'teams' ? (
        <div>
          {filteredTeams.length === 0 ? (
            <div className="text-center py-12">
              <Users size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No teams found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm ? 'Try adjusting your search criteria' : 'Create your first team to get started'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => {
                    setEditingTeam(null);
                    setShowTeamModal(true);
                  }}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus size={16} className="mr-2" />
                  Create Team
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredTeams.map((team) => (
                <div key={team._id} className="bg-gray-50 rounded-lg p-4 sm:p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">{team.name}</h3>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        team.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {team.status}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1 ml-2">
                      <button
                        onClick={() => {
                          setEditingTeam(team);
                          setShowTeamModal(true);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-white"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteTeam(team._id)}
                        className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-white"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {team.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{team.description}</p>
                  )}

                  <div className="space-y-2">
                    {team.leader && (
                      <div className="flex items-center text-sm">
                        <Crown size={14} className="text-yellow-500 mr-2 flex-shrink-0" />
                        <span className="truncate">{team.leader.name}</span>
                      </div>
                    )}
                    <div className="flex items-center text-sm text-gray-600">
                      <Users size={14} className="mr-2 flex-shrink-0" />
                      <span>{team.members?.length || 0} member{(team.members?.length || 0) !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  {team.members && team.members.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="space-y-1">
                        {team.members.slice(0, 3).map((member) => (
                          <div key={member._id} className="flex items-center text-xs text-gray-600">
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                              <span className="text-blue-600 font-medium">
                                {member.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="truncate">{member.name}</span>
                          </div>
                        ))}
                        {team.members.length > 3 && (
                          <div className="text-xs text-gray-500">
                            +{team.members.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-12">
              <Users size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm ? 'Try adjusting your search criteria' : 'Create your first user to get started'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => {
                    setEditingUser(null);
                    setShowUserModal(true);
                  }}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <UserPlus size={16} className="mr-2" />
                  Create User
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredEmployees.map((employee) => (
                <div key={employee._id} className="bg-gray-50 rounded-lg p-4 sm:p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">{employee.name}</h3>
                        {employee.role === 'admin' && (
                          <Shield size={14} className="text-blue-600 flex-shrink-0" />
                        )}
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        employee.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {employee.status}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1 ml-2">
                      <button
                        onClick={() => {
                          setEditingUser(employee);
                          setShowUserModal(true);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-white"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(employee._id)}
                        className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-white"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail size={14} className="mr-2 flex-shrink-0" />
                      <span className="truncate">{employee.email}</span>
                    </div>
                    {employee.phone && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone size={14} className="mr-2 flex-shrink-0" />
                        <span className="truncate">{employee.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar size={14} className="mr-2 flex-shrink-0" />
                      <span>Joined {new Date(employee.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t">
                    <button
                      onClick={() => handleResetPassword(employee._id)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Reset Password
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showTeamModal && (
        <TeamModal
          team={editingTeam}
          employees={employees}
          onClose={() => {
            setShowTeamModal(false);
            setEditingTeam(null);
          }}
          onSuccess={() => {
            setShowTeamModal(false);
            setEditingTeam(null);
            loadData();
          }}
        />
      )}

      {showUserModal && (
        <UserModal
          user={editingUser}
          onClose={() => {
            setShowUserModal(false);
            setEditingUser(null);
          }}
          onSuccess={() => {
            setShowUserModal(false);
            setEditingUser(null);
            loadData();
          }}
        />
      )}
    </div>
  );
};

export default TeamManagement;