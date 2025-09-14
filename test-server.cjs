const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3003;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Admin login test endpoint
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  console.log('📝 Login attempt:', { email, password });
  
  if (email === 'admin@company.com' && password === 'admin123') {
    console.log('✅ Admin login successful!');
    res.json({
      success: true,
      user: { 
        email: 'admin@company.com', 
        role: 'admin', 
        name: 'Admin User',
        id: 'admin-123'
      },
      token: 'jwt-token-placeholder'
    });
  } else {
    console.log('❌ Invalid credentials');
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Test server running on port ${PORT}`);
  console.log('✅ Ready to test admin login!');
  console.log(`📋 Test with: POST http://localhost:${PORT}/api/auth/login`);
  console.log('📋 Credentials: admin@company.com / admin123');
});

// Keep the process alive
process.stdin.resume();