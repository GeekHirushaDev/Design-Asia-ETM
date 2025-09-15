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
import { Modal } from '../Common/Modal';
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
  prefix: string;
  firstName: string;
  lastName: string;
  name: string;
  username: string;
  email: string;
  mobile: string;
  role: string;
  roleId?: string;
  status: 'active' | 'inactive';
}

export const SettingsSection: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'roles' | 'permissions' | 'users' | 'account'>('roles');
  
  // Roles state
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleQuery, setRoleQuery] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [limit, setLimit] = useState(10);
  const [rolePage, setRolePage] = useState(1);
  const [rolePages, setRolePages] = useState(1);
  const [roleLimit, setRoleLimit] = useState(10);
  const [showResetModal, setShowResetModal] = useState<{ open: boolean; userId?: string }>(() => ({ open: false }));
  const [resetPwd, setResetPwd] = useState('');
  const [resetPwd2, setResetPwd2] = useState('');
  
  // Modal states
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Form states
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    permissions: [] as string[]
  });
  
  const [userForm, setUserForm] = useState({
    prefix: 'Mr',
    firstName: '',
    lastName: '',
    username: '',
    name: '',
    email: '',
    mobile: '',
    password: '',
    roleId: '',
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
  }, [page, limit, userRoleFilter, rolePage, roleLimit, roleQuery]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesRes, permissionsRes, usersRes] = await Promise.all([
        roleApi.getRoles(),
        roleApi.getPermissions(),
        userApi.getUsers({ page, limit, role: userRoleFilter || undefined, search: userQuery || undefined })
      ]);
      
      setRoles(rolesRes.data.roles || []);
      setPermissions(permissionsRes.data.permissions || []);
      setUsers(usersRes.data.users || []);
      if (usersRes.data.pagination) {
        setPages(usersRes.data.pagination.pages || 1);
      }
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

  const handleCreateUser = async () => {
    try {
      if (!userForm.firstName.trim() || !userForm.lastName.trim() || !userForm.username.trim() || !userForm.email.trim() || !userForm.mobile.trim() || !userForm.password.trim() || !userForm.roleId) {
        toast.error('Please fill in all required fields');
        return;
      }

      await userApi.createUser(userForm);
      toast.success('User created successfully');
      setShowUserModal(false);
      setUserForm({ prefix: 'Mr', firstName: '', lastName: '', username: '', name: '', email: '', mobile: '', password: '', roleId: '' });
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create user');
    }
  };

  const handleUpdateUser = async () => {
    try {
      if (!editingUser || !userForm.firstName.trim() || !userForm.lastName.trim() || !userForm.username.trim() || !userForm.email.trim() || !userForm.mobile.trim() || !userForm.roleId) {
        toast.error('Please fill in all required fields');
        return;
      }

      const updateData: any = { ...userForm };
      if (!updateData.password) {
        updateData.password = undefined; // Don't update password if not provided
      }

      await userApi.updateUser(editingUser._id, updateData);
      toast.success('User updated successfully');
      setShowUserModal(false);
      setEditingUser(null);
      setUserForm({ prefix: 'Mr', firstName: '', lastName: '', username: '', name: '', email: '', mobile: '', password: '', roleId: '' });
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update user');
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await userApi.updateUser(userId, { status: newStatus });
      toast.success(`User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update user status');
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

  const openUserModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setUserForm({
        prefix: user.prefix,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        password: '', // Don't pre-fill password for security
        roleId: user.roleId || '',
      });
    } else {
      setEditingUser(null);
      setUserForm({ prefix: 'Mr', firstName: '', lastName: '', username: '', name: '', email: '', mobile: '', password: '', roleId: '' });
    }
    setShowUserModal(true);
  };

  const handlePermissionToggle = (permissionId: string, formType: 'role' | 'user') => {
    if (formType === 'role') {
      const newPermissions = roleForm.permissions.includes(permissionId)
        ? roleForm.permissions.filter(p => p !== permissionId)
        : [...roleForm.permissions, permissionId];
      setRoleForm({ ...roleForm, permissions: newPermissions });
    } else {
      const newPermissions = userForm.customPermissions.includes(permissionId)
        ? userForm.customPermissions.filter(p => p !== permissionId)
        : [...userForm.customPermissions, permissionId];
      setUserForm({ ...userForm, customPermissions: newPermissions });
    }
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

  const getRoleName = (roleId: string) => {
    const role = roles.find(r => r._id === roleId);
    return role?.name || 'Unknown Role';
  };

  // Check if current user is super admin
  const isSuperAdmin = (user as any)?.isSuperAdmin || user?.role === 'admin';

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
            <h2 className="text-lg font-medium text-gray-900">User Management</h2>
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
          <button
            onClick={() => setActiveTab('users')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="h-4 w-4 inline mr-2" />
            Users
          </button>
          <button
            onClick={() => setActiveTab('account')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'account'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Key className="h-4 w-4 inline mr-2" />
            Account
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <input value={roleQuery} onChange={(e) => { setRoleQuery(e.target.value); setRolePage(1); }} className="w-full border px-3 py-2 rounded" placeholder="Search roles..." />
              <div></div>
              <select value={roleLimit} onChange={(e) => { setRoleLimit(Number(e.target.value)); setRolePage(1); }} className="w-full border px-3 py-2 rounded">
                {[10,20,50].map(n => <option key={n} value={n}>{n} per page</option>)}
              </select>
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
            <div className="flex items-center justify-center gap-2 mt-4">
              <button disabled={rolePage<=1} onClick={() => setRolePage(rolePage-1)} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
              <span className="text-sm">Page {rolePage} of {rolePages}</span>
              <button disabled={rolePage>=rolePages} onClick={() => setRolePage(rolePage+1)} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
            </div>
          </div>
        )}

        {activeTab === 'account' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-6">Account</h3>
            <div className="space-y-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium mb-2">Theme</h4>
                <div className="flex items-center space-x-2">
                  <button onClick={() => document.documentElement.classList.remove('dark')} className="px-3 py-1 bg-gray-100 rounded">Light</button>
                  <button onClick={() => document.documentElement.classList.add('dark')} className="px-3 py-1 bg-gray-800 text-white rounded">Dark</button>
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium mb-2">Change Password</h4>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-login'))}
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                  Go to Change Password
                </button>
                <p className="text-xs text-gray-500 mt-2">Use "Forgot password" on the login screen or ask super admin to reset.</p>
              </div>
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {permissions.filter(p => p.module === module.key).map((permission) => (
                      <div key={permission._id} className="flex items-center justify-between text-sm px-3 py-2 bg-gray-50 rounded">
                        <span className="capitalize">{permission.action} • <span className="text-gray-500">{permission.resource}</span></span>
                        <button
                          onClick={async () => {
                            if (!window.confirm('Delete this permission?')) return;
                            try {
                              await roleApi.deletePermission(permission._id);
                              toast.success('Permission deleted');
                              loadData();
                            } catch (error: any) {
                              toast.error(error.response?.data?.error || 'Failed to delete permission');
                            }
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">User Management</h3>
              <button
                onClick={() => openUserModal()}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
              >
                <UserPlus className="h-4 w-4" />
                <span>Create User</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <input value={userQuery} onChange={(e) => { setUserQuery(e.target.value); setPage(1); }} className="w-full border px-3 py-2 rounded" placeholder="Search users by name or email..." />
              <select value={userRoleFilter} onChange={(e) => { setUserRoleFilter(e.target.value); setPage(1); }} className="w-full border px-3 py-2 rounded">
                <option value="">All roles</option>
                {roles.map(r => (
                  <option key={r._id} value={r.name}>{r.name}</option>
                ))}
              </select>
              <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} className="w-full border px-3 py-2 rounded">
                {[10,20,50].map(n => <option key={n} value={n}>{n} per page</option>)}
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{getRoleName(user.roleId || '')}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openUserModal(user)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button onClick={() => setShowResetModal({ open: true, userId: user._id })} className="text-amber-600 hover:text-amber-800">
                            <Key className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleUserStatus(user._id, user.status)}
                            className={user.status === 'active' ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}
                          >
                            {user.status === 'active' ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-center gap-2 mt-4">
              <button disabled={page<=1} onClick={() => setPage(page-1)} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
              <span className="text-sm">Page {page} of {pages}</span>
              <button disabled={page>=pages} onClick={() => setPage(page+1)} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
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
                                onChange={() => handlePermissionToggle(permission._id, 'role')}
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

    {/* Reset Password Modal */}
    <Modal
      open={showResetModal.open}
      title="Reset Password"
      onClose={() => { setShowResetModal({ open: false }); setResetPwd(''); setResetPwd2(''); }}
      size="md"
      footer={(
        <>
          <button onClick={() => { setShowResetModal({ open: false }); setResetPwd(''); setResetPwd2(''); }} className="px-3 py-2 border rounded">Cancel</button>
          <button
            onClick={async () => {
              if (!showResetModal.userId) return;
              if (!resetPwd || resetPwd.length < 6) { toast.error('Password must be at least 6 characters'); return; }
              if (resetPwd !== resetPwd2) { toast.error('Passwords do not match'); return; }
              try {
                await userApi.resetPassword(showResetModal.userId, { newPassword: resetPwd });
                toast.success('Password reset. User will be forced to change on next login.');
                setShowResetModal({ open: false }); setResetPwd(''); setResetPwd2('');
              } catch (error: any) {
                toast.error(error.response?.data?.error || 'Failed to reset password');
              }
            }}
            className="px-3 py-2 bg-blue-600 text-white rounded"
          >
            Reset
          </button>
        </>
      )}
    >
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Temporary password</label>
          <input type="password" value={resetPwd} onChange={(e) => setResetPwd(e.target.value)} className="w-full border px-3 py-2 rounded" placeholder="Enter temporary password" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Confirm password</label>
          <input type="password" value={resetPwd2} onChange={(e) => setResetPwd2(e.target.value)} className="w-full border px-3 py-2 rounded" placeholder="Re-enter temporary password" />
        </div>
        <p className="text-xs text-gray-500">Minimum 6 characters. The user will be required to change it at next login.</p>
      </div>
    </Modal>

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">
                {editingUser ? 'Edit User' : 'Create User'}
              </h3>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prefix *
                </label>
                <select
                  value={userForm.prefix}
                  onChange={(e) => setUserForm({ ...userForm, prefix: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Mr">Mr</option>
                  <option value="Mrs">Mrs</option>
                  <option value="Miss">Miss</option>
                  <option value="Dr">Dr</option>
                  <option value="Prof">Prof</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={userForm.firstName}
                    onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value, name: `${e.target.value} ${userForm.lastName}` })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter first name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={userForm.lastName}
                    onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value, name: `${userForm.firstName} ${e.target.value}` })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value.toLowerCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter username"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Only letters, numbers, and underscores allowed
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter email address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  value={userForm.mobile}
                  onChange={(e) => setUserForm({ ...userForm, mobile: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter mobile number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {editingUser ? '' : '*'}
                </label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={editingUser ? "Leave blank to keep current password" : "Enter password"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  value={userForm.roleId}
                  onChange={(e) => setUserForm({ ...userForm, roleId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a role</option>
                  {roles.filter(role => role.isActive).map((role) => (
                    <option key={role._id} value={role._id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowUserModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={editingUser ? handleUpdateUser : handleCreateUser}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                {editingUser ? 'Update User' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
