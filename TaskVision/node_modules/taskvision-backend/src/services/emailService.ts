import nodemailer from 'nodemailer';
import { IUser } from '../shared/types';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'geekhirusha@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'conkfhleceskmgwc',
  },
});

/**
 * Send welcome email to newly registered user
 */
export const sendWelcomeEmail = async (user: IUser): Promise<void> => {
  try {
    const mailOptions = {
      from: 'TaskVision <geekhirusha@gmail.com>',
      to: user.email,
      subject: 'Welcome to TaskVision',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #0284c7;">Welcome to TaskVision</h1>
          </div>
          
          <p>Hello ${user.firstName},</p>
          
          <p>Thank you for registering with TaskVision! We're excited to have you on board.</p>
          
          <p>Your account has been successfully created. Here are your login details:</p>
          
          <ul>
            <li><strong>Email:</strong> ${user.email}</li>
            <li><strong>Role:</strong> ${user.role}</li>
          </ul>
          
          <p>You can now log in to your account and start using our task management system.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" 
               style="background-color: #0284c7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Login to Your Account
            </a>
          </div>
          
          <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
          
          <p>Best regards,<br>The TaskVision Team</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666;">
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${user.email}`);
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    // Don't throw the error, just log it - we don't want email failures to break registration
  }
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (user: IUser, resetToken: string): Promise<void> => {
  try {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
    
    const mailOptions = {
      from: 'TaskVision <geekhirusha@gmail.com>',
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #0284c7;">Password Reset Request</h1>
          </div>
          
          <p>Hello ${user.firstName},</p>
          
          <p>We received a request to reset your password. To proceed with the password reset, please click the button below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #0284c7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Reset Your Password
            </a>
          </div>
          
          <p>This link will expire in 1 hour for security reasons.</p>
          
          <p>If you did not request a password reset, please ignore this email or contact our support team if you have concerns.</p>
          
          <p>Best regards,<br>The TaskVision Team</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666;">
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to ${user.email}`);
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    // Log error but don't break the flow
  }
};

/**
 * Send task assignment notification email
 */
export const sendTaskAssignmentEmail = async (user: IUser, taskTitle: string, taskId: string): Promise<void> => {
  try {
    const taskUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/tasks/${taskId}`;
    
    const mailOptions = {
      from: 'TaskVision <geekhirusha@gmail.com>',
      to: user.email,
      subject: 'New Task Assignment',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #0284c7;">New Task Assignment</h1>
          </div>
          
          <p>Hello ${user.firstName},</p>
          
          <p>You have been assigned a new task:</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h2 style="color: #0284c7; margin-top: 0;">${taskTitle}</h2>
          </div>
          
          <p>Please click the button below to view the task details and start working on it:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${taskUrl}" 
               style="background-color: #0284c7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              View Task Details
            </a>
          </div>
          
          <p>Best regards,<br>The TaskVision Team</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666;">
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Task assignment email sent to ${user.email}`);
  } catch (error) {
    console.error('❌ Error sending task assignment email:', error);
  }
};
