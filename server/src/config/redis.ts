import Redis from 'redis';
import { config } from './config.js';

// Disable Redis for now to avoid connection issues
// Provide a no-op client to avoid runtime errors when services call Redis methods
let redis: any = {
  async setEx(key: string, ttlSeconds: number, value: string) {
    console.log(`ℹ️ [Redis:disabled] setEx(${key}, ${ttlSeconds}, <value>) skipped`);
    return true;
  },
  async get(key: string) {
    console.log(`ℹ️ [Redis:disabled] get(${key}) -> null`);
    return null;
  },
  async del(key: string) {
    console.log(`ℹ️ [Redis:disabled] del(${key})`);
    return 1;
  },
};

// Don't create Redis client to avoid immediate connection attempts
console.log('⚠️ Redis is disabled to avoid connection issues');

export const connectRedis = async (): Promise<boolean> => {
  console.log('⚠️ Redis connection skipped - Redis is disabled');
  return false;
};

export { redis };