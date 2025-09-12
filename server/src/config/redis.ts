import Redis from 'redis';
import { config } from './config.js';

export const redis = Redis.createClient({
  url: config.REDIS_URL,
});

redis.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redis.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

export const connectRedis = async () => {
  try {
    await redis.connect();
  } catch (error) {
    console.error('❌ Redis connection error:', error);
    throw error; // Don't exit the process, let the caller handle it
  }
};