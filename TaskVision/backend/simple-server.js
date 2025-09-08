const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Basic health check route
app.get('/', (req, res) => {
  res.json({ 
    message: 'TaskVision Backend API is running!', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Auth routes (mock)
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Mock authentication
  if (email && password) {
    res.json({
      token: 'mock-jwt-token',
      user: {
        id: '1',
        email: email,
        name: 'Test User',
        role: email.includes('admin') ? 'admin' : 'employee'
      }
    });
  } else {
    res.status(400).json({ error: 'Email and password required' });
  }
});

app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  
  if (email && password && name) {
    res.json({
      token: 'mock-jwt-token',
      user: {
        id: '2',
        email: email,
        name: name,
        role: 'employee'
      }
    });
  } else {
    res.status(400).json({ error: 'All fields required' });
  }
});

// Tasks routes (mock)
app.get('/api/tasks', (req, res) => {
  res.json([
    {
      id: '1',
      title: 'Setup TaskVision Project',
      description: 'Initialize the project structure and dependencies',
      status: 'completed',
      priority: 'high',
      assignedTo: 'user1',
      dueDate: '2025-09-10',
      createdAt: '2025-09-08'
    },
    {
      id: '2',
      title: 'Design User Interface',
      description: 'Create wireframes and mockups for the application',
      status: 'in-progress',
      priority: 'medium',
      assignedTo: 'user2',
      dueDate: '2025-09-15',
      createdAt: '2025-09-08'
    }
  ]);
});

// Dashboard stats (mock)
app.get('/api/dashboard/stats', (req, res) => {
  res.json({
    totalTasks: 25,
    completedTasks: 12,
    inProgressTasks: 8,
    pendingTasks: 5,
    totalUsers: 15,
    activeProjects: 3
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`TaskVision Backend running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/`);
  console.log(`API endpoints available at: http://localhost:${PORT}/api/`);
});
