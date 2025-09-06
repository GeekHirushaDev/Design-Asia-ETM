import express from 'express';
import {
  register,
  login,
  getMe,
  updateProfile,
  updateLocation,
  changePassword,
  forgotPassword,
  resetPassword,
  refreshToken,
} from '../controllers/authController';
import { auth, authLimiter } from '../middleware';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validation';

const router = express.Router();

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').trim().isLength({ min: 2 }).withMessage('First name must be at least 2 characters'),
  body('lastName').trim().isLength({ min: 2 }).withMessage('Last name must be at least 2 characters'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').exists().withMessage('Password is required'),
];

const changePasswordValidation = [
  body('currentPassword').exists().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
];

const forgotPasswordValidation = [
  body('email').isEmail().normalizeEmail(),
];

const resetPasswordValidation = [
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

// Routes
router.post('/register', authLimiter, validateRequest(registerValidation), register);
router.post('/login', authLimiter, validateRequest(loginValidation), login);
router.post('/refresh', refreshToken);
router.get('/me', auth, getMe);
router.put('/profile', auth, updateProfile);
router.put('/location', auth, updateLocation);
router.put('/password', auth, validateRequest(changePasswordValidation), changePassword);
router.post('/forgot-password', authLimiter, validateRequest(forgotPasswordValidation), forgotPassword);
router.put('/reset-password/:token', validateRequest(resetPasswordValidation), resetPassword);

export default router;
