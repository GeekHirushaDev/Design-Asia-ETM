import { Router } from 'express';
import {
  register,
  login,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword,
  logout
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and authorization endpoints
 */

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.use(authenticate); // All routes below require authentication

router.get('/me', getMe);
router.patch('/change-password', changePassword);
router.post('/logout', logout);

export default router;
