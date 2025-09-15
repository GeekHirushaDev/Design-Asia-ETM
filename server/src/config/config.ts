import dotenv from 'dotenv';

dotenv.config();

export const config = {
  PORT: process.env.PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://nityaanantharaman187_db_user:UiWYPrNdKMOFU7AF@cluster0.xjhfpcd.mongodb.net/taskmanager',
  JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  DEFAULT_TIMEZONE: process.env.DEFAULT_TIMEZONE || 'Asia/Colombo',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  EMAIL_USER: process.env.EMAIL_USER || 'geekhirusha@gmail.com',
  EMAIL_PASS: process.env.EMAIL_PASS || 'conkfhleceskmgwc',
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || 'taskflow-uploads',
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || '',
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || '',
  VAPID_EMAIL: process.env.VAPID_EMAIL || 'geekhirusha@gmail.com',
  SUPER_ADMIN_USERNAME: process.env.SUPER_ADMIN_USERNAME || 'owner',
  PASSWORD_STRICT_POLICY: (process.env.PASSWORD_STRICT_POLICY || 'false').toLowerCase() === 'true',
} as const;