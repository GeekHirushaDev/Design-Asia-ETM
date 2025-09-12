import express from 'express';
import Device from '../models/Device.js';
import { authenticateToken } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { registerDeviceSchema } from '../validation/schemas.js';
import { AuthRequest } from '../types/index.js';

const router = express.Router();

// Register device for push notifications
router.post('/register', [
  authenticateToken,
  validate(registerDeviceSchema),
], async (req: AuthRequest, res) => {
  try {
    const { deviceId, deviceType, deviceName, pushSubscription } = req.body;
    
    const device = await Device.findOneAndUpdate(
      { userId: req.user?._id, deviceId },
      {
        userId: req.user?._id,
        deviceId,
        deviceType,
        deviceName,
        userAgent: req.get('User-Agent') || '',
        ipAddress: req.ip || 'unknown',
        pushSubscription,
        lastSeen: new Date(),
        isOnline: true,
      },
      { upsert: true, new: true }
    );
    
    res.json({ device });
  } catch (error) {
    console.error('Device registration error:', error);
    res.status(500).json({ error: 'Failed to register device' });
  }
});

// Update device telemetry
router.put('/:deviceId/telemetry', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { deviceId } = req.params;
    const { batteryLevel } = req.body;
    
    const device = await Device.findOneAndUpdate(
      { userId: req.user?._id, deviceId },
      {
        batteryLevel,
        lastSeen: new Date(),
        isOnline: true,
      },
      { new: true }
    );
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    res.json({ device });
  } catch (error) {
    console.error('Update telemetry error:', error);
    res.status(500).json({ error: 'Failed to update telemetry' });
  }
});

// Get user devices
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const devices = await Device.find({ userId: req.user?._id })
      .sort({ lastSeen: -1 });
    
    res.json({ devices });
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({ error: 'Failed to get devices' });
  }
});

// Remove device
router.delete('/:deviceId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { deviceId } = req.params;
    
    const device = await Device.findOneAndDelete({
      userId: req.user?._id,
      deviceId,
    });
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    res.json({ message: 'Device removed successfully' });
  } catch (error) {
    console.error('Remove device error:', error);
    res.status(500).json({ error: 'Failed to remove device' });
  }
});

export default router;