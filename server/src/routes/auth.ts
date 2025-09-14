import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import Session from '../models/Session.js';
import Device from '../models/Device.js';
import { config } from '../config/config.js';
import { authenticateToken } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../validation/schemas.js';
import { EmailService } from '../services/emailService.js';
import { AuthRequest } from '../types/index.js';

const router = express.Router();

const generateTokens = (userId: string, deviceId: string) => {
  const accessToken = jwt.sign({ userId }, config.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId, deviceId }, config.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

const getDeviceInfo = (req: express.Request) => {
  const userAgent = req.get('User-Agent') || '';
  const deviceId = req.get('X-Device-ID') || crypto.randomUUID();
  
  let deviceType: 'mobile' | 'desktop' | 'tablet' = 'desktop';
  if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
    deviceType = /iPad|tablet/i.test(userAgent) ? 'tablet' : 'mobile';
  }
  
  return {
    deviceId,
    deviceType,
    deviceName: userAgent.split(' ')[0] || 'Unknown Device',
    userAgent,
    ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
  };
};

// Register
router.post('/register', validate(registerSchema), async (req, res): Promise<void> => {
  try {
    const { name, email, password, role = 'employee' } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ error: 'Email already registered' });
      return;
    }

    const user = new User({ name, email, password, role, emailVerified: false });
    await user.save();

    const deviceInfo = getDeviceInfo(req);
    const tokens = generateTokens(user._id, deviceInfo.deviceId);
    
    // Create device record
    const device = new Device({
      userId: user._id,
      ...deviceInfo,
    });
    await device.save();
    
    // Create session
    const session = new Session({
      userId: user._id,
      deviceId: deviceInfo.deviceId,
      refreshToken: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });
    await session.save();
    
    user.lastLoginAt = new Date();
    await user.save();

    // Send verification email
    try {
      await EmailService.sendVerificationEmail(user._id, email, name);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
    }

    res.status(201).json({
      message: 'User registered successfully',
      user,
      ...tokens,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', validate(loginSchema), async (req, res): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (user.status !== 'active') {
      res.status(401).json({ error: 'Account is inactive' });
      return;
    }

    const deviceInfo = getDeviceInfo(req);
    const tokens = generateTokens(user._id, deviceInfo.deviceId);
    
    // Update or create device
    await Device.findOneAndUpdate(
      { userId: user._id, deviceId: deviceInfo.deviceId },
      { ...deviceInfo, lastSeen: new Date(), isOnline: true },
      { upsert: true }
    );
    
    // Create new session
    const session = new Session({
      userId: user._id,
      deviceId: deviceInfo.deviceId,
      refreshToken: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });
    await session.save();
    
    user.lastLoginAt = new Date();
    await user.save();

    res.json({
      message: 'Login successful',
      user,
      ...tokens,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Forgot password
router.post('/forgot-password', validate(forgotPasswordSchema), async (req, res): Promise<void> => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists
      res.json({ message: 'If the email exists, a reset link has been sent' });
      return;
    }
    
    await EmailService.sendPasswordResetEmail(email);
    
    res.json({ message: 'If the email exists, a reset link has been sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Reset password
router.post('/reset-password', validate(resetPasswordSchema), async (req, res): Promise<void> => {
  try {
    const { token, password } = req.body;
    
    const userId = await EmailService.consumePasswordResetToken(token);
    const user = await User.findById(userId);
    
    if (!user) {
      res.status(400).json({ error: 'Invalid token' });
      return;
    }
    
    user.password = password;
    await user.save();
    
    // Revoke all sessions for security
    await Session.updateMany(
      { userId: user._id },
      { isActive: false, revokedAt: new Date(), revokedBy: 'password_reset' }
    );
    
    res.json({ message: 'Password reset successfully' });
  } catch (error: any) {
    if (error.message === 'Invalid or expired token') {
      res.status(400).json({ error: 'Invalid or expired token' });
      return;
    }
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Verify email
router.post('/verify-email', async (req, res): Promise<void> => {
  try {
    const { token } = req.body;
    
    if (!token) {
      res.status(400).json({ error: 'Token is required' });
      return;
    }
    
    const userId = await EmailService.verifyEmailToken(token);
    
    res.json({ message: 'Email verified successfully' });
  } catch (error: any) {
    if (error.message === 'Invalid or expired token') {
      res.status(400).json({ error: 'Invalid or expired token' });
      return;
    }
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

// Refresh token
router.post('/refresh', async (req, res): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(401).json({ error: 'Refresh token required' });
      return;
    }

    const decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as { userId: string; deviceId: string };
    
    // Check if session is active
    const session = await Session.findOne({
      refreshToken,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });
    
    if (!session) {
      res.status(401).json({ error: 'Invalid session' });
      return;
    }
    
    const user = await User.findById(decoded.userId);

    if (!user || user.status !== 'active') {
      res.status(401).json({ error: 'Invalid user' });
      return;
    }

    const tokens = generateTokens(user._id, decoded.deviceId);
    
    // Update session with new refresh token
    session.refreshToken = tokens.refreshToken;
    session.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await session.save();
    
    // Update device last seen
    await Device.findOneAndUpdate(
      { userId: user._id, deviceId: decoded.deviceId },
      { lastSeen: new Date(), isOnline: true }
    );

    res.json({
      message: 'Token refreshed',
      ...tokens,
    });
  } catch (error) {
    res.status(403).json({ error: 'Invalid refresh token' });
  }
});

// Logout
router.post('/logout', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      await Session.findOneAndUpdate(
        { refreshToken },
        { isActive: false, revokedAt: new Date(), revokedBy: 'user_logout' }
      );
    }
    
    // Mark device as offline
    const deviceId = req.get('X-Device-ID');
    if (deviceId) {
      await Device.findOneAndUpdate(
        { userId: req.user?._id, deviceId },
        { isOnline: false, lastSeen: new Date() }
      );
    }
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Get user sessions
router.get('/sessions', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const sessions = await Session.find({
      userId: req.user?._id,
      isActive: true,
    }).populate({
      path: 'deviceId',
      model: 'Device',
      select: 'deviceType deviceName lastSeen isOnline',
    });
    
    res.json({ sessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

// Revoke session
router.delete('/sessions/:sessionId', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { sessionId } = req.params;
    
    const session = await Session.findOneAndUpdate(
      { _id: sessionId, userId: req.user?._id },
      { isActive: false, revokedAt: new Date(), revokedBy: 'user_revoke' },
      { new: true }
    );
    
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    
    res.json({ message: 'Session revoked successfully' });
  } catch (error) {
    console.error('Revoke session error:', error);
    res.status(500).json({ error: 'Failed to revoke session' });
  }
});

// Get current user
router.get('/me', authenticateToken, (req: AuthRequest, res) => {
  res.json({ user: req.user });
});

export default router;