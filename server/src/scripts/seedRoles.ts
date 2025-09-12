import mongoose from 'mongoose';
import { config } from '../config/config.js';
import Role from '../models/Role.js';

const seedRoles = async () => {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing roles
    await Role.deleteMany({ isSystem: true });

    // Create system roles
    const systemRoles = [
      {
        name: 'admin',
        description: 'Full system administrator with all permissions',
        permissions: [
          'tasks:create', 'tasks:read', 'tasks:update', 'tasks:delete', 'tasks:assign',
          'users:create', 'users:read', 'users:update', 'users:delete',
          'reports:create', 'reports:read', 'reports:download',
          'attendance:read', 'attendance:manage',
          'tracking:read', 'tracking:manage',
          'roles:create', 'roles:read', 'roles:update', 'roles:delete',
          'system:admin', 'system:settings'
        ],
        isSystem: true,
      },
      {
        name: 'employee',
        description: 'Standard employee with basic permissions',
        permissions: [
          'tasks:read', 'tasks:update',
          'attendance:read',
          'tracking:read'
        ],
        isSystem: true,
      },
      {
        name: 'manager',
        description: 'Team manager with extended permissions',
        permissions: [
          'tasks:create', 'tasks:read', 'tasks:update', 'tasks:assign',
          'users:read',
          'reports:read', 'reports:download',
          'attendance:read', 'attendance:manage',
          'tracking:read'
        ],
        isSystem: true,
      },
    ];

    for (const roleData of systemRoles) {
      const role = new Role(roleData);
      await role.save();
    }

    console.log('✅ System roles created successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Role seeding failed:', error);
    process.exit(1);
  }
};

seedRoles();