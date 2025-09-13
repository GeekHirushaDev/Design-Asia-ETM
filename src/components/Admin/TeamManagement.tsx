import React, { useState, useEffect } from 'react';
import { Users, Edit, Trash2, Mail, Phone, Calendar, Plus, Search, Save, X, Crown } from 'lucide-react';
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            {team ? 'Edit Team' : 'Create New Team'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

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
                availableEmployees.map((employee) => (
                  <label key={employee._id} className="flex items-center space-x-2 py-1">
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
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">{employee.name} ({employee.email})</span>
                  </label>
                ))
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

          <div className="flex gap-3 pt-4">
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
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TeamsView: React.FC<{
  teams: Team[];
  employees: Employee[];
  onEdit: (team: Team) => void;
  onDelete: (teamId: string) => void;
  onRefresh: () => void;
}> = ({ teams, employees, onEdit, onDelete, onRefresh }) => {
  return (
    <div className="grid gap-6">
      {teams.length === 0 ? (
        <div className="text-center py-12">
          <Users size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No teams found</h3>
          <p className="text-gray-600">Create your first team to get started</p>
        </div>
      ) : (
        teams.map((team) => (
          <div key={team._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">{team.name}</h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    team.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {team.status}
                  </span>
                </div>
                {team.description && (
                  <p className="text-gray-600 mt-1">{team.description}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span>{team.members.length} members</span>
                  <span>Created {new Date(team.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(team)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => onDelete(team._id)}
                  className="p-2 text-red-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {team.leader && (
              <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Crown size={16} className="text-yellow-600" />
                  <span className="font-medium text-yellow-800">Team Leader</span>
                </div>
                <p className="text-yellow-700 mt-1">{team.leader.name} ({team.leader.email})</p>
              </div>
            )}

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Team Members</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {team.members.map((member) => (
                  <div key={member._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{member.name}</p>
                      <p className="text-sm text-gray-600">{member.email}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      member.role === 'admin' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

const UsersView: React.FC<{
  employees: Employee[];
  onStatusToggle: (employeeId: string, currentStatus: string) => void;
  onDelete: (employeeId: string) => void;
}> = ({ employees, onStatusToggle, onDelete }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          All Users ({employees.length})
        </h2>
      </div>

      {employees.length === 0 ? (
        <div className="text-center py-12">
          <Users size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
          <p className="text-gray-600">No users match your current filters</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {employees.map((employee) => (
            <div key={employee._id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-lg">
                      {employee.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{employee.name}</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Mail size={14} />
                        <span>{employee.email}</span>
                      </div>
                      {employee.phone && (
                        <div className="flex items-center space-x-1">
                          <Phone size={14} />
                          <span>{employee.phone}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        employee.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {employee.role}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        employee.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {employee.status}
                      </span>
                      {employee.lastLoginAt && (
                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                          <Calendar size={12} />
                          <span>Last login: {new Date(employee.lastLoginAt).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onStatusToggle(employee._id, employee.status)}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                      employee.status === 'active'
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {employee.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                  
                  <button 
                    onClick={() => onDelete(employee._id)}
                    className="p-2 text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const TeamManagement: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [activeTab, setActiveTab] = useState<'teams' | 'users'>('teams');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [teamsResponse, usersResponse] = await Promise.all([
        teamApi.getTeams(),
        userApi.getUsers()
      ]);
      
      setTeams(teamsResponse.data.teams || []);
      setEmployees(usersResponse.data.users || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load teams and users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusToggle = async (employeeId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await userApi.updateUser(employeeId, { status: newStatus });
      
      setEmployees(prev => 
        prev.map(emp => 
          emp._id === employeeId ? { ...emp, status: newStatus as 'active' | 'inactive' } : emp
        )
      );
      
      toast.success(`User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
    } catch (error: any) {
      console.error('Failed to update user status:', error);
      toast.error(error.response?.data?.error || 'Failed to update user status');
    }
  };

  const handleDeleteUser = async (employeeId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await userApi.deleteUser(employeeId);
      setEmployees(prev => prev.filter(emp => emp._id !== employeeId));
      toast.success('User deleted successfully');
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      toast.error(error.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team? This action cannot be undone.')) {
      return;
    }

    try {
      await teamApi.deleteTeam(teamId);
      setTeams(prev => prev.filter(team => team._id !== teamId));
      toast.success('Team deleted successfully');
    } catch (error: any) {
      console.error('Failed to delete team:', error);
      toast.error(error.response?.data?.error || 'Failed to delete team');
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || emp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredTeams = teams.filter(team => {
    const matchesSearch = team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         team.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || team.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Team & User Management</h2>
        <div className="flex gap-2">
          {activeTab === 'teams' && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus size={16} className="mr-2" />
              Create Team
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex">
          {[
            { id: 'teams', label: 'Teams', icon: Users },
            { id: 'users', label: 'All Users', icon: Users }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center px-6 py-3 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-5 h-5 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'teams' ? (
        <TeamsView 
          teams={filteredTeams}
          employees={employees}
          onEdit={setEditingTeam}
          onDelete={handleDeleteTeam}
          onRefresh={loadData}
        />
      ) : (
        <UsersView 
          employees={filteredEmployees}
          onStatusToggle={handleStatusToggle}
          onDelete={handleDeleteUser}
        />
      )}

      {/* Create/Edit Team Modal */}
      {(showCreateForm || editingTeam) && (
        <TeamModal
          team={editingTeam}
          employees={employees}
          onClose={() => {
            setShowCreateForm(false);
            setEditingTeam(null);
          }}
          onSuccess={() => {
            setShowCreateForm(false);
            setEditingTeam(null);
            loadData();
          }}
        />
      )}
    </div>
  );
};