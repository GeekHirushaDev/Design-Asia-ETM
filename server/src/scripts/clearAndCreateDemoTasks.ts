import mongoose from 'mongoose';
import Task from '../models/Task.js';
import User from '../models/User.js';
import Team from '../models/Team.js';
import Location from '../models/Location.js';
import { config } from '../config/config.js';

const demoTasks = [
  {
    title: 'Client Site Visit - ABC Corporation',
    description: 'Conduct quarterly site inspection and system maintenance at ABC Corporation headquarters. Check all IT infrastructure, security systems, and provide technical support.',
    priority: 'high',
    status: 'not_started',
    assignmentType: 'individual',
    estimateMinutes: 240, // 4 hours
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    tags: ['client-visit', 'maintenance', 'inspection'],
    location: {
      lat: 6.9271,
      lng: 79.8612,
      radiusMeters: 50,
      address: 'ABC Corporation, World Trade Center, Colombo 01, Sri Lanka'
    }
  },
  {
    title: 'Team Project - Mobile App Development',
    description: 'Collaborative development of the new mobile application. This is a team effort requiring coordination between multiple developers and the team leader.',
    priority: 'high',
    status: 'not_started',
    assignmentType: 'team',
    estimateMinutes: 480, // 8 hours
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    tags: ['mobile', 'development', 'team-project'],
    location: {
      lat: 6.9147,
      lng: 79.8587,
      radiusMeters: 100,
      address: 'Development Office, Marine Drive, Colombo 06, Sri Lanka'
    }
  },
  {
    title: 'Database Optimization Task',
    description: 'Optimize database queries and improve system performance. This task includes indexing, query optimization, and performance testing.',
    priority: 'medium',
    status: 'not_started',
    assignmentType: 'individual',
    estimateMinutes: 180, // 3 hours
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    tags: ['database', 'optimization', 'performance']
    // No location requirement
  },
  {
    title: 'Security Audit - Kandy Branch',
    description: 'Comprehensive security audit of the Kandy branch office. Review access controls, network security, and physical security measures.',
    priority: 'high',
    status: 'not_started',
    assignmentType: 'team',
    estimateMinutes: 360, // 6 hours
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
    tags: ['security', 'audit', 'branch-office'],
    location: {
      lat: 7.2906,
      lng: 80.6337,
      radiusMeters: 200,
      address: 'Kandy Branch Office, Temple Street, Kandy, Sri Lanka'
    }
  }
];

const demoLocations = [
  {
    name: 'Head Office',
    address: 'Main Office Building, Galle Road, Colombo 03, Sri Lanka',
    latitude: 6.9271,
    longitude: 79.8612,
    radiusMeters: 100,
    description: 'Primary office location with all departments'
  },
  {
    name: 'Kandy Branch',
    address: 'Branch Office, Temple Street, Kandy, Sri Lanka',
    latitude: 7.2906,
    longitude: 80.6337,
    radiusMeters: 150,
    description: 'Regional branch office in Kandy'
  },
  {
    name: 'Client Site - ABC Corp',
    address: 'ABC Corporation, World Trade Center, Colombo 01, Sri Lanka',
    latitude: 6.9319,
    longitude: 79.8478,
    radiusMeters: 50,
    description: 'Client location for on-site work'
  }
];

async function clearAndCreateDemoTasks() {
  try {
    console.log('🔗 Connecting to database...');
    await mongoose.connect(config.MONGODB_URI);

    // Clear existing demo data
    console.log('🧹 Clearing existing demo tasks and locations...');
    await Task.deleteMany({ 
      title: { $in: demoTasks.map(t => t.title) }
    });
    await Location.deleteMany({ 
      name: { $in: demoLocations.map(l => l.name) }
    });

    // Get users and teams for assignment
    const admin = await User.findOne({ role: 'admin' });
    const employees = await User.find({ role: 'employee' }).limit(5);
    const teams = await Team.find().populate('leader members');

    if (!admin) {
      console.error('❌ No admin user found');
      return;
    }

    if (employees.length === 0) {
      console.error('❌ No employee users found');
      return;
    }

    console.log(`📋 Found ${employees.length} employees and ${teams.length} teams`);

    // Create demo locations
    console.log('📍 Creating demo locations...');
    const createdLocations = [];
    for (const locationData of demoLocations) {
      const location = new Location({
        ...locationData,
        createdBy: admin._id,
      });
      await location.save();
      createdLocations.push(location);
      console.log(`✅ Created location: ${location.name}`);
    }

    // Create demo tasks
    console.log('📋 Creating demo tasks...');
    const createdTasks = [];
    
    for (let i = 0; i < demoTasks.length; i++) {
      const taskData = demoTasks[i];
      
      const task: any = {
        ...taskData,
        createdBy: admin._id,
      };

      if (taskData.assignmentType === 'individual') {
        // Assign to a specific employee
        const assignedEmployee = employees[i % employees.length];
        task.assignedTo = [assignedEmployee._id];
        console.log(`  → Assigned to: ${assignedEmployee.name}`);
      } else if (taskData.assignmentType === 'team' && teams.length > 0) {
        // Assign to a team
        const assignedTeam = teams[i % teams.length];
        task.assignedTeam = assignedTeam._id;
        console.log(`  → Assigned to team: ${assignedTeam.name} (Leader: ${assignedTeam.leader?.name})`);
      }

      const createdTask = new Task(task);
      await createdTask.save();
      createdTasks.push(createdTask);
      
      console.log(`✅ Created task: ${createdTask.title}`);
      console.log(`  Priority: ${createdTask.priority}`);
      console.log(`  Status: ${createdTask.status}`);
      console.log(`  Assignment: ${createdTask.assignmentType}`);
      if (createdTask.location) {
        console.log(`  Location: ${createdTask.location.address} (${createdTask.location.radiusMeters}m radius)`);
      }
      console.log(`  Estimate: ${createdTask.estimateMinutes} minutes`);
    }

    console.log('\n🎉 Demo data created successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Tasks: ${createdTasks.length}`);
    console.log(`   Locations: ${createdLocations.length}`);
    console.log(`   Individual tasks: ${createdTasks.filter(t => t.assignmentType === 'individual').length}`);
    console.log(`   Team tasks: ${createdTasks.filter(t => t.assignmentType === 'team').length}`);
    console.log(`   Tasks with location: ${createdTasks.filter(t => t.location).length}`);
    
    console.log('\n🧪 Testing Instructions:');
    console.log('1. Login as admin (admin@company.com / admin123)');
    console.log('2. View all tasks in Task Management');
    console.log('3. Test admin status override (direct status change)');
    console.log('4. Login as employee and test individual task flow:');
    console.log('   - Not Started → Start → In Progress');
    console.log('   - In Progress → Pause → Paused');
    console.log('   - Paused → Resume → In Progress');
    console.log('   - In Progress → Complete → Completed');
    console.log('5. Test team task with team leader permissions');
    console.log('6. Test location enforcement (within/outside radius)');
    console.log('7. Upload and download attachments');
    console.log('8. View time analytics and efficiency calculations');

  } catch (error) {
    console.error('❌ Error creating demo data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
}

clearAndCreateDemoTasks();