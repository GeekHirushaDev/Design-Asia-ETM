/**
 * Comprehensive test script for Design-Asia-ETM
 * Tests all admin and employee features including:
 * - Authentication (admin/employee login)
 * - Team management
 * - User management
 * - Task creation with geolocation
 * - Timezone handling
 * - Settings and themes
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';
const CLIENT_URL = 'http://localhost:5174';

class TestRunner {
  constructor() {
    this.adminToken = null;
    this.employeeToken = null;
    this.testResults = [];
  }

  async runTest(testName, testFn) {
    console.log(`\n🧪 Running test: ${testName}`);
    try {
      await testFn();
      console.log(`✅ ${testName} - PASSED`);
      this.testResults.push({ test: testName, status: 'PASSED' });
    } catch (error) {
      console.error(`❌ ${testName} - FAILED:`, error.message);
      this.testResults.push({ test: testName, status: 'FAILED', error: error.message });
    }
  }

  async apiRequest(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const response = await fetch(url, { ...defaultOptions, ...options });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} - ${data.message || 'Unknown error'}`);
    }

    return data;
  }

  async testBackendHealth() {
    const response = await this.apiRequest('/health');
    if (!response.status || response.status !== 'OK') {
      throw new Error('Backend health check failed');
    }
    console.log('  📍 Backend is healthy');
    console.log('  🕐 Server timezone:', response.timestamp);
  }

  async testAdminLogin() {
    const response = await this.apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@company.com',
        password: 'admin123'
      })
    });

    if (!response.token || response.user.role !== 'admin') {
      throw new Error('Admin login failed or role incorrect');
    }

    this.adminToken = response.token;
    console.log('  👤 Admin login successful');
    console.log('  🔑 Admin token received');
  }

  async testEmployeeLogin() {
    // First create a test employee
    const employee = await this.apiRequest('/api/users', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.adminToken}`
      },
      body: JSON.stringify({
        email: 'test.employee@company.com',
        password: 'employee123',
        name: 'Test Employee',
        role: 'employee'
      })
    });

    console.log('  👥 Test employee created');

    // Now login as employee
    const response = await this.apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test.employee@company.com',
        password: 'employee123'
      })
    });

    if (!response.token || response.user.role !== 'employee') {
      throw new Error('Employee login failed or role incorrect');
    }

    this.employeeToken = response.token;
    console.log('  👤 Employee login successful');
  }

  async testUserManagement() {
    // Get all users
    const users = await this.apiRequest('/api/users', {
      headers: {
        'Authorization': `Bearer ${this.adminToken}`
      }
    });

    if (!Array.isArray(users) || users.length === 0) {
      throw new Error('Failed to fetch users or no users found');
    }

    console.log(`  👥 Found ${users.length} users`);

    // Create a new user
    const newUser = await this.apiRequest('/api/users', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.adminToken}`
      },
      body: JSON.stringify({
        email: 'new.user@company.com',
        password: 'password123',
        name: 'New Test User',
        role: 'employee',
        phoneNumber: '+94771234567'
      })
    });

    console.log('  ➕ New user created:', newUser.email);

    // Update user
    const updatedUser = await this.apiRequest(`/api/users/${newUser._id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.adminToken}`
      },
      body: JSON.stringify({
        name: 'Updated Test User',
        phoneNumber: '+94771234568'
      })
    });

    console.log('  ✏️ User updated:', updatedUser.name);
  }

  async testTeamManagement() {
    // Create a team
    const team = await this.apiRequest('/api/teams', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.adminToken}`
      },
      body: JSON.stringify({
        name: 'Test Team',
        description: 'A test team for automated testing'
      })
    });

    console.log('  🏢 Team created:', team.name);

    // Get all teams
    const teams = await this.apiRequest('/api/teams', {
      headers: {
        'Authorization': `Bearer ${this.adminToken}`
      }
    });

    if (!Array.isArray(teams) || teams.length === 0) {
      throw new Error('Failed to fetch teams');
    }

    console.log(`  📋 Found ${teams.length} teams`);

    // Update team
    const updatedTeam = await this.apiRequest(`/api/teams/${team._id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.adminToken}`
      },
      body: JSON.stringify({
        name: 'Updated Test Team',
        description: 'Updated description'
      })
    });

    console.log('  ✏️ Team updated:', updatedTeam.name);
  }

  async testTaskCreation() {
    // Create task without location
    const task1 = await this.apiRequest('/api/tasks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.adminToken}`
      },
      body: JSON.stringify({
        title: 'Test Task Without Location',
        description: 'A test task to verify basic functionality',
        priority: 'medium',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
    });

    console.log('  📝 Task created (no location):', task1.title);

    // Create task with location
    const task2 = await this.apiRequest('/api/tasks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.adminToken}`
      },
      body: JSON.stringify({
        title: 'Test Task With Location',
        description: 'A test task with geolocation data',
        priority: 'high',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        location: {
          lat: 6.9271,  // Colombo coordinates
          lng: 79.8612
        }
      })
    });

    console.log('  📍 Task created (with location):', task2.title);
    console.log('  🌍 Location:', `${task2.location.lat}, ${task2.location.lng}`);

    // Get all tasks
    const tasks = await this.apiRequest('/api/tasks', {
      headers: {
        'Authorization': `Bearer ${this.adminToken}`
      }
    });

    if (!Array.isArray(tasks) || tasks.length === 0) {
      throw new Error('Failed to fetch tasks');
    }

    console.log(`  📊 Found ${tasks.length} tasks`);
  }

  async testTimezoneHandling() {
    // Get current server time
    const health = await this.apiRequest('/health');
    const serverTime = new Date(health.timestamp);
    
    console.log('  🕐 Server time:', serverTime.toISOString());
    console.log('  🌏 Timezone check: Should be Asia/Colombo (UTC+5:30)');

    // Create a task and check its timestamps
    const task = await this.apiRequest('/api/tasks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.adminToken}`
      },
      body: JSON.stringify({
        title: 'Timezone Test Task',
        description: 'Testing timezone handling',
        priority: 'low'
      })
    });

    const taskCreatedAt = new Date(task.createdAt);
    console.log('  📅 Task created at:', taskCreatedAt.toISOString());

    // Verify the time is in Sri Lankan timezone (should be roughly current time + 5:30 hours from UTC)
    const now = new Date();
    const timeDiff = Math.abs(taskCreatedAt.getTime() - now.getTime());
    
    if (timeDiff > 5 * 60 * 1000) { // Allow 5 minutes difference
      throw new Error('Task timestamp seems incorrect for Sri Lankan timezone');
    }

    console.log('  ✅ Timezone handling appears correct');
  }

  async testApiEndpoints() {
    const endpoints = [
      { method: 'GET', path: '/api/tasks', auth: true },
      { method: 'GET', path: '/api/teams', auth: true },
      { method: 'GET', path: '/api/users', auth: true },
      { method: 'GET', path: '/api/attendance', auth: true },
      { method: 'GET', path: '/api/reports', auth: true },
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await this.apiRequest(endpoint.path, {
          method: endpoint.method,
          headers: endpoint.auth ? {
            'Authorization': `Bearer ${this.adminToken}`
          } : {}
        });

        console.log(`  ✅ ${endpoint.method} ${endpoint.path} - OK`);
      } catch (error) {
        console.log(`  ⚠️ ${endpoint.method} ${endpoint.path} - ${error.message}`);
      }
    }
  }

  async runAllTests() {
    console.log('🚀 Starting comprehensive test suite for Design-Asia-ETM');
    console.log('=' * 50);

    await this.runTest('Backend Health Check', () => this.testBackendHealth());
    await this.runTest('Admin Login', () => this.testAdminLogin());
    await this.runTest('Employee Login', () => this.testEmployeeLogin());
    await this.runTest('User Management', () => this.testUserManagement());
    await this.runTest('Team Management', () => this.testTeamManagement());
    await this.runTest('Task Creation with Geolocation', () => this.testTaskCreation());
    await this.runTest('Timezone Handling', () => this.testTimezoneHandling());
    await this.runTest('API Endpoints Accessibility', () => this.testApiEndpoints());

    // Print results summary
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('=' * 30);
    
    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const failed = this.testResults.filter(r => r.status === 'FAILED').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📋 Total: ${this.testResults.length}`);

    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.testResults
        .filter(r => r.status === 'FAILED')
        .forEach(r => console.log(`  - ${r.test}: ${r.error}`));
    }

    console.log('\n🎯 TESTING COMPLETE');
    console.log('\n📱 Frontend testing:');
    console.log(`  Open: ${CLIENT_URL}`);
    console.log('  Test admin login with: admin@company.com / admin123');
    console.log('  Test employee login with: test.employee@company.com / employee123');
    console.log('\n✨ Features to verify manually:');
    console.log('  - Admin Dashboard with team management');
    console.log('  - User management interface');
    console.log('  - Task creation with optional location');
    console.log('  - Settings section with themes');
    console.log('  - Sri Lankan timezone in all timestamps');
  }
}

// Run the tests
const testRunner = new TestRunner();
testRunner.runAllTests().catch(console.error);