const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:3002', // Frontend is running on port 3002
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'TaskVision Backend is running!',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Mock login endpoint
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Mock authentication
  if (email === 'admin@example.com' && password === 'admin123') {
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: '1',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin'
      },
      token: 'mock-jwt-token-admin'
    });
  } else if (email === 'user@example.com' && password === 'user123') {
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: '2',
        name: 'Regular User',
        email: 'user@example.com',
        role: 'user'
      },
      token: 'mock-jwt-token-user'
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

// Mock registration endpoint
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  
  res.json({
    success: true,
    message: 'Registration successful',
    user: {
      id: Date.now().toString(),
      name,
      email,
      role: 'user'
    },
    token: 'mock-jwt-token-new-user'
  });
});

// Mock dashboard stats
app.get('/api/dashboard/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totalTasks: 42,
      completedTasks: 28,
      pendingTasks: 14,
      totalUsers: 8,
      activeProjects: 5,
      recentActivity: [
        { id: 1, message: 'Task completed by John Doe', time: '2 hours ago' },
        { id: 2, message: 'New project created', time: '4 hours ago' },
        { id: 3, message: 'User registered', time: '6 hours ago' }
      ]
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 TaskVision Backend Server started successfully!');
  console.log(`📊 Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 Frontend URL: http://localhost:3002`);
  console.log('📝 Mock credentials:');
  console.log('   Admin: admin@example.com / admin123');
  console.log('   User: user@example.com / user123');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully');
  process.exit(0);
});
