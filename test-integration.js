// Test script to verify frontend-backend integration
console.log('Testing API integration...');

// Test registration
async function testRegistration() {
  try {
    const response = await fetch('http://localhost:3001/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Frontend Test User',
        email: 'frontend@test.com',
        password: 'Frontend123!'
      })
    });
    
    const data = await response.json();
    console.log('Registration test:', data);
    
    if (data.success) {
      // Test login
      const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'frontend@test.com',
          password: 'Frontend123!'
        })
      });
      
      const loginData = await loginResponse.json();
      console.log('Login test:', loginData);
      
      return loginData.success;
    }
    
    return false;
  } catch (error) {
    console.error('API test error:', error);
    return false;
  }
}

testRegistration().then(success => {
  console.log('API Integration Test:', success ? 'PASSED' : 'FAILED');
});
