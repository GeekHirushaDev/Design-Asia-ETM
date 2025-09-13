import webpush from 'web-push';
import { config } from '../config/config.js';
import Device from '../models/Device.js';
import Notification from '../models/Notification.js';

// Only setup VAPID if keys are provided
if (config.VAPID_PUBLIC_KEY && config.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${config.VAPID_EMAIL}`,
    config.VAPID_PUBLIC_KEY,
    config.VAPID_PRIVATE_KEY
  );
}

export class PushService {
  static async sendNotification(userId: string, notification: {
    type: string;
    title: string;
    body: string;
    meta?: any;
  }) {
    try {
      // Save notification to database
      const dbNotification = new Notification({
        userId,
        ...notification,
      });
      await dbNotification.save();

      // Skip push notifications if VAPID keys are not configured
      if (!config.VAPID_PUBLIC_KEY || !config.VAPID_PRIVATE_KEY) {
        console.warn('VAPID keys not configured, skipping push notifications');
        return dbNotification;
      }

      // Get user's devices with push subscriptions
      const devices = await Device.find({
        userId,
        pushSubscription: { $exists: true },
        isOnline: true,
      });

      const pushPromises = devices.map(async (device) => {
        if (!device.pushSubscription) return;

        const payload = JSON.stringify({
          title: notification.title,
          body: notification.body,
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          data: {
            notificationId: dbNotification._id,
            ...notification.meta,
          },
        });

        try {
          await webpush.sendNotification(device.pushSubscription, payload);
        } catch (error: any) {
          console.error('Push notification failed:', error);
          
          // Remove invalid subscription
          if (error.statusCode === 410) {
            device.pushSubscription = undefined;
            await device.save();
          }
        }
      });

      await Promise.allSettled(pushPromises);
      return dbNotification;
    } catch (error) {
      console.error('Notification service error:', error);
      throw error;
    }
  }

  static async sendBulkNotification(userIds: string[], notification: {
    type: string;
    title: string;
    body: string;
    meta?: any;
  }) {
    const promises = userIds.map(userId => 
      this.sendNotification(userId, notification)
    );
    
    return Promise.allSettled(promises);
  }
}