import Geofence from '../models/Geofence.js';
import TrackingPoint from '../models/TrackingPoint.js';
import { PushService } from './pushService.js';

export class GeofenceService {
  static calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  static async checkGeofenceEvents(userId: string, location: { lat: number; lng: number }) {
    try {
      // Get all active geofences
      const geofences = await Geofence.find({ isActive: true });
      
      // Get user's last location
      const lastLocation = await TrackingPoint.findOne(
        { userId },
        {},
        { sort: { timestamp: -1, skip: 1 } }
      );

      const events = [];

      for (const geofence of geofences) {
        const currentDistance = this.calculateDistance(
          location.lat,
          location.lng,
          geofence.center.lat,
          geofence.center.lng
        );

        const isCurrentlyInside = currentDistance <= geofence.radiusMeters;
        let wasInside = false;

        if (lastLocation) {
          const lastDistance = this.calculateDistance(
            lastLocation.location.lat,
            lastLocation.location.lng,
            geofence.center.lat,
            geofence.center.lng
          );
          wasInside = lastDistance <= geofence.radiusMeters;
        }

        // Detect enter/exit events
        if (isCurrentlyInside && !wasInside) {
          events.push({
            type: 'enter',
            geofenceId: geofence._id,
            geofenceName: geofence.name,
            userId,
            location,
            timestamp: new Date(),
          });

          // Send notification
          await PushService.sendNotification(userId, {
            type: 'geofence_enter',
            title: 'Geofence Entry',
            body: `You entered ${geofence.name}`,
            meta: { geofenceId: geofence._id },
          });
        } else if (!isCurrentlyInside && wasInside) {
          events.push({
            type: 'exit',
            geofenceId: geofence._id,
            geofenceName: geofence.name,
            userId,
            location,
            timestamp: new Date(),
          });

          // Send notification
          await PushService.sendNotification(userId, {
            type: 'geofence_exit',
            title: 'Geofence Exit',
            body: `You left ${geofence.name}`,
            meta: { geofenceId: geofence._id },
          });
        }
      }

      return events;
    } catch (error) {
      console.error('Geofence check error:', error);
      return [];
    }
  }

  static async createGeofence(data: {
    name: string;
    description?: string;
    center: { lat: number; lng: number };
    radiusMeters: number;
    taskIds?: string[];
    createdBy: string;
  }) {
    const geofence = new Geofence(data);
    await geofence.save();
    return geofence;
  }

  static async updateGeofence(id: string, updates: any) {
    return Geofence.findByIdAndUpdate(id, updates, { new: true });
  }

  static async deleteGeofence(id: string) {
    return Geofence.findByIdAndDelete(id);
  }

  static async getGeofences(filters: any = {}) {
    return Geofence.find(filters).populate('createdBy', 'name email');
  }
}