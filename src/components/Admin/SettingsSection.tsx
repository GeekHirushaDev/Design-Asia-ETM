import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Shield, 
  UserPlus, 
  Edit, 
  Trash2, 
  Key,
  Check,
  X,
  AlertTriangle,
  Crown
} from 'lucide-react';
import { roleApi, userApi } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface Role {
  _id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  isActive: boolean;
}

interface Permission {
  _id: string;
  name: string;
  description: string;
  module: string;
  action: 'view' | 'insert' | 'update' | 'delete';
  resource: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  roleId?: string;
  status: 'active' | 'inactive';
  customPermissions?: string[];
}

export const SettingsSection: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'roles' | 'permissions'>('roles');
  
  // Roles state
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  
  // Form states
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    permissions: [] as string[]
  });

  const modules = [
    { key: 'tasks', name: 'Tasks', icon: '📋' },
    { key: 'users', name: 'Users', icon: '👥' },
    { key: 'teams', name: 'Teams', icon: '🏢' },
    { key: 'locations', name: 'Locations', icon: '📍' },
    { key: 'attachments', name: 'Attachments', icon: '📎' },
    { key: 'reports', name: 'Reports', icon: '📊' },
    { key: 'attendance', name: 'Attendance', icon: '🕐' },
    { key: 'tracking', name: 'Tracking', icon: '🎯' }
  ];

  const actions = ['view', 'insert', 'update', 'delete'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesRes, permissionsRes] = await Promise.all([
        roleApi.getRoles(),
        roleApi.getPermissions(),
      ]);
      
      setRoles(rolesRes.data.roles || []);
      setPermissions(permissionsRes.data.permissions || []);
    } catch (error: any) {
      toast.error('Failed to load settings data');
      console.error('Load settings error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    try {
      if (!roleForm.name.trim() || !roleForm.description.trim()) {
        toast.error('Please fill in all required fields');
        return;
      }

      await roleApi.createRole(roleForm);
      toast.success('Role created successfully');
      setShowRoleModal(false);
      setRoleForm({ name: '', description: '', permissions: [] });
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create role');
    }
  };

  const handleUpdateRole = async () => {
    try {
      if (!editingRole || !roleForm.name.trim() || !roleForm.description.trim()) {
        toast.error('Please fill in all required fields');
        return;
      }

      await roleApi.updateRole(editingRole._id, roleForm);
      toast.success('Role updated successfully');
      setShowRoleModal(false);
      setEditingRole(null);
      setRoleForm({ name: '', description: '', permissions: [] });
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update role');
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!window.confirm('Are you sure you want to delete this role? This action cannot be undone.')) {
      return;
    }

    try {
      await roleApi.deleteRole(roleId);
      toast.success('Role deleted successfully');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete role');
    }
  };

  const openRoleModal = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      setRoleForm({
        name: role.name,
        description: role.description,
        permissions: role.permissions
      });
    } else {
      setEditingRole(null);
      setRoleForm({ name: '', description: '', permissions: [] });
    }
    setShowRoleModal(true);
  };

  const handlePermissionToggle = (permissionId: string) => {
    const newPermissions = roleForm.permissions.includes(permissionId)
      ? roleForm.permissions.filter(p => p !== permissionId)
      : [...roleForm.permissions, permissionId];
    setRoleForm({ ...roleForm, permissions: newPermissions });
  };

  const getPermissionsByModule = () => {
    const permissionsByModule: { [key: string]: Permission[] } = {};
    permissions.forEach(permission => {
      if (!permissionsByModule[permission.module]) {
        permissionsByModule[permission.module] = [];
      }
      permissionsByModule[permission.module].push(permission);
    });
    return permissionsByModule;
  };

  // Check if current user is super admin
  const isSuperAdmin = user?.role === 'admin' && user?.email === 'admin@company.com';

  if (!isSuperAdmin) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-yellow-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Access Restricted</h3>
          <p className="mt-1 text-sm text-gray-500">
            Only Super Admin can access system settings.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            <h2 className="text-lg font-medium text-gray-900">System Settings</h2>
          </div>
          <span className="text-xs text-gray-500 bg-yellow-100 px-2 py-1 rounded">Super Admin Only</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('roles')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'roles'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Shield className="h-4 w-4 inline mr-2" />
            Roles
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'permissions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Key className="h-4 w-4 inline mr-2" />
            Permissions
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'roles' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">Role Management</h3>
              <button
                onClick={() => openRoleModal()}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
              >
                <UserPlus className="h-4 w-4" />
                <span>Create Role</span>
              </button>
            </div>

            <div className="grid gap-4">
              {roles.map((role) => (
                <div key={role._id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-gray-900">{role.name}</h4>
                        {role.isSystem && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">System</span>
                        )}
                        {!role.isActive && (
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">Inactive</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{role.description}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {role.permissions.length} permission(s) assigned
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openRoleModal(role)}
                        disabled={role.isSystem}
                        className="text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteRole(role._id)}
                        disabled={role.isSystem}
                        className="text-red-600 hover:text-red-800 disabled:text-gray-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'permissions' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-6">System Permissions</h3>
            
            <div className="space-y-6">
              {modules.map((module) => (
                <div key={module.key} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
                    <span>{module.icon}</span>
                    <span>{module.name}</span>
                  </h4>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {actions.map((action) => {
                      const permission = permissions.find(p => p.module === module.key && p.action === action);
                      return (
                        <div key={`${module.key}-${action}`} className="flex items-center space-x-2 text-sm">
                          <div className={`w-3 h-3 rounded ${permission ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                          <span className="capitalize">{action}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Role Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">
                {editingRole ? 'Edit Role' : 'Create Role'}
              </h3>
              <button
                onClick={() => setShowRoleModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role Name *
                </label>
                <input
                  type="text"
                  value={roleForm.name}
                  onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter role name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Enter role description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Permissions
                </label>
                
                <div className="space-y-4">
                  {Object.entries(getPermissionsByModule()).map(([moduleName, modulePermissions]) => {
                    const module = modules.find(m => m.key === moduleName);
                    return (
                      <div key={moduleName} className="border border-gray-200 rounded-lg p-3">
                        <h4 className="font-medium text-sm mb-2 flex items-center space-x-2">
                          <span>{module?.icon}</span>
                          <span>{module?.name}</span>
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {modulePermissions.map((permission) => (
                            <label key={permission._id} className="flex items-center space-x-2 text-sm">
                              <input
                                type="checkbox"
                                checked={roleForm.permissions.includes(permission._id)}
                                onChange={() => handlePermissionToggle(permission._id)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="capitalize">{permission.action}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowRoleModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={editingRole ? handleUpdateRole : handleCreateRole}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                {editingRole ? 'Update Role' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
