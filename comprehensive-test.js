// Test server startup and admin login
import { spawn } from 'child_process';
import fetch from 'node-fetch';

const testServerAndLogin = async () => {
  console.log('🚀 Starting server...');
  
  // Start the server
  const serverProcess = spawn('npx', ['tsx', 'src/server.ts'], {
    cwd: 'c:\\Users\\User\\Documents\\GitHub\\Temp\\Design-Asia-ETM\\server',
    stdio: 'pipe'
  });

  // Wait for server to start
  let serverReady = false;
  
  serverProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log('Server:', output.trim());
    if (output.includes('🚀 Server running on port 3001')) {
      serverReady = true;
      testLogin();
    }
  });

  serverProcess.stderr.on('data', (data) => {
    console.error('Server Error:', data.toString());
  });

  const testLogin = async () => {
    console.log('🔍 Testing admin login...');
    
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
        console.log('User role:', data.user?.role);
        console.log('User email:', data.user?.email);
      } else {
        console.log('❌ Login failed:', data);
      }
    } catch (error) {
      console.error('❌ Connection error:', error.message);
    }
    
    // Clean up
    setTimeout(() => {
      console.log('🛑 Stopping server...');
      serverProcess.kill();
      process.exit(0);
    }, 2000);
  };

  // Timeout in case server doesn't start
  setTimeout(() => {
    if (!serverReady) {
      console.log('❌ Server failed to start within timeout');
      serverProcess.kill();
      process.exit(1);
    }
  }, 15000);
};

testServerAndLogin();