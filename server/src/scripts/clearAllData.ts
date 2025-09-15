import mongoose from 'mongoose';
import { config } from '../config/config.js';

async function clearAllData() {
  try {
    console.log('🔗 Connecting to database...');
    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ Connected to database');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    console.log('🗑️ Clearing all data...');
    const collections = await db.listCollections().toArray();
    
    for (const collection of collections) {
      try {
        await db.collection(collection.name).deleteMany({});
        console.log(`✅ Cleared collection: ${collection.name}`);
      } catch (error) {
        console.log(`⚠️ Could not clear ${collection.name}: ${error}`);
      }
    }

    console.log('🧹 All data cleared successfully');

  } catch (error) {
    console.error('❌ Error clearing data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

clearAllData();