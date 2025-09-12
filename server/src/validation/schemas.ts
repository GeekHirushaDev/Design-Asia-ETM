import { z } from 'zod';

// Auth schemas
export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'employee']).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// Task schemas
export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  assignedTo: z.array(z.string()).optional(),
  estimateMinutes: z.number().positive().optional(),
  dueDate: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    radiusMeters: z.number().positive().default(100),
    address: z.string().optional(),
  }).optional(),
});

export const updateTaskSchema = createTaskSchema.partial();

// Comment schemas
export const createCommentSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  mentions: z.array(z.string()).optional(),
});

// Tracking schemas
export const trackingPingSchema = z.object({
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  batteryLevel: z.number().min(0).max(100).optional(),
  speed: z.number().min(0).optional(),
});

// Attendance schemas
export const clockInOutSchema = z.object({
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
});

// Device schemas
export const registerDeviceSchema = z.object({
  deviceId: z.string().min(1, 'Device ID is required'),
  deviceType: z.enum(['mobile', 'desktop', 'tablet']),
  deviceName: z.string().min(1, 'Device name is required'),
  pushSubscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string(),
      auth: z.string(),
    }),
  }).optional(),
});

// Geofence schemas
export const createGeofenceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  center: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  radiusMeters: z.number().min(10).max(10000),
  taskIds: z.array(z.string()).optional(),
});

// Role schemas
export const createRoleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  permissions: z.array(z.string()).min(1, 'At least one permission is required'),
});