import Redis from 'redis';
import { config } from './config.js';

// Disable Redis for now to avoid connection issues
let redis: any = null;

// Don't create Redis client to avoid immediate connection attempts
console.log('⚠️ Redis is disabled to avoid connection issues');

export const connectRedis = async () => {
  console.log('⚠️ Redis connection skipped - Redis is disabled');
  return Promise.resolve();
};

export { redis };