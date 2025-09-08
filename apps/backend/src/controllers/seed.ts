import mongoose from 'mongoose';
import { User } from '../models/User';
import config from '../config';

const seedUsers = [
  {
    name: 'Admin User',
    email: 'admin@taskvision.com',
    password: 'admin123',
    role: 'admin' as const,
  },
  {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'password123',
    role: 'user' as const,
  },
  {
    name: 'Jane Smith',
    email: 'jane@example.com',
    password: 'password123',
    role: 'user' as const,
  },
];

export const seedDatabase = async (): Promise<void> => {
  try {
    console.log('🌱 Starting database seeding...');

    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(config.mongoUri);
      console.log('📦 Connected to MongoDB for seeding');
    }

    // Clear existing users
    await User.deleteMany({});
    console.log('🗑️  Cleared existing users');

    // Create seed users
    const createdUsers = await User.create(seedUsers);
    console.log(`✅ Created ${createdUsers.length} seed users:`);
    
    createdUsers.forEach(user => {
      console.log(`   - ${user.name} (${user.email}) - Role: ${user.role}`);
    });

    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
};

export default seedDatabase;
