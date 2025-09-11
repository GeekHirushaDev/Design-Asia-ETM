import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/taskvision',
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret-key',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5176',
};

export default config;
