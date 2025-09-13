// Admin login test with server management
console.log('Starting admin login test...');

// Start server job
const { spawn } = require('child_process');
const fetch = require('node-fetch');

const startServerAndTest = async () => {
  console.log('🚀 Starting minimal server...');
  
  // Start the server in background
  const serverProcess = spawn('npx', ['tsx', 'src/minimal-server.ts'], {
    cwd: 'c:\\Users\\User\\Documents\\GitHub\\Temp\\Design-Asia-ETM\\server',
    detached: false,
    stdio: 'pipe'
  });

  let serverStarted = false;

  serverProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log('Server output:', output.trim());
    
    if (output.includes('Ready to test admin login!')) {
      serverStarted = true;
      console.log('✅ Server started, testing login...');
      testLogin();
    }
  });

  serverProcess.stderr.on('data', (data) => {
    console.error('Server error:', data.toString());
  });

  serverProcess.on('exit', (code) => {
    console.log(`❌ Server exited with code ${code}`);
  });

  const testLogin = async () => {
    try {
      console.log('🔍 Testing admin login credentials...');
      
      const response = await fetch('http://localhost:3002/api/auth/login', {
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
        console.log('✅ LOGIN SUCCESSFUL!');
        console.log('📋 User details:');
        console.log('   - Email:', data.user?.email);
        console.log('   - Role:', data.user?.role);
        console.log('   - Name:', data.user?.name);
        console.log('   - Token:', data.token ? 'Received' : 'Not received');
        console.log('\n🎉 Admin credentials are working correctly!');
      } else {
        console.log('❌ LOGIN FAILED:', data);
      }
    } catch (error) {
      console.error('❌ Connection error:', error.message);
    }
    
    // Clean up
    setTimeout(() => {
      console.log('🛑 Stopping server...');
      serverProcess.kill();
      process.exit(0);
    }, 1000);
  };

  // Timeout fallback
  setTimeout(() => {
    if (!serverStarted) {
      console.log('❌ Server did not start within 10 seconds');
      serverProcess.kill();
      process.exit(1);
    }
  }, 10000);
};

startServerAndTest();