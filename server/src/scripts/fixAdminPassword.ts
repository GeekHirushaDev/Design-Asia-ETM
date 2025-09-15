import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../config/config.js';
import User from '../models/User.js';

async function fixAdminPassword() {
  try {
    console.log('🔗 Connecting to database...');
    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ Connected to database');

    const email = 'admin@company.com';
    const newPassword = 'admin123';

    console.log(`\n🔧 Fixing password for: ${email}`);

    // Find the admin user
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log(`✅ Found user: ${user.name}`);
    
    // Hash the new password
    console.log('🔐 Hashing new password...');
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update the user
    user.password = hashedPassword;
    await user.save();
    
    console.log('✅ Password updated successfully');
    
    // Test the new password
    console.log('\n🧪 Testing new password...');
    const isValid = await bcrypt.compare(newPassword, user.password);
    
    if (isValid) {
      console.log('✅ Password test SUCCESSFUL');
      console.log('\n🎉 Admin login is now working!');
      console.log('\nCredentials:');
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${newPassword}`);
    } else {
      console.log('❌ Password test FAILED');
    }

  } catch (error) {
    console.error('❌ Error fixing password:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
}

fixAdminPassword();