// Test script to verify backend endpoints
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001/api';

async function testEndpoints() {
  console.log('🧪 Testing backend endpoints...\n');

  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${API_BASE}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health:', healthData);
  } catch (error) {
    console.log('❌ Health endpoint failed:', error.message);
  }

  try {
    // Test registration
    console.log('\n2. Testing registration...');
    const registerData = {
      name: 'Test User',
      email: `test${Date.now()}@example.com`, // Unique email
      password: 'password123'
    };

    const registerResponse = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registerData)
    });

    const registerResult = await registerResponse.json();
    console.log('✅ Registration:', registerResult);

    if (registerResult.success && registerResult.token) {
      // Test login with the same credentials
      console.log('\n3. Testing login...');
      const loginResponse = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: registerData.email,
          password: registerData.password
        })
      });

      const loginResult = await loginResponse.json();
      console.log('✅ Login:', loginResult);

      // Test protected endpoint
      if (loginResult.success && loginResult.token) {
        console.log('\n4. Testing protected endpoint...');
        const meResponse = await fetch(`${API_BASE}/auth/me`, {
          headers: { 
            'Authorization': `Bearer ${loginResult.token}`,
            'Content-Type': 'application/json'
          }
        });

        const meResult = await meResponse.json();
        console.log('✅ Protected endpoint:', meResult);
      }
    }
  } catch (error) {
    console.log('❌ Auth endpoints failed:', error.message);
  }

  console.log('\n🎉 Test completed!');
}

testEndpoints();
