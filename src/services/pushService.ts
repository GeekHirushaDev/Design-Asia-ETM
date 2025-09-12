import { api } from '../lib/api';

export class PushService {
  private static vapidPublicKey = 'BIQ6XYGFqHZg5e2ivXdiRXP6YVbndsF6QN0eygx_RkziaiQSr4fEQ-_f1YqDCZDHhXJ9P8BSPK_KHXVv0P0DOb8';

  static async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (!('serviceWorker' in navigator)) {
      console.warn('This browser does not support service workers');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  static async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }

  static async subscribeToPush(): Promise<PushSubscription | null> {
    try {
      const registration = await this.registerServiceWorker();
      if (!registration) return null;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey) as BufferSource,
      });

      // Send subscription to server
      await api.post('/devices/register', {
        deviceId: this.generateDeviceId(),
        deviceType: this.getDeviceType(),
        deviceName: this.getDeviceName(),
        pushSubscription: {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
            auth: this.arrayBufferToBase64(subscription.getKey('auth')!),
          },
        },
      });

      return subscription;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return null;
    }
  }

  static async unsubscribeFromPush(): Promise<boolean> {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return false;

      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return false;

      const success = await subscription.unsubscribe();
      
      if (success) {
        // Remove from server
        await api.delete(`/devices/${this.generateDeviceId()}`);
      }

      return success;
    } catch (error) {
      console.error('Push unsubscription failed:', error);
      return false;
    }
  }

  static async updateBatteryLevel(): Promise<void> {
    try {
      // @ts-ignore - Battery API is not in TypeScript definitions
      if ('getBattery' in navigator) {
        // @ts-ignore
        const battery = await navigator.getBattery();
        const batteryLevel = Math.round(battery.level * 100);

        await api.put(`/devices/${this.generateDeviceId()}/telemetry`, {
          batteryLevel,
        });
      }
    } catch (error) {
      console.error('Battery level update failed:', error);
    }
  }

  private static urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  private static generateDeviceId(): string {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  private static getDeviceType(): 'mobile' | 'desktop' | 'tablet' {
    const userAgent = navigator.userAgent;
    if (/Mobile|Android|iPhone/.test(userAgent)) {
      return /iPad|tablet/i.test(userAgent) ? 'tablet' : 'mobile';
    }
    return 'desktop';
  }

  private static getDeviceName(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome Browser';
    if (userAgent.includes('Firefox')) return 'Firefox Browser';
    if (userAgent.includes('Safari')) return 'Safari Browser';
    if (userAgent.includes('Edge')) return 'Edge Browser';
    return 'Unknown Browser';
  }
}