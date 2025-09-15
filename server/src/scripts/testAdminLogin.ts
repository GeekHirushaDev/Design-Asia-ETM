import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../config/config.js';
import User from '../models/User.js';

async function testAdminLogin() {
  try {
    console.log('🔗 Connecting to database...');
    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ Connected to database');

    // Test admin credentials
    const email = 'admin@company.com';
    const password = 'admin123';

    console.log(`\n🔍 Testing login for: ${email}`);

    // Find user by email
    const user = await User.findOne({ email }).populate('role');
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log(`✅ User found: ${user.name} (${user.username})`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Status: ${user.status}`);
    console.log(`   Required fields check:`);
    console.log(`     - prefix: ${user.prefix || 'MISSING'}`);
    console.log(`     - firstName: ${user.firstName || 'MISSING'}`);
    console.log(`     - lastName: ${user.lastName || 'MISSING'}`);
    console.log(`     - username: ${user.username || 'MISSING'}`);
    console.log(`     - mobile: ${user.mobile || 'MISSING'}`);

    // Test password
    console.log(`\n🔐 Testing password...`);
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (isValidPassword) {
      console.log('✅ Password is valid');
      console.log('✅ LOGIN TEST SUCCESSFUL');
      console.log('\n🎉 The admin account is working correctly!');
      console.log('\nLogin Credentials:');
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
    } else {
      console.log('❌ Password is invalid');
      console.log('❌ LOGIN TEST FAILED');
    }

    // Test all users
    console.log('\n📋 All users in database:');
    const allUsers = await User.find({}).select('name email username role status');
    allUsers.forEach((u: any, index: number) => {
      console.log(`   ${index + 1}. ${u.name} (${u.email}) - ${u.role} - ${u.status}`);
    });

  } catch (error) {
    console.error('❌ Error testing login:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
}

testAdminLogin();