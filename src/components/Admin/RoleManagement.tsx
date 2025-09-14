import React, { useState, useEffect } from 'react';
import { Shield, Plus, Edit, Trash2, Save, X, Users, Settings } from 'lucide-react';
import { roleApi } from '../../lib/api';
import toast from 'react-hot-toast';

interface Permission {
  _id: string;
  name: string;
  description: string;
  module: string;
  action: string;
  resource: string;
}

interface Role {
  _id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
}

const RoleModal: React.FC<{
  role?: Role | null;
  permissions: Permission[];
  onClose: () => void;
  onSuccess: () => void;
}> = ({ role, permissions, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: role?.name || '',
    description: role?.description || '',
    permissions: role?.permissions?.map(p => p._id) || [],
    isActive: role?.isActive ?? true,
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Role name is required');
      return;
    }

    try {
      setIsLoading(true);
      
      if (role) {
        await roleApi.updateRole(role._id, formData);
        toast.success('Role updated successfully');
      } else {
        await roleApi.createRole(formData);
        toast.success('Role created successfully');
      }
      
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save role');
    } finally {
      setIsLoading(false);
    }
  };

  const groupedPermissions = permissions.reduce((groups, permission) => {
    if (!groups[permission.module]) {
      groups[permission.module] = [];
    }
    groups[permission.module].push(permission);
    return groups;
  }, {} as { [key: string]: Permission[] });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-semibold">
            {role ? 'Edit Role' : 'Create New Role'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter role name"
                  required
                  disabled={role?.isSystem}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.isActive ? 'active' : 'inactive'}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={role?.isSystem}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
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
                placeholder="Enter role description"
                disabled={role?.isSystem}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Permissions
              </label>
              <div className="space-y-4 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-4">
                {Object.entries(groupedPermissions).map(([module, modulePermissions]) => (
                  <div key={module} className="space-y-2">
                    <h4 className="font-medium text-gray-900 capitalize">{module}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {modulePermissions.map((permission) => (
                        <label key={permission._id} className="flex items-start space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions.includes(permission._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  permissions: [...formData.permissions, permission._id]
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  permissions: formData.permissions.filter(id => id !== permission._id)
                                });
                              }
                            }}
                            className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            disabled={role?.isSystem}
                          />
                          <div className="flex-1 min-w-0">
                            <span className="block text-sm font-medium text-gray-900">
                              {permission.action} {permission.resource}
                            </span>
                            <span className="block text-xs text-gray-500">
                              {permission.description}
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
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
                disabled={isLoading || role?.isSystem}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <>
                    <Save size={16} className="mr-2" />
                    {role ? 'Update Role' : 'Create Role'}
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

export const RoleManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesResponse, permissionsResponse] = await Promise.all([
        roleApi.getRoles(),
        roleApi.getPermissions()
      ]);
      
      setRoles(rolesResponse.data.roles || []);
      setPermissions(permissionsResponse.data.permissions || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load roles and permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    
    try {
      await roleApi.deleteRole(roleId);
      toast.success('Role deleted successfully');
      await loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete role');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Shield className="text-blue-600" size={24} />
          <div>
            <h2 className="text-xl font-bold text-gray-900">Role Management</h2>
            <p className="text-gray-600">Manage user roles and permissions</p>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingRole(null);
            setShowRoleModal(true);
          }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} className="mr-2" />
          Add Role
        </button>
      </div>

      {roles.length === 0 ? (
        <div className="text-center py-12">
          <Shield size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No roles found</h3>
          <p className="text-gray-500 mb-4">Create your first role to get started</p>
          <button
            onClick={() => {
              setEditingRole(null);
              setShowRoleModal(true);
            }}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={16} className="mr-2" />
            Create Role
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((role) => (
            <div key={role._id} className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">{role.name}</h3>
                    {role.isSystem && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        System
                      </span>
                    )}
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    role.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {role.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {!role.isSystem && (
                  <div className="flex items-center space-x-1 ml-2">
                    <button
                      onClick={() => {
                        setEditingRole(role);
                        setShowRoleModal(true);
                      }}
                      className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-white"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteRole(role._id)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-white"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              {role.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{role.description}</p>
              )}

              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <Settings size={14} className="mr-2 flex-shrink-0" />
                  <span>{role.permissions?.length || 0} permission{(role.permissions?.length || 0) !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Users size={14} className="mr-2 flex-shrink-0" />
                  <span>Created {new Date(role.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {role.permissions && role.permissions.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <div className="text-xs text-gray-500 mb-2">Permissions:</div>
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.slice(0, 3).map((permission) => (
                      <span key={permission._id} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {permission.module}:{permission.action}
                      </span>
                    ))}
                    {role.permissions.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        +{role.permissions.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showRoleModal && (
        <RoleModal
          role={editingRole}
          permissions={permissions}
          onClose={() => {
            setShowRoleModal(false);
            setEditingRole(null);
          }}
          onSuccess={() => {
            setShowRoleModal(false);
            setEditingRole(null);
            loadData();
          }}
        />
      )}
    </div>
  );
};