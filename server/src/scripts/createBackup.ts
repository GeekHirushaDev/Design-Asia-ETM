import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { config } from '../config/config.js';

async function createBackup() {
  try {
    console.log('🔗 Connecting to database...');
    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ Connected to database');

    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup-${timestamp}.json`);

    console.log('📦 Creating database backup...');
    
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const backup: any = {};

    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`  📄 Backing up collection: ${collectionName}`);
      const data = await db.collection(collectionName).find({}).toArray();
      backup[collectionName] = data;
      console.log(`    ✅ ${data.length} documents backed up`);
    }

    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    console.log(`💾 Backup created: ${backupFile}`);
    
    console.log('\n📊 Backup Summary:');
    Object.keys(backup).forEach(collection => {
      console.log(`  ${collection}: ${backup[collection].length} documents`);
    });

  } catch (error) {
    console.error('❌ Backup failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

createBackup();