import express from 'express';
import mongoose from 'mongoose';
import { auth } from '../middleware/auth';
import { adminAuth } from '../middleware/adminAuth';
import { Task } from '../models/Task';
import { LocationTracking } from '../models/LocationTracking';
import { Geofence } from '../models/Geofence';

const router = express.Router();

// Validate task completion location
router.post('/:taskId/validate-location', auth, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { lat, lng, accuracy } = req.body;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user is assigned to this task
    if (task.assignedTo.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized for this task' });
    }

    // Calculate distance from required location
    const distance = calculateDistance(
      lat, lng,
      task.location.lat, task.location.lng
    );

    const isValidLocation = distance <= task.location.radius;
    let validationMethod: 'gps' | 'geofence' | 'manual_override' = 'gps';
    let geofenceValidation = null;

    // Check geofence validation if available
    if (task.location.geofenceId) {
      const geofence = await Geofence.findById(task.location.geofenceId);
      if (geofence) {
        const isInGeofence = await checkPointInGeofence(lat, lng, geofence);
        if (isInGeofence) {
          validationMethod = 'geofence';
          geofenceValidation = {
            geofenceId: geofence._id,
            geofenceName: geofence.name,
            isValid: true
          };
        }
      }
    }

    // Update task with location validation
    if (!task.locationValidation) {
      task.locationValidation = {
        completionLocation: {
          lat,
          lng,
          accuracy,
          timestamp: new Date()
        },
        isValidLocation: isValidLocation || (geofenceValidation?.isValid || false),
        distanceFromRequired: Math.round(distance),
        validationMethod,
        validatedAt: new Date()
      };
    } else {
      task.locationValidation.completionLocation = {
        lat,
        lng,
        accuracy,
        timestamp: new Date()
      };
      task.locationValidation.isValidLocation = isValidLocation || (geofenceValidation?.isValid || false);
      task.locationValidation.distanceFromRequired = Math.round(distance);
      task.locationValidation.validationMethod = validationMethod;
      task.locationValidation.validatedAt = new Date();
    }

    await task.save();

    // Log location tracking for this validation
    const locationEntry = new LocationTracking({
      userId: req.user.id,
      location: { lat, lng, accuracy },
      geofences: geofenceValidation ? [task.location.geofenceId] : [],
      isInsideGeofence: geofenceValidation?.isValid || false,
      metadata: {
        source: 'task_validation',
        taskId: task._id,
        validationResult: task.locationValidation.isValidLocation
      }
    });
    await locationEntry.save();

    const response = {
      taskId,
      locationValidation: {
        isValid: task.locationValidation?.isValidLocation || false,
        distance: Math.round(distance),
        allowedRadius: task.location.radius,
        validationMethod,
        strict: task.location.validationStrict,
        canComplete: (task.locationValidation?.isValidLocation || false) || !task.location.validationStrict
      },
      geofenceValidation,
      message: (task.locationValidation?.isValidLocation || false)
        ? 'Location validated successfully' 
        : `You are ${Math.round(distance)}m away from the required location`
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: 'Error validating task location', error });
  }
});

// Complete task with location validation
router.post('/:taskId/complete-with-location', auth, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { lat, lng, accuracy, proofData } = req.body;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.assignedTo.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized for this task' });
    }

    if (task.status === 'Completed') {
      return res.status(400).json({ message: 'Task already completed' });
    }

    // Validate location first
    const distance = calculateDistance(
      lat, lng,
      task.location.lat, task.location.lng
    );

    const isValidLocation = distance <= task.location.radius;

    // Check if strict validation is required
    if (task.location.validationStrict && !isValidLocation) {
      return res.status(400).json({
        message: 'Task completion requires you to be at the specified location',
        currentDistance: Math.round(distance),
        requiredRadius: task.location.radius
      });
    }

    // Update location validation
    task.locationValidation = {
      completionLocation: {
        lat,
        lng,
        accuracy,
        timestamp: new Date()
      },
      isValidLocation,
      distanceFromRequired: Math.round(distance),
      validationMethod: 'gps',
      validatedBy: req.user.id,
      validatedAt: new Date()
    };

    // Add proof submission with location
    if (proofData) {
      task.proofSubmissions.push({
        type: proofData.type,
        content: proofData.content,
        url: proofData.url,
        submittedAt: new Date(),
        approved: false,
        location: {
          lat,
          lng,
          timestamp: new Date()
        }
      });
    }

    // Complete the task
    task.status = 'Completed';
    task.completedAt = new Date();
    
    // Update time tracking
    if (task.timeTracking.startTime && !task.timeTracking.endTime) {
      task.timeTracking.endTime = new Date();
      const duration = task.timeTracking.endTime.getTime() - task.timeTracking.startTime.getTime();
      task.actualHours = duration / (1000 * 60 * 60);
    }

    await task.save();

    // Log completion location
    const locationEntry = new LocationTracking({
      userId: req.user.id,
      location: { lat, lng, accuracy },
      metadata: {
        source: 'task_completion',
        taskId: task._id,
        locationValid: isValidLocation
      }
    });
    await locationEntry.save();

    res.json({
      success: true,
      task,
      locationValidation: {
        isValid: isValidLocation,
        distance: Math.round(distance),
        message: isValidLocation ? 'Task completed at valid location' : 'Task completed outside designated area'
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error completing task', error });
  }
});

// Get task location requirements
router.get('/:taskId/location-requirements', auth, async (req, res) => {
  try {
    const { taskId } = req.params;
    
    const task = await Task.findById(taskId)
      .populate('location.geofenceId', 'name type center radius coordinates')
      .select('title location locationValidation assignedTo');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check permissions
    if (task.assignedTo.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view this task' });
    }

    const requirements = {
      taskId: task._id,
      title: task.title,
      location: {
        required: task.location.isLocationRequired,
        coordinates: {
          lat: task.location.lat,
          lng: task.location.lng
        },
        radius: task.location.radius,
        address: task.location.address,
        strict: task.location.validationStrict,
        timeBuffer: task.location.allowedTimeBuffer
      },
      geofence: task.location.geofenceId || null,
      validation: task.locationValidation || null,
      canComplete: !task.location.validationStrict || (task.locationValidation?.isValidLocation || false)
    };

    res.json(requirements);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching task location requirements', error });
  }
});

// Get nearby tasks based on current location
router.post('/nearby-tasks', auth, async (req, res) => {
  try {
    const { lat, lng, radius = 5000 } = req.body; // Default 5km radius

    if (!lat || !lng) {
      return res.status(400).json({ message: 'Location coordinates required' });
    }

    // Find tasks near the user's location
    const nearbyTasks = await Task.aggregate([
      {
        $match: {
          assignedTo: new mongoose.Types.ObjectId(req.user.id),
          status: { $in: ['Not Started', 'In Progress'] },
          'location.isLocationRequired': true
        }
      },
      {
        $addFields: {
          distance: {
            $multiply: [
              6371000, // Earth radius in meters
              {
                $acos: {
                  $add: [
                    {
                      $multiply: [
                        { $sin: { $multiply: [{ $divide: ['$location.lat', 180] }, 3.14159] } },
                        { $sin: { $multiply: [{ $divide: [lat, 180] }, 3.14159] } }
                      ]
                    },
                    {
                      $multiply: [
                        { $cos: { $multiply: [{ $divide: ['$location.lat', 180] }, 3.14159] } },
                        { $cos: { $multiply: [{ $divide: [lat, 180] }, 3.14159] } },
                        { $cos: { $subtract: [
                          { $multiply: [{ $divide: ['$location.lng', 180] }, 3.14159] },
                          { $multiply: [{ $divide: [lng, 180] }, 3.14159] }
                        ] } }
                      ]
                    }
                  ]
                }
              }
            ]
          }
        }
      },
      {
        $match: {
          distance: { $lte: radius }
        }
      },
      {
        $sort: { distance: 1 }
      },
      {
        $project: {
          title: 1,
          description: 1,
          priority: 1,
          status: 1,
          dueDate: 1,
          location: 1,
          distance: { $round: ['$distance', 0] },
          estimatedHours: 1,
          locationValidation: 1
        }
      }
    ]);

    res.json({
      userLocation: { lat, lng },
      searchRadius: radius,
      nearbyTasks,
      count: nearbyTasks.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Error finding nearby tasks', error });
  }
});

// Override location validation (Admin only)
router.post('/:taskId/override-location', adminAuth, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { reason, allowCompletion } = req.body;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (!task.locationValidation) {
      task.locationValidation = {
        completionLocation: {
          lat: 0,
          lng: 0,
          accuracy: 0,
          timestamp: new Date()
        },
        isValidLocation: false,
        distanceFromRequired: 0,
        validationMethod: 'manual_override'
      };
    }

    task.locationValidation.validationMethod = 'manual_override';
    task.locationValidation.validatedBy = req.user.id;
    task.locationValidation.validatedAt = new Date();
    task.locationValidation.isValidLocation = allowCompletion;

    // Add note about override
    if (!task.notes) {
      task.notes = '';
    }
    task.notes += `\n[ADMIN OVERRIDE] Location validation overridden by ${req.user.name}. Reason: ${reason}`;

    await task.save();

    res.json({
      success: true,
      message: 'Location validation overridden',
      task: {
        id: task._id,
        locationValidation: task.locationValidation,
        canComplete: allowCompletion
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error overriding location validation', error });
  }
});

// Helper functions
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
};

const checkPointInGeofence = async (lat: number, lng: number, geofence: any): Promise<boolean> => {
  if (geofence.type === 'circle') {
    const distance = calculateDistance(lat, lng, geofence.center.lat, geofence.center.lng);
    return distance <= geofence.radius;
  }
  return false;
};

export default router;
