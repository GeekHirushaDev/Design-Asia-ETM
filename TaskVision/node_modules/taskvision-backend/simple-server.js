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
  
  console.log('Login attempt:', { email, password });
  
  // Mock authentication
  if (email && password) {
    const isAdmin = email.includes('admin') || email === 'admin@designasia.com';
    const user = {
      id: isAdmin ? '1' : '2',
      email: email,
      firstName: isAdmin ? 'Admin' : 'John',
      lastName: isAdmin ? 'User' : 'Doe',
      role: isAdmin ? 'admin' : 'employee',
      avatar: null,
      department: isAdmin ? 'IT' : 'Design'
    };
    
    console.log('Login successful:', user);
    
    res.json({
      token: 'mock-jwt-token-' + Date.now(),
      user: user
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

// Admin dashboard stats
app.get('/api/admin/dashboard/stats', (req, res) => {
  console.log('Admin dashboard stats requested');
  res.json({
    totalEmployees: 24,
    activeEmployees: 18,
    totalProjects: 8,
    activeProjects: 5,
    totalTasks: 156,
    completedTasks: 89,
    pendingTasks: 45,
    overdueTasks: 22,
    todayAttendance: 16,
    attendanceRate: 88.9
  });
});

// Recent activities for admin
app.get('/api/admin/dashboard/activities', (req, res) => {
  res.json([
    {
      id: '1',
      type: 'task_completed',
      message: 'completed the website redesign task',
      user: { firstName: 'John', lastName: 'Doe' },
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '2', 
      type: 'user_registered',
      message: 'joined the team',
      user: { firstName: 'Jane', lastName: 'Smith' },
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '3',
      type: 'project_created',
      message: 'created new project "Mobile App"',
      user: { firstName: 'Mike', lastName: 'Johnson' },
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
    }
  ]);
});

// Project progress for admin
app.get('/api/admin/dashboard/projects', (req, res) => {
  res.json([
    {
      id: '1',
      name: 'Website Redesign',
      progress: 75,
      totalTasks: 20,
      completedTasks: 15,
      dueDate: '2025-09-30',
      status: 'on-track'
    },
    {
      id: '2',
      name: 'Mobile App Development',
      progress: 45,
      totalTasks: 30,
      completedTasks: 14,
      dueDate: '2025-10-15',
      status: 'at-risk'
    },
    {
      id: '3',
      name: 'Marketing Campaign',
      progress: 20,
      totalTasks: 15,
      completedTasks: 3,
      dueDate: '2025-09-20',
      status: 'delayed'
    }
  ]);
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
