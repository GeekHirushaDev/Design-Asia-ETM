import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3002;

// Basic middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Basic auth route to test login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  console.log('Login attempt:', { email, password });
  
  if (email === 'admin@company.com' && password === 'admin123') {
    res.json({
      success: true,
      user: { email: 'admin@company.com', role: 'admin', name: 'Admin User' },
      token: 'dummy-token-for-testing'
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Minimal server running on port ${PORT}`);
  console.log('Ready to test admin login!');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});