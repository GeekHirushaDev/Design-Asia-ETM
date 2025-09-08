import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User';

// Load environment variables
dotenv.config();

// Define demo user data
const demoUsers = [
  {
    email: 'admin@designasia.com',
    password: 'Admin123!',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    department: 'Management',
    isActive: true
  },
  {
    email: 'manager@designasia.com',
    password: 'Manager123!',
    firstName: 'Manager',
    lastName: 'User',
    role: 'admin',
    department: 'Design',
    isActive: true
  },
  {
    email: 'employee1@designasia.com',
    password: 'Employee123!',
    firstName: 'John',
    lastName: 'Doe',
    role: 'employee',
    department: 'Design',
    isActive: true
  },
  {
    email: 'employee2@designasia.com',
    password: 'Employee123!',
    firstName: 'Jane',
    lastName: 'Smith',
    role: 'employee',
    department: 'Development',
    isActive: true
  },
  {
    email: 'employee3@designasia.com',
    password: 'Employee123!',
    firstName: 'Bob',
    lastName: 'Johnson',
    role: 'employee',
    department: 'Marketing',
    isActive: true
  }
];

/**
 * Seed the database with demo users
 */
const seedDemoUsers = async (): Promise<void> => {
  try {
    // Connect to the database
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskvision';
    await mongoose.connect(mongoUri);
    console.log(`✅ MongoDB Connected: ${mongoUri}`);

    // Clear existing users first (optional)
    console.log('🗑️ Clearing existing users...');
    await User.deleteMany({});

    // Create users
    console.log('🌱 Seeding demo users...');
    for (const userData of demoUsers) {
      await User.create(userData);
      console.log(`✅ Created user: ${userData.email}`);
    }

    console.log('✅ Database seeding completed!');
    console.log('\n🔐 Demo User Credentials:');
    console.log('----------------------------------');
    console.log('Role: Admin');
    console.log('Email: admin@designasia.com');
    console.log('Password: Admin123!');
    console.log('----------------------------------');
    console.log('Role: Manager');
    console.log('Email: manager@designasia.com');
    console.log('Password: Manager123!');
    console.log('----------------------------------');
    console.log('Role: Employee');
    console.log('Email: employee1@designasia.com');
    console.log('Password: Employee123!');
    console.log('----------------------------------');

    // Disconnect from the database
    await mongoose.disconnect();
    console.log('👋 MongoDB Disconnected');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run the seed function
seedDemoUsers();
