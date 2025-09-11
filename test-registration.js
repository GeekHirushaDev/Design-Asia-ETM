// Test registration endpoint
const fetch = require('node-fetch');

async function testRegistration() {
  try {
    console.log('🧪 Testing registration endpoint...');
    
    const userData = {
      name: 'Test User',
      email: `test${Date.now()}@example.com`,
      password: 'password123'
    };
    
    console.log('Sending data:', userData);
    
    const response = await fetch('http://localhost:3001/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRegistration();
