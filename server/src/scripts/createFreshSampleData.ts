import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Role from '../models/Role.js';
import Task from '../models/Task.js';
import Location from '../models/Location.js';
import { config } from '../config/config.js';

interface UserData {
  prefix: 'Mr' | 'Mrs' | 'Miss' | 'Dr' | 'Prof';
  firstName: string;
  lastName: string;
  name: string;
  username: string;
  email: string;
  mobile: string;
  password: string;
  role: string;
  status: 'active' | 'inactive';
}

const sampleUsers: UserData[] = [
  {
    prefix: 'Mr',
    firstName: 'Admin',
    lastName: 'User',
    name: 'Admin User',
    username: 'admin',
    email: 'admin@company.com',
    mobile: '+94771234567',
    password: 'admin123',
    role: 'admin',
    status: 'active'
  },
  {
    prefix: 'Mr',
    firstName: 'John',
    lastName: 'Silva',
    name: 'John Silva',
    username: 'john.silva',
    email: 'john.silva@company.com',
    mobile: '+94771234568',
    password: 'john123',
    role: 'employee',
    status: 'active'
  },
  {
    prefix: 'Mrs',
    firstName: 'Mary',
    lastName: 'Fernando',
    name: 'Mary Fernando',
    username: 'mary.fernando',
    email: 'mary.fernando@company.com',
    mobile: '+94771234569',
    password: 'mary123',
    role: 'employee',
    status: 'active'
  },
  {
    prefix: 'Mr',
    firstName: 'David',
    lastName: 'Perera',
    name: 'David Perera',
    username: 'david.perera',
    email: 'david.perera@company.com',
    mobile: '+94771234570',
    password: 'david123',
    role: 'employee',
    status: 'active'
  },
  {
    prefix: 'Miss',
    firstName: 'Sarah',
    lastName: 'Kumari',
    name: 'Sarah Kumari',
    username: 'sarah.kumari',
    email: 'sarah.kumari@company.com',
    mobile: '+94771234571',
    password: 'sarah123',
    role: 'employee',
    status: 'active'
  }
];

interface LocationData {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  description?: string;
}

const sampleLocations: LocationData[] = [
  {
    name: "Head Office - IT Department",
    address: "456 Galle Road, Colombo 03, Sri Lanka",
    latitude: 6.9271,
    longitude: 79.8612,
    radiusMeters: 50,
    description: "Main IT department location"
  },
  {
    name: "World Trade Center",
    address: "World Trade Center, Echelon Square, Colombo 01, Sri Lanka", 
    latitude: 6.9344,
    longitude: 79.8428,
    radiusMeters: 100,
    description: "Client meeting venue"
  },
  {
    name: "Kandy Branch Office",
    address: "123 Temple Street, Kandy, Sri Lanka",
    latitude: 7.2906,
    longitude: 80.6337,
    radiusMeters: 200,
    description: "Regional office for central province"
  }
];

async function createFreshSampleData() {
  try {
    console.log('🔗 Connecting to database...');
    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ Connected to database');

    // Create users
    console.log('👥 Creating sample users...');
    const createdUsers: any[] = [];
    
    for (const userData of sampleUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      const user = new User({
        ...userData,
        password: hashedPassword
      });
      
      await user.save();
      createdUsers.push(user);
      console.log(`✅ Created user: ${userData.name} (${userData.email})`);
    }

    // Create locations
    console.log('\n📍 Creating sample locations...');
    const createdLocations: any[] = [];
    const adminUser = createdUsers.find(u => u.role === 'admin');
    
    for (const locationData of sampleLocations) {
      const location = new Location({
        ...locationData,
        createdBy: adminUser._id,
        isActive: true
      });
      
      await location.save();
      createdLocations.push(location);
      console.log(`✅ Created location: ${locationData.name}`);
    }

    // Create teams
    console.log('\n🏢 Creating sample teams...');
    const employees = createdUsers.filter(u => u.role === 'employee');
    
    const team1 = new Team({
      name: 'Development Team',
      description: 'Software development and engineering team',
      leader: employees[0]._id,
      members: [employees[0]._id, employees[1]._id, employees[2]._id],
      createdBy: adminUser._id,
      isActive: true
    });
    await team1.save();
    console.log('✅ Created team: Development Team');

    const team2 = new Team({
      name: 'Operations Team', 
      description: 'Operations and support team',
      leader: employees[3]._id,
      members: [employees[3]._id],
      createdBy: adminUser._id,
      isActive: true
    });
    await team2.save();
    console.log('✅ Created team: Operations Team');

    // Create sample tasks
    console.log('\n📋 Creating sample tasks...');
    
    const task1 = new Task({
      title: 'Database Optimization Project',
      description: 'Optimize database queries and improve performance',
      priority: 'high',
      status: 'not_started',
      estimatedMinutes: 480,
      assignmentType: 'individual',
      assignedTo: [employees[0]._id],
      location: createdLocations[0]._id,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdBy: adminUser._id
    });
    await task1.save();
    console.log('✅ Created task: Database Optimization Project');

    const task2 = new Task({
      title: 'Client Meeting - System Demo',
      description: 'Present system demo to potential client',
      priority: 'medium',
      status: 'not_started',
      estimatedMinutes: 120,
      assignmentType: 'team',
      assignedTeam: team1._id,
      location: createdLocations[1]._id,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      createdBy: adminUser._id
    });
    await task2.save();
    console.log('✅ Created task: Client Meeting - System Demo');

    const task3 = new Task({
      title: 'Security Audit - Kandy Branch',
      description: 'Conduct security audit at Kandy branch office',
      priority: 'high',
      status: 'not_started',
      estimatedMinutes: 240,
      assignmentType: 'individual',
      assignedTo: [employees[2]._id],
      location: createdLocations[2]._id,
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      createdBy: adminUser._id
    });
    await task3.save();
    console.log('✅ Created task: Security Audit - Kandy Branch');

    console.log('\n🎉 Fresh sample data created successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Users: ${createdUsers.length} (1 admin, ${employees.length} employees)`);
    console.log(`   Locations: ${createdLocations.length}`);
    console.log(`   Teams: 2`);
    console.log(`   Tasks: 3`);
    
    console.log('\n🔐 Login Credentials:');
    sampleUsers.forEach(user => {
      console.log(`   ${user.name}: ${user.email} / ${user.password}`);
    });

  } catch (error) {
    console.error('❌ Error creating sample data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
}

createFreshSampleData();