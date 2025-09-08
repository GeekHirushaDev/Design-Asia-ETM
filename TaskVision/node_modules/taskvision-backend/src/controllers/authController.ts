import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/User';
import { asyncHandler, createError, createValidationError, createAuthError, createNotFoundError } from '../middleware/errorHandler';
import { LoginRequest, RegisterRequest, AuthResponse, ResetPasswordRequest, ConfirmResetPasswordRequest, ChangePasswordRequest } from '@shared/types/api';

/**
 * Generate JWT token
 */
const generateToken = (userId: string, email: string, role: string): string => {
  const jwtSecret = process.env.JWT_SECRET;
  const jwtExpire = process.env.JWT_EXPIRE || '7d';

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign(
    { userId, email, role },
    jwtSecret,
    { expiresIn: jwtExpire }
  );
};

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               department:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     token:
 *                       type: string
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already exists
 */
export const register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password, firstName, lastName, phone, department }: RegisterRequest = req.body;

  // Check if required fields are provided
  if (!email || !password || !firstName || !lastName) {
    throw createValidationError('Email, password, first name, and last name are required');
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw createError('Email already registered', 409, 'DUPLICATE_ERROR', 'email');
  }

  // Create new user
  const user = await User.create({
    email: email.toLowerCase(),
    password,
    firstName,
    lastName,
    phone,
    department
  });

  // Generate token
  const token = generateToken(user._id!.toString(), user.email, user.role);

  // Prepare response
  const authResponse: AuthResponse = {
    user: {
      id: user._id!.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      avatar: user.avatar,
      department: user.department
    },
    token
  };

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: authResponse
  });
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     token:
 *                       type: string
 *       400:
 *         description: Invalid credentials
 *       401:
 *         description: Authentication failed
 */
export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password }: LoginRequest = req.body;

  // Check if email and password are provided
  if (!email || !password) {
    throw createValidationError('Email and password are required');
  }

  // Find user and include password field
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  
  if (!user) {
    throw createAuthError('Invalid email or password');
  }

  // Check if account is active
  if (!user.isActive) {
    throw createAuthError('Account is deactivated. Please contact administrator.');
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw createAuthError('Invalid email or password');
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Generate token
  const token = generateToken(user._id!.toString(), user.email, user.role);

  // Prepare response
  const authResponse: AuthResponse = {
    user: {
      id: user._id!.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      avatar: user.avatar,
      department: user.department
    },
    token
  };

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: authResponse
  });
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Authentication required
 */
export const getMe = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw createAuthError('Authentication required');
  }

  const user = await User.findById(req.user.id);
  
  if (!user) {
    throw createNotFoundError('User not found');
  }

  res.status(200).json({
    success: true,
    message: 'User profile retrieved successfully',
    data: user
  });
});

/**
 * @swagger
 * /api/auth/change-password:
 *   patch:
 *     summary: Change user password
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Current password is incorrect
 */
export const changePassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw createAuthError('Authentication required');
  }

  const { currentPassword, newPassword }: ChangePasswordRequest = req.body;

  if (!currentPassword || !newPassword) {
    throw createValidationError('Current password and new password are required');
  }

  if (newPassword.length < 6) {
    throw createValidationError('New password must be at least 6 characters long');
  }

  // Find user with password
  const user = await User.findById(req.user.id).select('+password');
  
  if (!user) {
    throw createNotFoundError('User not found');
  }

  // Verify current password
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    throw createAuthError('Current password is incorrect');
  }

  // Update password
  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password changed successfully'
  });
});

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Password reset email sent
 *       404:
 *         description: Email not found
 */
export const forgotPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email }: ResetPasswordRequest = req.body;

  if (!email) {
    throw createValidationError('Email is required');
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  
  if (!user) {
    throw createNotFoundError('No user found with that email address');
  }

  if (!user.isActive) {
    throw createAuthError('Account is deactivated. Please contact administrator.');
  }

  // Generate reset token
  const resetToken = user.generateResetToken();
  await user.save();

  // TODO: Send email with reset token
  // For now, we'll just return the token (in production, this should be sent via email)
  
  res.status(200).json({
    success: true,
    message: 'Password reset instructions sent to email',
    // Remove this in production - only for development
    ...(process.env.NODE_ENV === 'development' && { resetToken })
  });
});

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 */
export const resetPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { token, newPassword }: ConfirmResetPasswordRequest = req.body;

  if (!token || !newPassword) {
    throw createValidationError('Token and new password are required');
  }

  if (newPassword.length < 6) {
    throw createValidationError('Password must be at least 6 characters long');
  }

  // Hash token and find user
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() }
  }).select('+resetPasswordToken +resetPasswordExpire');

  if (!user) {
    throw createError('Invalid or expired password reset token', 400, 'VALIDATION_ERROR');
  }

  // Update password and clear reset token
  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password reset successful'
  });
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user (client-side token removal)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
export const logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Since we're using stateless JWT tokens, logout is handled client-side
  // In a production app, you might want to implement a token blacklist
  
  res.status(200).json({
    success: true,
    message: 'Logout successful'
  });
});
