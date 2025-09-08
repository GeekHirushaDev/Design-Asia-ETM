import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'TaskVision Backend is running!',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Mock auth routes for testing
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Mock authentication
  if (email === 'admin@designasia.com' && password === 'admin123') {
    res.json({
      success: true,
      data: {
        user: {
          id: '1',
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@designasia.com',
          role: 'admin',
          department: 'IT',
          position: 'Administrator'
        },
        token: 'mock-jwt-token-admin'
      }
    });
  } else if (email === 'employee@designasia.com' && password === 'employee123') {
    res.json({
      success: true,
      data: {
        user: {
          id: '2',
          firstName: 'John',
          lastName: 'Doe',
          email: 'employee@designasia.com',
          role: 'employee',
          department: 'Design',
          position: 'UI Designer'
        },
        token: 'mock-jwt-token-employee'
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

app.post('/api/auth/register', (req, res) => {
  res.json({
    success: true,
    message: 'Registration request submitted. Please wait for admin approval.',
    data: {
      user: {
        id: '3',
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        role: 'employee',
        department: req.body.department,
        position: req.body.position
      },
      token: 'mock-jwt-token-new-user'
    }
  });
});

// Mock dashboard stats
app.get('/api/dashboard/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totalTasks: 12,
      completedTasks: 8,
      pendingTasks: 3,
      overdueTasks: 1,
      todayHours: 6.5,
      weekHours: 35.5,
    }
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log('🚀 TaskVision Backend Server started successfully!');
  console.log(`📊 Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log('📝 Mock credentials available in frontend login page');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

export default app;
