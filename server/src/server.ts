import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { config } from './config/config.js';
import { connectDatabase } from './config/database.js';
import { connectRedis } from './config/redis.js';
import { scheduleJobs } from './services/jobService.js';
import { initializeSocket } from './sockets/index.js';
import { TimezoneUtils } from './utils/timezone.js';

// Routes
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import attendanceRoutes from './routes/attendance.js';
import trackingRoutes from './routes/tracking.js';
import timeTrackingRoutes from './routes/timeTracking.js';
import reportRoutes from './routes/reports.js';
import deviceRoutes from './routes/devices.js';
import commentRoutes from './routes/comments.js';
import notificationRoutes from './routes/notifications.js';
import geofenceRoutes from './routes/geofences.js';
import roleRoutes from './routes/roles.js';
import uploadRoutes from './routes/uploads.js';
import usersRoutes from './routes/users.js';
// Teams removed
import locationsRoutes from './routes/locations.js';

const app = express();
const server = createServer(app);

// Socket.io setup
const io = new SocketServer(server, {
  cors: {
    origin: config.CLIENT_URL,
    methods: ['GET', 'POST'],
  },
});

// Initialize socket handlers
initializeSocket(io);

// Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: config.CLIENT_URL,
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use('/api', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/time-tracking', timeTrackingRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/geofences', geofenceRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/users', usersRoutes);
// Teams removed
app.use('/api/locations', locationsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: TimezoneUtils.now().toISOString() });
});

// Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const startServer = async () => {
  try {
    await connectDatabase();
    
    // Try to connect to Redis, but don't fail if it's not available
    try {
      const redisOk = await connectRedis();
      if (redisOk) {
        console.log('✅ Redis connected successfully');
      } else {
        console.log('⚠️ Redis connection skipped - running without Redis');
      }
    } catch (redisError) {
      console.warn('⚠️ Redis connection failed, continuing without Redis:', redisError);
    }
    
    // Schedule background jobs only if Redis is available
    try {
      await scheduleJobs();
      console.log('✅ Background jobs scheduled');
    } catch (jobError) {
      console.warn('⚠️ Background jobs failed to schedule, continuing without them:', jobError);
    }
    
    server.listen(config.PORT, () => {
      console.log(`🚀 Server running on port ${config.PORT}`);
      console.log(`📍 Environment: ${config.NODE_ENV}`);
      console.log(`🌐 Client URL: ${config.CLIENT_URL}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process - just log the error
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process - just log the error
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});