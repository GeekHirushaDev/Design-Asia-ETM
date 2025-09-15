import express from 'express';
import User from '../models/User.js';
import Role from '../models/Role.js';
import { authenticateToken, requireRole, requireSuperAdmin } from '../middleware/auth.js';
import { config } from '../config/config.js';
import { validate } from '../middleware/validation.js';
import { AuthRequest } from '../types/index.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Get all users (super admin only)
router.get('/', authenticateToken, requireSuperAdmin(), async (req: AuthRequest, res) => {
  try {
    const { page = 1, limit = 20, role, status, search } = req.query;
    const filter: any = {};

    if (role) filter.role = role;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await User.countDocuments(filter);

    res.json({
      users,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit),
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create new user (super admin only)
router.post('/', authenticateToken, requireSuperAdmin(), async (req: AuthRequest, res) => {
  try {
    const { prefix, firstName, lastName, username, email, mobile, password, role = 'employee', roleId } = req.body;

    // Validation
    if (!prefix || !firstName || !lastName || !username || !email || !mobile || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Combine first and last name for the name field
    const fullName = `${firstName} ${lastName}`;

    // If roleId provided, derive role name from Role document
    let resolvedRole = role;
    let resolvedRoleId = undefined as any;
    if (roleId) {
      const roleDoc = await Role.findById(roleId);
      if (!roleDoc) {
        return res.status(400).json({ error: 'Invalid roleId' });
      }
      resolvedRole = roleDoc.name;
      resolvedRoleId = roleDoc._id;
    }

    // Create user
    const newUser = new User({
      prefix,
      firstName,
      lastName,
      name: fullName,
      username,
      email,
      mobile,
      password: hashedPassword,
      role: resolvedRole,
      roleId: resolvedRoleId,
      status: 'active'
    });

    await newUser.save();

    // Return user without password
    const userResponse = newUser.toObject();
    const { password: _, ...userWithoutPassword } = userResponse;

    res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Get user by ID (super admin only)
router.get('/:userId', authenticateToken, requireSuperAdmin(), async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user (super admin only)
router.put('/:userId', authenticateToken, requireSuperAdmin(), async (req: AuthRequest, res) => {
  try {
    const { prefix, firstName, lastName, username, email, mobile, role, status, roleId } = req.body;
    const userId = req.params.userId;

    // Check if username is already taken by another user
    if (username) {
      const existingUsername = await User.findOne({ username, _id: { $ne: userId } });
      if (existingUsername) {
        return res.status(400).json({ error: 'Username already taken by another user' });
      }
    }

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already taken by another user' });
      }
    }

    const updateData: any = {};
    if (prefix) updateData.prefix = prefix;
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (firstName && lastName) updateData.name = `${firstName} ${lastName}`;
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (mobile) updateData.mobile = mobile;
    if (role) updateData.role = role;
    if (roleId) updateData.roleId = roleId;
    if (status) updateData.status = status;

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (super admin only)
router.delete('/:userId', authenticateToken, requireSuperAdmin(), async (req: AuthRequest, res) => {
  try {
    const userId = req.params.userId;

    // Prevent admin from deleting themselves
    if (userId === req.user?._id.toString()) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const targetUser = await User.findById(userId);
    if (targetUser && (targetUser.username === config.SUPER_ADMIN_USERNAME || (targetUser as any).isSuperAdmin)) {
      return res.status(400).json({ error: 'Cannot delete the super admin account' });
    }

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Reset user password (super admin only)
router.post('/:userId/reset-password', authenticateToken, requireSuperAdmin(), async (req: AuthRequest, res) => {
  try {
    const { newPassword } = req.body;
    const userId = req.params.userId;

    const targetUser = await User.findById(userId);
    if (targetUser && (targetUser.username === config.SUPER_ADMIN_USERNAME || (targetUser as any).isSuperAdmin)) {
      return res.status(400).json({ error: 'Cannot reset password for super admin via API' });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const user = await User.findByIdAndUpdate(
      userId,
      { password: hashedPassword, mustChangePassword: true },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Revoke all active sessions so the user must log in again
    const Session = (await import('../models/Session.js')).default;
    await Session.updateMany(
      { userId: user._id, isActive: true },
      { isActive: false, revokedAt: new Date(), revokedBy: 'admin_password_reset' }
    );

    res.json({ message: 'Password reset successfully. User will be required to change it on next login.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;