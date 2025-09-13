import express from 'express';
import cors from 'cors';
import { config } from './config/config.js';
import { connectDatabase } from './config/database.js';

const app = express();

// Basic middleware
app.use(cors({
  origin: config.CLIENT_URL,
  credentials: true,
}));

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Basic auth route to test login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (email === 'admin@taskmanager.com' && password === 'admin123') {
    res.json({
      success: true,
      user: { email: 'admin@taskmanager.com', role: 'admin', name: 'Admin User' },
      token: 'dummy-token-for-testing'
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Start server
const startServer = async () => {
  try {
    await connectDatabase();
    
    app.listen(config.PORT, () => {
      console.log(`🚀 Basic server running on port ${config.PORT}`);
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
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});