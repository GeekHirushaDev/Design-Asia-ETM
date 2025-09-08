// Test script to register a new user
const axios = require('axios');

async function registerUser() {
  try {
    const response = await axios.post('http://localhost:5000/api/auth/register', {
      email: 'test@example.com',
      password: 'Test123!',
      firstName: 'Test',
      lastName: 'User',
      department: 'Testing'
    });
    
    console.log('User registration response:', response.data);
  } catch (error) {
    console.error('Registration error:', error.response?.data || error.message);
  }
}

registerUser();
