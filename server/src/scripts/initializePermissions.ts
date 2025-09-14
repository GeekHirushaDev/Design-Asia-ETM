import mongoose from 'mongoose';
import { config } from '../config/config.js';
import { PermissionService } from '../services/permissionService.js';
import Permission from '../models/Permission.js';
import Role from '../models/Role.js';
import User from '../models/User.js';

const initializeSystem = async () => {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Initialize permissions
    await PermissionService.initializePermissions();

    // Create default roles with permissions
    const permissions = await Permission.find();
    
    // Super Admin Role
    const superAdminPermissions = permissions.map(p => p._id);
    await Role.findOneAndUpdate(
      { name: 'super_admin' },
      {
        name: 'super_admin',
        description: 'Super Administrator with all permissions',
        permissions: superAdminPermissions,
        isSystem: true,
        isActive: true,
      },
      { upsert: true, new: true }
    );

    // Admin Role
    const adminPermissions = permissions.filter(p => 
      p.module !== 'users' || p.action !== 'delete'
    ).map(p => p._id);
    await Role.findOneAndUpdate(
      { name: 'admin' },
      {
        name: 'admin',
        description: 'Administrator with most permissions',
        permissions: adminPermissions,
        isSystem: true,
        isActive: true,
      },
      { upsert: true, new: true }
    );

    // Team Leader Role
    const teamLeaderPermissions = permissions.filter(p => 
      (p.module === 'tasks' && ['view', 'update'].includes(p.action)) ||
      (p.module === 'teams' && p.action === 'view') ||
      (p.module === 'attachments' && ['view', 'insert'].includes(p.action))
    ).map(p => p._id);
    await Role.findOneAndUpdate(
      { name: 'team_leader' },
      {
        name: 'team_leader',
        description: 'Team Leader with task management permissions',
        permissions: teamLeaderPermissions,
        isSystem: true,
        isActive: true,
      },
      { upsert: true, new: true }
    );

    // Employee Role
    const employeePermissions = permissions.filter(p => 
      (p.module === 'tasks' && ['view', 'update'].includes(p.action) && p.resource === 'assigned') ||
      (p.module === 'attachments' && p.action === 'view')
    ).map(p => p._id);
    await Role.findOneAndUpdate(
      { name: 'employee' },
      {
        name: 'employee',
        description: 'Employee with basic permissions',
        permissions: employeePermissions,
        isSystem: true,
        isActive: true,
      },
      { upsert: true, new: true }
    );

    // Update super admin user
    const superAdminRole = await Role.findOne({ name: 'super_admin' });
    await User.findOneAndUpdate(
      { email: 'admin@company.com' },
      { roleId: superAdminRole?._id },
      { new: true }
    );

    console.log('✅ Permissions and roles initialized successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    process.exit(1);
  }
};

initializeSystem();