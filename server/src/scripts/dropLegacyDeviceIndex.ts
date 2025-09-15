import mongoose from 'mongoose';
import { config } from '../config/config.js';

async function dropLegacyDeviceIndex() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(config.MONGODB_URI);
    const db = mongoose.connection.db;

    if (!db) throw new Error('Database connection not established');

    const collection = db.collection('devices');
    const indexes = await collection.indexes();
    console.log('📚 Current indexes on devices:', indexes.map(i => i.name));

    const legacy = indexes.find(i => i.name === 'deviceId_1');
    if (!legacy) {
      console.log('✅ Legacy index deviceId_1 not found. Nothing to drop.');
    } else {
      console.log('🗑️ Dropping legacy index deviceId_1 ...');
      await collection.dropIndex('deviceId_1');
      console.log('✅ Dropped legacy index deviceId_1');
    }

    // Ensure compound unique index exists
    console.log('🔧 Ensuring compound index { userId: 1, deviceId: 1 } (unique) ...');
    await collection.createIndex({ userId: 1, deviceId: 1 }, { unique: true, name: 'userId_1_deviceId_1' });
    console.log('✅ Compound unique index ensured');
  } catch (err) {
    console.error('❌ Failed to drop legacy index:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected');
  }
}

dropLegacyDeviceIndex();



