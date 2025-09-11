const API_BASE = 'http://localhost:5000/api';

// Test registration
fetch(`${API_BASE}/auth/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Test User',
    email: 'testuser@taskvision.com',
    password: 'testpass123'
  })
})
.then(res => res.json())
.then(data => {
  console.log('Registration response:', data);
  
  if (data.success && data.token) {
    // Test login with same credentials
    return fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'testuser@taskvision.com',
        password: 'testpass123'
      })
    });
  } else {
    // Try login anyway in case user exists
    return fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'testuser@taskvision.com',
        password: 'testpass123'
      })
    });
  }
})
.then(res => res.json())
.then(data => {
  console.log('Login response:', data);
  
  if (data.success && data.token) {
    // Test protected route
    return fetch(`${API_BASE}/users`, {
      headers: { 
        'Authorization': `Bearer ${data.token}`,
        'Content-Type': 'application/json'
      }
    });
  }
})
.then(res => res.json())
.then(data => {
  console.log('Protected route response:', data);
  console.log('🎉 Authentication flow test completed!');
})
.catch(err => {
  console.error('Test failed:', err);
});
