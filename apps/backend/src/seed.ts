import mongoose from 'mongoose';
import { seedDatabase } from './controllers/seed';
import config from './config';

const runSeed = async (): Promise<void> => {
  try {
    console.log('🌱 TaskVision Database Seeder');
    console.log('================================');
    
    await seedDatabase();
    
    console.log('================================');
    console.log('✅ Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('📦 Database connection closed');
    process.exit(0);
  }
};

// Run the seeder
runSeed();
