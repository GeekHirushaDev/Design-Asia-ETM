import express from 'express';
import Location from '../models/Location.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';

const router = express.Router();

// Get all locations (admin only)
router.get('/', authenticateToken, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { page = 1, limit = 20, search, isActive } = req.query;
    const filter: any = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const skip = (Number(page) - 1) * Number(limit);

    const locations = await Location.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Location.countDocuments(filter);

    res.json({
      locations,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit),
      },
    });
  } catch (error) {
    console.error('Get locations error:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// Create new location (admin only)
router.post('/', authenticateToken, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { name, address, latitude, longitude, radiusMeters = 100, description } = req.body;

    // Validation
    if (!name || !address || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Name, address, latitude, and longitude are required' });
    }

    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({ error: 'Latitude must be between -90 and 90' });
    }

    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: 'Longitude must be between -180 and 180' });
    }

    if (radiusMeters < 10 || radiusMeters > 10000) {
      return res.status(400).json({ error: 'Radius must be between 10 and 10000 meters' });
    }

    // Check if location name already exists
    const existingLocation = await Location.findOne({ name: name.trim() });
    if (existingLocation) {
      return res.status(400).json({ error: 'Location name already exists' });
    }

    const location = new Location({
      name: name.trim(),
      address: address.trim(),
      latitude,
      longitude,
      radiusMeters,
      description: description?.trim(),
      createdBy: req.user!._id,
    });

    await location.save();

    const populatedLocation = await Location.findById(location._id)
      .populate('createdBy', 'name email');

    res.status(201).json(populatedLocation);
  } catch (error) {
    console.error('Create location error:', error);
    res.status(500).json({ error: 'Failed to create location' });
  }
});

// Get location by ID
router.get('/:locationId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const location = await Location.findById(req.params.locationId)
      .populate('createdBy', 'name email');

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json(location);
  } catch (error) {
    console.error('Get location error:', error);
    res.status(500).json({ error: 'Failed to fetch location' });
  }
});

// Update location (admin only)
router.put('/:locationId', authenticateToken, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { name, address, latitude, longitude, radiusMeters, description, isActive } = req.body;
    const locationId = req.params.locationId;

    // Check if location name is taken by another location
    if (name) {
      const existingLocation = await Location.findOne({ 
        name: name.trim(), 
        _id: { $ne: locationId } 
      });
      if (existingLocation) {
        return res.status(400).json({ error: 'Location name already exists' });
      }
    }

    // Validation
    if (latitude !== undefined && (latitude < -90 || latitude > 90)) {
      return res.status(400).json({ error: 'Latitude must be between -90 and 90' });
    }

    if (longitude !== undefined && (longitude < -180 || longitude > 180)) {
      return res.status(400).json({ error: 'Longitude must be between -180 and 180' });
    }

    if (radiusMeters !== undefined && (radiusMeters < 10 || radiusMeters > 10000)) {
      return res.status(400).json({ error: 'Radius must be between 10 and 10000 meters' });
    }

    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (address) updateData.address = address.trim();
    if (latitude !== undefined) updateData.latitude = latitude;
    if (longitude !== undefined) updateData.longitude = longitude;
    if (radiusMeters !== undefined) updateData.radiusMeters = radiusMeters;
    if (description !== undefined) updateData.description = description?.trim();
    if (isActive !== undefined) updateData.isActive = isActive;

    const location = await Location.findByIdAndUpdate(
      locationId,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json(location);
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// Delete location (admin only)
router.delete('/:locationId', authenticateToken, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const location = await Location.findByIdAndDelete(req.params.locationId);
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json({ message: 'Location deleted successfully' });
  } catch (error) {
    console.error('Delete location error:', error);
    res.status(500).json({ error: 'Failed to delete location' });
  }
});

// Validate user location against saved location
router.post('/validate', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { locationId, userLatitude, userLongitude } = req.body;

    if (!locationId || userLatitude === undefined || userLongitude === undefined) {
      return res.status(400).json({ error: 'Location ID and user coordinates are required' });
    }

    const location = await Location.findById(locationId);
    if (!location || !location.isActive) {
      return res.status(404).json({ error: 'Location not found or inactive' });
    }

    // Calculate distance using Haversine formula
    const R = 6371000; // Earth's radius in meters
    const lat1 = location.latitude * Math.PI / 180;
    const lat2 = userLatitude * Math.PI / 180;
    const deltaLat = (userLatitude - location.latitude) * Math.PI / 180;
    const deltaLng = (userLongitude - location.longitude) * Math.PI / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    const isWithinRadius = distance <= location.radiusMeters;

    res.json({
      isWithinRadius,
      distance: Math.round(distance),
      allowedRadius: location.radiusMeters,
      location: {
        name: location.name,
        address: location.address
      }
    });
  } catch (error) {
    console.error('Validate location error:', error);
    res.status(500).json({ error: 'Failed to validate location' });
  }
});

export default router;