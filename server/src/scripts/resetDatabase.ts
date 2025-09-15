import mongoose from 'mongoose';
import { config } from '../config/config.js';

async function resetDatabase() {
  try {
    console.log('🔗 Connecting to database...');
    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ Connected to database');

    console.log('🗑️ Dropping all collections...');
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }
    
    const collections = await db.listCollections().toArray();
    
    for (const collection of collections) {
      console.log(`  🗑️ Dropping collection: ${collection.name}`);
      await db.collection(collection.name).drop();
      console.log(`    ✅ Dropped ${collection.name}`);
    }

    console.log('🧹 Database reset complete - all data cleared');
    console.log('📊 Collections dropped:', collections.length);

  } catch (error) {
    console.error('❌ Database reset failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

resetDatabase();