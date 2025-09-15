import express from 'express';
import Role from '../models/Role.js';
import User from '../models/User.js';
import { authenticateToken, requireRole, requireSuperAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { createRoleSchema } from '../validation/schemas.js';
import { AuthRequest } from '../types/index.js';
import Permission from '../models/Permission.js';

const router = express.Router();

// Get all roles
router.get('/', [
  authenticateToken,
  requireSuperAdmin(),
], async (req: AuthRequest, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query as any;
    const filter: any = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [roles, total] = await Promise.all([
      Role.find(filter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(Number(limit)),
      Role.countDocuments(filter),
    ]);

    res.json({
      roles,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit),
      },
    });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Failed to get roles' });
  }
});

// Create role
router.post('/', [
  authenticateToken,
  requireSuperAdmin(),
  validate(createRoleSchema),
], async (req: AuthRequest, res) => {
  try {
    const { name, description, permissions } = req.body;
    
    const existingRole = await Role.findOne({ name });
    if (existingRole) {
      return res.status(400).json({ error: 'Role name already exists' });
    }
    
    const role = new Role({
      name,
      description,
      permissions,
      isSystem: false,
    });
    
    await role.save();
    res.status(201).json({ role });
  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

// Update role
router.put('/:roleId', [
  authenticateToken,
  requireSuperAdmin(),
], async (req: AuthRequest, res) => {
  try {
    const { roleId } = req.params;
    const { name, description, permissions } = req.body;
    
    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    if (role.isSystem) {
      return res.status(400).json({ error: 'Cannot modify system roles' });
    }
    
    // Check if name is already taken by another role
    if (name && name !== role.name) {
      const existingRole = await Role.findOne({ name, _id: { $ne: roleId } });
      if (existingRole) {
        return res.status(400).json({ error: 'Role name already exists' });
      }
    }
    
    const updatedRole = await Role.findByIdAndUpdate(
      roleId,
      { name, description, permissions },
      { new: true, runValidators: true }
    );
    
    res.json({ role: updatedRole });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Delete role
router.delete('/:roleId', [
  authenticateToken,
  requireSuperAdmin(),
], async (req: AuthRequest, res) => {
  try {
    const { roleId } = req.params;
    
    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    if (role.isSystem) {
      return res.status(400).json({ error: 'Cannot delete system roles' });
    }
    
    // Check if role is assigned to any users
    const usersWithRole = await User.countDocuments({ roleId });
    if (usersWithRole > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete role that is assigned to users',
        usersCount: usersWithRole,
      });
    }
    
    await Role.findByIdAndDelete(roleId);
    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

// Get available permissions
router.get('/permissions', [
  authenticateToken,
  requireSuperAdmin(),
], async (req: AuthRequest, res) => {
  try {
    const Permission = (await import('../models/Permission.js')).default;
    const permissions = await Permission.find().sort({ module: 1, action: 1 });
    res.json({ permissions });
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({ error: 'Failed to get permissions' });
  }
});

// Delete a permission (super admin only)
router.delete('/permissions/:permissionId', [
  authenticateToken,
  requireSuperAdmin(),
], async (req: AuthRequest, res) => {
  try {
    const { permissionId } = req.params;
    const perm = await Permission.findByIdAndDelete(permissionId);
    if (!perm) {
      res.status(404).json({ error: 'Permission not found' });
      return;
    }
    res.json({ message: 'Permission deleted successfully' });
  } catch (error) {
    console.error('Delete permission error:', error);
    res.status(500).json({ error: 'Failed to delete permission' });
  }
});

export default router;