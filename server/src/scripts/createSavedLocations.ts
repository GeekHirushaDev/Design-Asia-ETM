import mongoose from 'mongoose';
import Location from '../models/Location.js';
import User from '../models/User.js';
import { config } from '../config/config.js';

interface LocationData {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  description?: string;
}

const savedLocations: LocationData[] = [
  {
    name: "Head Office - IT Department",
    address: "456 Galle Road, Colombo 03, Sri Lanka",
    latitude: 6.9271,
    longitude: 79.8612,
    radiusMeters: 50,
    description: "Main IT department location with secure server rooms"
  },
  {
    name: "World Trade Center",
    address: "World Trade Center, Echelon Square, Colombo 01, Sri Lanka", 
    latitude: 6.9344,
    longitude: 79.8428,
    radiusMeters: 100,
    description: "Client meeting venue and business center"
  },
  {
    name: "Kandy Branch Office",
    address: "123 Temple Street, Kandy, Sri Lanka",
    latitude: 7.2906,
    longitude: 80.6337,
    radiusMeters: 200,
    description: "Regional office for central province operations"
  },
  {
    name: "Galle Branch Office", 
    address: "Fort Area, Galle, Sri Lanka",
    latitude: 6.0367,
    longitude: 80.2170,
    radiusMeters: 150,
    description: "Southern province branch with equipment storage"
  },
  {
    name: "Negombo Branch Office",
    address: "78 Main Street, Negombo, Sri Lanka", 
    latitude: 7.2083,
    longitude: 79.8358,
    radiusMeters: 100,
    description: "Coastal branch office for network infrastructure"
  },
  {
    name: "Training Center - Moratuwa",
    address: "University of Moratuwa Campus, Moratuwa, Sri Lanka",
    latitude: 6.7964,
    longitude: 79.9003,
    radiusMeters: 300,
    description: "Staff training and development facility"
  }
];

async function createSavedLocations() {
  try {
    console.log('🔗 Connecting to database...');
    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ Connected to database');

    // Find an admin user to use as creator
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      throw new Error('No admin user found. Please create admin users first.');
    }

    console.log('🧹 Clearing existing locations...');
    await Location.deleteMany({});
    console.log('✅ Existing locations cleared');

    console.log('📍 Creating saved locations...');
    
    for (const locationData of savedLocations) {
      const location = new Location({
        ...locationData,
        createdBy: adminUser._id,
        isActive: true
      });
      
      await location.save();
      console.log(`✅ Created location: ${locationData.name}`);
    }

    console.log('\n🎉 All saved locations created successfully!');
    console.log(`📊 Total locations: ${savedLocations.length}`);
    
    console.log('\n📍 Created Locations:');
    savedLocations.forEach((loc, index) => {
      console.log(`   ${index + 1}. ${loc.name} (${loc.radiusMeters}m radius)`);
      console.log(`      ${loc.address}`);
      console.log(`      Lat: ${loc.latitude}, Lng: ${loc.longitude}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error creating saved locations:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

createSavedLocations();