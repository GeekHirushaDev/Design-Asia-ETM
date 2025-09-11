// Simple test server to verify Express is working
const express = require('express');
const cors = require('cors');

const app = express();
const port = 3002; // Use a different port to avoid conflicts

// Enable CORS for frontend
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

// Simple health route
app.get('/api/health', (req, res) => {
  console.log('Health endpoint hit!');
  res.json({
    success: true,
    message: 'Simple test server working!',
    timestamp: new Date().toISOString()
  });
});

// Simple test registration
app.post('/api/auth/register', (req, res) => {
  console.log('Register endpoint hit with data:', req.body);
  res.json({
    success: true,
    message: 'Test registration successful',
    user: { name: req.body.name, email: req.body.email },
    token: 'test-token-123'
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🧪 Test server running on http://localhost:${port}`);
  console.log(`📍 Health: http://localhost:${port}/api/health`);
});
