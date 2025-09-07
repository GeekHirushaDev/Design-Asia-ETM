const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const projectRoutes = require('./routes/projects');
const teamRoutes = require('./routes/teams');
const reportRoutes = require('./routes/reports');
const notificationRoutes = require('./routes/notifications');
const analyticsRoutes = require('./routes/analytics');

// Import middleware
const { authMiddleware } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);

// Socket.IO setup with CORS
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', authMiddleware, taskRoutes);
app.use('/api/projects', authMiddleware, projectRoutes);
app.use('/api/teams', authMiddleware, teamRoutes);
app.use('/api/reports', authMiddleware, reportRoutes);
app.use('/api/notifications', authMiddleware, notificationRoutes);
app.use('/api/analytics', authMiddleware, analyticsRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join user to their personal room
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their room`);
  });

  // Join project rooms
  socket.on('joinProject', (projectId) => {
    socket.join(`project_${projectId}`);
    console.log(`User joined project room: project_${projectId}`);
  });

  // Leave project rooms
  socket.on('leaveProject', (projectId) => {
    socket.leave(`project_${projectId}`);
    console.log(`User left project room: project_${projectId}`);
  });

  // Handle task updates
  socket.on('taskUpdate', (data) => {
    socket.to(`project_${data.projectId}`).emit('taskUpdated', data);
  });

  // Handle new task creation
  socket.on('newTask', (data) => {
    socket.to(`project_${data.projectId}`).emit('taskCreated', data);
  });

  // Handle task deletion
  socket.on('deleteTask', (data) => {
    socket.to(`project_${data.projectId}`).emit('taskDeleted', data);
  });

  // Handle comments
  socket.on('newComment', (data) => {
    socket.to(`project_${data.projectId}`).emit('commentAdded', data);
  });

  // Handle notifications
  socket.on('notification', (data) => {
    socket.to(data.userId).emit('newNotification', data);
  });

  // Handle real-time collaboration
  socket.on('userTyping', (data) => {
    socket.to(`project_${data.projectId}`).emit('userTyping', {
      userId: data.userId,
      taskId: data.taskId,
      isTyping: data.isTyping
    });
  });

  // Handle location updates for geofencing
  socket.on('locationUpdate', (data) => {
    socket.to(`project_${data.projectId}`).emit('locationUpdated', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io available to routes
app.set('io', io);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl 
  });
});

// MongoDB connection with timeout and fallback
const connectDB = async () => {
  try {
    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/taskvision', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // 5 second timeout
      connectTimeoutMS: 5000,
    });
    console.log('✅ Connected to MongoDB successfully');
    return true;
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('');
    console.log('📝 To fix this issue:');
    console.log('1. Install MongoDB locally: https://www.mongodb.com/try/download/community');
    console.log('2. Start MongoDB service');
    console.log('3. Or use MongoDB Atlas: https://www.mongodb.com/atlas');
    console.log('4. Update MONGODB_URI in your .env file');
    console.log('');
    console.log('⚠️  Server will continue without database functionality');
    return false;
  }
};

// Start server regardless of MongoDB connection
const startServer = () => {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📱 Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
    console.log('');
    if (!mongoose.connection.readyState) {
      console.log('⚠️  Running without database - some features may not work');
    }
  });
};

// Initialize database connection and start server
connectDB().then(() => {
  startServer();
}).catch(() => {
  startServer();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    mongoose.connection.close();
    process.exit(0);
  });
});

module.exports = app;
