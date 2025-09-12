import express from 'express';
import { GeofenceService } from '../services/geofenceService.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { createGeofenceSchema } from '../validation/schemas.js';
import { AuthRequest } from '../types/index.js';

const router = express.Router();

// Get geofences
router.get('/', [
  authenticateToken,
  requireRole('admin'),
], async (req: AuthRequest, res) => {
  try {
    const { isActive } = req.query;
    const filters: any = {};
    
    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }
    
    const geofences = await GeofenceService.getGeofences(filters);
    res.json({ geofences });
  } catch (error) {
    console.error('Get geofences error:', error);
    res.status(500).json({ error: 'Failed to get geofences' });
  }
});

// Create geofence
router.post('/', [
  authenticateToken,
  requireRole('admin'),
  validate(createGeofenceSchema),
], async (req: AuthRequest, res) => {
  try {
    const geofenceData = {
      ...req.body,
      createdBy: req.user?._id,
    };
    
    const geofence = await GeofenceService.createGeofence(geofenceData);
    res.status(201).json({ geofence });
  } catch (error) {
    console.error('Create geofence error:', error);
    res.status(500).json({ error: 'Failed to create geofence' });
  }
});

// Update geofence
router.put('/:geofenceId', [
  authenticateToken,
  requireRole('admin'),
], async (req: AuthRequest, res) => {
  try {
    const { geofenceId } = req.params;
    
    const geofence = await GeofenceService.updateGeofence(geofenceId, req.body);
    
    if (!geofence) {
      return res.status(404).json({ error: 'Geofence not found' });
    }
    
    res.json({ geofence });
  } catch (error) {
    console.error('Update geofence error:', error);
    res.status(500).json({ error: 'Failed to update geofence' });
  }
});

// Delete geofence
router.delete('/:geofenceId', [
  authenticateToken,
  requireRole('admin'),
], async (req: AuthRequest, res) => {
  try {
    const { geofenceId } = req.params;
    
    const geofence = await GeofenceService.deleteGeofence(geofenceId);
    
    if (!geofence) {
      return res.status(404).json({ error: 'Geofence not found' });
    }
    
    res.json({ message: 'Geofence deleted successfully' });
  } catch (error) {
    console.error('Delete geofence error:', error);
    res.status(500).json({ error: 'Failed to delete geofence' });
  }
});

export default router;