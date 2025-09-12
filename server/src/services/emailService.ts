import crypto from 'crypto';
import { sendEmail, emailTemplates } from '../config/email.js';
import { redis } from '../config/redis.js';
import User from '../models/User.js';

export class EmailService {
  static async sendVerificationEmail(userId: string, email: string, name: string) {
    const token = crypto.randomBytes(32).toString('hex');
    
    // Store token in Redis with 24h expiry
    await redis.setEx(`email_verify:${token}`, 86400, userId);
    
    const html = emailTemplates.emailVerification(name, token);
    await sendEmail(email, 'Verify your email - TaskFlow', html);
    
    return token;
  }
  
  static async sendPasswordResetEmail(email: string) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('User not found');
    }
    
    const token = crypto.randomBytes(32).toString('hex');
    
    // Store token in Redis with 1h expiry
    await redis.setEx(`password_reset:${token}`, 3600, user._id.toString());
    
    const html = emailTemplates.passwordReset(user.name, token);
    await sendEmail(email, 'Reset your password - TaskFlow', html);
    
    return token;
  }
  
  static async verifyEmailToken(token: string) {
    const userId = await redis.get(`email_verify:${token}`);
    if (!userId) {
      throw new Error('Invalid or expired token');
    }
    
    await User.findByIdAndUpdate(userId, { emailVerified: true });
    await redis.del(`email_verify:${token}`);
    
    return userId;
  }
  
  static async verifyPasswordResetToken(token: string) {
    const userId = await redis.get(`password_reset:${token}`);
    if (!userId) {
      throw new Error('Invalid or expired token');
    }
    
    return userId;
  }
  
  static async consumePasswordResetToken(token: string) {
    const userId = await this.verifyPasswordResetToken(token);
    await redis.del(`password_reset:${token}`);
    return userId;
  }
}