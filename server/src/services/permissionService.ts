import Permission from '../models/Permission.js';
import Role from '../models/Role.js';
import User from '../models/User.js';

export class PermissionService {
  /**
   * Check if user has specific permission
   */
  static async hasPermission(userId: string, module: string, action: string, resource: string): Promise<boolean> {
    try {
      const user = await User.findById(userId).populate('roleId customPermissions');
      if (!user) return false;

      // Super admin has all permissions
      if (user.role === 'admin' && user.email === 'admin@company.com') {
        return true;
      }

      // Check custom permissions first
      if (user.customPermissions) {
        const hasCustomPermission = user.customPermissions.some((perm: any) => 
          perm.module === module && perm.action === action && perm.resource === resource
        );
        if (hasCustomPermission) return true;
      }

      // Check role permissions
      if (user.roleId) {
        const role = await Role.findById(user.roleId).populate('permissions');
        if (role && role.isActive) {
          const hasRolePermission = role.permissions.some((perm: any) => 
            perm.module === module && perm.action === action && perm.resource === resource
          );
          if (hasRolePermission) return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }

  /**
   * Get all permissions for a user
   */
  static async getUserPermissions(userId: string): Promise<string[]> {
    try {
      const user = await User.findById(userId)
        .populate('roleId')
        .populate('customPermissions');
      
      if (!user) return [];

      const permissions: string[] = [];

      // Add role permissions
      if (user.roleId) {
        const role = await Role.findById(user.roleId).populate('permissions');
        if (role && role.isActive) {
          role.permissions.forEach((perm: any) => {
            permissions.push(`${perm.module}:${perm.action}:${perm.resource}`);
          });
        }
      }

      // Add custom permissions
      if (user.customPermissions) {
        user.customPermissions.forEach((perm: any) => {
          permissions.push(`${perm.module}:${perm.action}:${perm.resource}`);
        });
      }

      return [...new Set(permissions)]; // Remove duplicates
    } catch (error) {
      console.error('Get user permissions error:', error);
      return [];
    }
  }

  /**
   * Initialize default permissions
   */
  static async initializePermissions(): Promise<void> {
    const defaultPermissions = [
      // Task permissions
      { name: 'tasks:view:all', description: 'View all tasks', module: 'tasks', action: 'view', resource: 'all' },
      { name: 'tasks:view:assigned', description: 'View assigned tasks', module: 'tasks', action: 'view', resource: 'assigned' },
      { name: 'tasks:insert:all', description: 'Create tasks', module: 'tasks', action: 'insert', resource: 'all' },
      { name: 'tasks:update:all', description: 'Update all tasks', module: 'tasks', action: 'update', resource: 'all' },
      { name: 'tasks:update:assigned', description: 'Update assigned tasks', module: 'tasks', action: 'update', resource: 'assigned' },
      { name: 'tasks:delete:all', description: 'Delete tasks', module: 'tasks', action: 'delete', resource: 'all' },

      // User permissions
      { name: 'users:view:all', description: 'View all users', module: 'users', action: 'view', resource: 'all' },
      { name: 'users:insert:all', description: 'Create users', module: 'users', action: 'insert', resource: 'all' },
      { name: 'users:update:all', description: 'Update users', module: 'users', action: 'update', resource: 'all' },
      { name: 'users:delete:all', description: 'Delete users', module: 'users', action: 'delete', resource: 'all' },

      // Team permissions
      { name: 'teams:view:all', description: 'View all teams', module: 'teams', action: 'view', resource: 'all' },
      { name: 'teams:insert:all', description: 'Create teams', module: 'teams', action: 'insert', resource: 'all' },
      { name: 'teams:update:all', description: 'Update teams', module: 'teams', action: 'update', resource: 'all' },
      { name: 'teams:delete:all', description: 'Delete teams', module: 'teams', action: 'delete', resource: 'all' },

      // Location permissions
      { name: 'locations:view:all', description: 'View all locations', module: 'locations', action: 'view', resource: 'all' },
      { name: 'locations:insert:all', description: 'Create locations', module: 'locations', action: 'insert', resource: 'all' },
      { name: 'locations:update:all', description: 'Update locations', module: 'locations', action: 'update', resource: 'all' },
      { name: 'locations:delete:all', description: 'Delete locations', module: 'locations', action: 'delete', resource: 'all' },

      // Attachment permissions
      { name: 'attachments:view:all', description: 'View all attachments', module: 'attachments', action: 'view', resource: 'all' },
      { name: 'attachments:insert:all', description: 'Upload attachments', module: 'attachments', action: 'insert', resource: 'all' },
      { name: 'attachments:delete:all', description: 'Delete attachments', module: 'attachments', action: 'delete', resource: 'all' },

      // Report permissions
      { name: 'reports:view:all', description: 'View all reports', module: 'reports', action: 'view', resource: 'all' },
      { name: 'reports:insert:all', description: 'Generate reports', module: 'reports', action: 'insert', resource: 'all' },
    ];

    for (const permData of defaultPermissions) {
      await Permission.findOneAndUpdate(
        { name: permData.name },
        permData,
        { upsert: true, new: true }
      );
    }

    console.log('✅ Default permissions initialized');
  }
}