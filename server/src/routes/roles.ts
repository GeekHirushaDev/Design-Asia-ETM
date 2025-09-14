import express from 'express';
import Role from '../models/Role.js';
import User from '../models/User.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { createRoleSchema } from '../validation/schemas.js';
import { AuthRequest } from '../types/index.js';

const router = express.Router();

// Get all roles
router.get('/', [
  authenticateToken,
  requireRole('admin'),
], async (req: AuthRequest, res) => {
  try {
    const roles = await Role.find().sort({ name: 1 });
    res.json({ roles });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Failed to get roles' });
  }
});

// Create role
router.post('/', [
  authenticateToken,
  requireRole('admin'),
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
  requireRole('admin'),
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
  requireRole('admin'),
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
  requireRole('admin'),
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

export default router;