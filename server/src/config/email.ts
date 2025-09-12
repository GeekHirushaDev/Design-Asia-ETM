import nodemailer from 'nodemailer';
import { config } from './config.js';

export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: config.EMAIL_USER,
    pass: config.EMAIL_PASS,
  },
});

export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    const info = await transporter.sendMail({
      from: `"TaskFlow" <${config.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
};

export const emailTemplates = {
  emailVerification: (name: string, token: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Welcome to TaskFlow!</h2>
      <p>Hi ${name},</p>
      <p>Please verify your email address by clicking the button below:</p>
      <a href="${config.CLIENT_URL}/verify-email?token=${token}" 
         style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
        Verify Email
      </a>
      <p>If you didn't create this account, please ignore this email.</p>
      <p>Best regards,<br>TaskFlow Team</p>
    </div>
  `,
  
  passwordReset: (name: string, token: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Password Reset Request</h2>
      <p>Hi ${name},</p>
      <p>You requested to reset your password. Click the button below to set a new password:</p>
      <a href="${config.CLIENT_URL}/reset-password?token=${token}" 
         style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
        Reset Password
      </a>
      <p>This link will expire in 1 hour. If you didn't request this, please ignore this email.</p>
      <p>Best regards,<br>TaskFlow Team</p>
    </div>
  `,
};