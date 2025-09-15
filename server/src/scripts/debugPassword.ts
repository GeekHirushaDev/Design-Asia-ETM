import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../config/config.js';
import User from '../models/User.js';

async function debugPassword() {
  try {
    console.log('🔗 Connecting to database...');
    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ Connected to database');

    const email = 'admin@company.com';
    const testPassword = 'admin123';

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('\n📋 User Debug Info:');
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Password Hash: ${user.password}`);
    console.log(`   Hash Length: ${user.password.length}`);
    console.log(`   Starts with $2: ${user.password.startsWith('$2')}`);

    console.log('\n🔐 Password Testing:');
    console.log(`   Test Password: "${testPassword}"`);
    console.log(`   Test Password Length: ${testPassword.length}`);

    // Test different bcrypt methods
    console.log('\n🧪 Bcrypt Tests:');
    
    // Test 1: Direct comparison
    const result1 = await bcrypt.compare(testPassword, user.password);
    console.log(`   1. bcrypt.compare() result: ${result1}`);

    // Test 2: Create a new hash and compare
    const newHash = await bcrypt.hash(testPassword, 12);
    console.log(`   2. New hash created: ${newHash}`);
    const result2 = await bcrypt.compare(testPassword, newHash);
    console.log(`   3. New hash comparison: ${result2}`);

    // Test 3: Compare the stored hash with different passwords
    const result3 = await bcrypt.compare('admin', user.password);
    const result4 = await bcrypt.compare('admin123', user.password);
    const result5 = await bcrypt.compare('Admin123', user.password);
    console.log(`   4. Compare "admin": ${result3}`);
    console.log(`   5. Compare "admin123": ${result4}`);
    console.log(`   6. Compare "Admin123": ${result5}`);

    // Update with a fresh hash
    console.log('\n🔄 Creating fresh password hash...');
    const freshHash = await bcrypt.hash('admin123', 12);
    await User.updateOne({ email }, { password: freshHash });
    console.log('✅ Password updated with fresh hash');

    // Test the fresh hash
    const updatedUser = await User.findOne({ email });
    const finalTest = await bcrypt.compare('admin123', updatedUser!.password);
    console.log(`   Final test result: ${finalTest}`);

    if (finalTest) {
      console.log('\n🎉 SUCCESS! Admin login is now working!');
    } else {
      console.log('\n❌ Still not working - deeper investigation needed');
    }

  } catch (error) {
    console.error('❌ Error in debug:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
}

debugPassword();