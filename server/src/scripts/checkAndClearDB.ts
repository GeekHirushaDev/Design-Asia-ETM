import mongoose from 'mongoose';
import { config } from '../config/config.js';

async function checkAndClearDB() {
  try {
    console.log('🔗 Connecting to database...');
    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ Connected to database');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    // Check all collections
    const collections = await db.listCollections().toArray();
    console.log('\n📋 Collections in database:');
    
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      console.log(`   ${collection.name}: ${count} documents`);
      
      if (count > 0) {
        // Show sample data
        const sample = await db.collection(collection.name).find({}).limit(2).toArray();
        console.log(`   Sample data:`, sample.map(doc => ({ _id: doc._id, ...Object.keys(doc).slice(0, 3).reduce((obj, key) => ({ ...obj, [key]: doc[key] }), {}) })));
      }
    }

    // Force clear all collections
    console.log('\n🗑️ Force clearing all collections...');
    for (const collection of collections) {
      await db.collection(collection.name).deleteMany({});
      console.log(`✅ Cleared: ${collection.name}`);
    }

    console.log('\n✅ Database fully cleared');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

checkAndClearDB();