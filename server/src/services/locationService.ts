import Location from '../models/Location.js';

export class LocationService {
  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  static calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }

  /**
   * Validate if user location is within allowed radius
   */
  static async validateLocation(
    taskLat: number, 
    taskLng: number, 
    radiusMeters: number,
    userLat: number, 
    userLng: number
  ): Promise<boolean> {
    const distance = this.calculateDistance(taskLat, taskLng, userLat, userLng);
    return distance <= radiusMeters;
  }

  /**
   * Get saved locations
   */
  static async getSavedLocations(isActive: boolean = true): Promise<any[]> {
    try {
      const filter: any = {};
      if (isActive !== undefined) {
        filter.isActive = isActive;
      }

      const locations = await Location.find(filter)
        .populate('createdBy', 'name email')
        .sort({ name: 1 });

      return locations;
    } catch (error) {
      console.error('Get saved locations error:', error);
      return [];
    }
  }

  /**
   * Create new location
   */
  static async createLocation(data: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
    description?: string;
    createdBy: string;
  }): Promise<any> {
    try {
      // Check if location name already exists
      const existingLocation = await Location.findOne({ name: data.name.trim() });
      if (existingLocation) {
        throw new Error('Location name already exists');
      }

      const location = new Location({
        ...data,
        name: data.name.trim(),
        address: data.address.trim(),
        description: data.description?.trim(),
      });

      await location.save();
      return location.populate('createdBy', 'name email');
    } catch (error) {
      console.error('Create location error:', error);
      throw error;
    }
  }

  /**
   * Update location
   */
  static async updateLocation(locationId: string, updates: any): Promise<any> {
    try {
      // Check if name is being changed and if it conflicts
      if (updates.name) {
        const existingLocation = await Location.findOne({ 
          name: updates.name.trim(), 
          _id: { $ne: locationId } 
        });
        if (existingLocation) {
          throw new Error('Location name already exists');
        }
      }

      const location = await Location.findByIdAndUpdate(
        locationId,
        { ...updates, name: updates.name?.trim(), address: updates.address?.trim() },
        { new: true, runValidators: true }
      ).populate('createdBy', 'name email');

      if (!location) {
        throw new Error('Location not found');
      }

      return location;
    } catch (error) {
      console.error('Update location error:', error);
      throw error;
    }
  }

  /**
   * Delete location
   */
  static async deleteLocation(locationId: string): Promise<boolean> {
    try {
      const location = await Location.findByIdAndDelete(locationId);
      return !!location;
    } catch (error) {
      console.error('Delete location error:', error);
      throw error;
    }
  }
}