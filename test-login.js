// Quick test to verify demo credentials work
import fetch from 'node-fetch';

const testLogin = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@taskmanager.com',
        password: 'admin123'
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Login successful!');
      console.log('User:', data.user);
      console.log('Token received:', !!data.token);
    } else {
      console.log('❌ Login failed:', data);
    }
  } catch (error) {
    console.error('❌ Connection error:', error.message);
  }
};

testLogin();