import mongoose from 'mongoose';
import Task from '../models/Task.js';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const sampleTasks = [
  {
    title: 'Client Meeting - ABC Corp',
    description: 'Conduct quarterly business review meeting with ABC Corp to discuss project progress and future requirements.',
    assignmentType: 'individual',
    priority: 'high',
    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
    estimateMinutes: 120,
    status: 'not_started',
    location: {
      latitude: 6.9271,
      longitude: 79.8612,
      radiusMeters: 100,
      address: 'ABC Corp Office, World Trade Center, Colombo 01'
    }
  },
  {
    title: 'Database Optimization',
    description: 'Optimize database queries and implement indexing to improve system performance by at least 30%.',
    assignmentType: 'individual',
    priority: 'high',
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    estimateMinutes: 180,
    status: 'in_progress',
    location: {
      latitude: 6.9319,
      longitude: 79.8478,
      radiusMeters: 50,
      address: 'Head Office - IT Department, Galle Road, Colombo 03'
    }
  },
  {
    title: 'Mobile App Testing - iOS',
    description: 'Comprehensive testing of the new mobile application on various iOS devices. Test all features and create bug reports.',
    assignmentType: 'team',
    priority: 'medium',
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    estimateMinutes: 240,
    status: 'not_started'
  },
  {
    title: 'Site Inspection - Kandy Branch',
    description: 'Conduct monthly site inspection at Kandy branch office. Check security systems, IT infrastructure, and facilities.',
    assignmentType: 'individual',
    priority: 'medium',
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    estimateMinutes: 300,
    status: 'not_started',
    location: {
      latitude: 7.2906,
      longitude: 80.6337,
      radiusMeters: 200,
      address: 'Kandy Branch Office, Temple Street, Kandy'
    }
  },
  {
    title: 'Security Audit Report',
    description: 'Prepare comprehensive security audit report based on recent penetration testing and vulnerability assessments.',
    assignmentType: 'team',
    priority: 'high',
    dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
    estimateMinutes: 360,
    status: 'paused'
  },
  {
    title: 'Equipment Maintenance - Galle',
    description: 'Perform scheduled maintenance on server equipment and network infrastructure at Galle office.',
    assignmentType: 'individual',
    priority: 'medium',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
    estimateMinutes: 240,
    status: 'not_started',
    location: {
      latitude: 6.0535,
      longitude: 80.2210,
      radiusMeters: 150,
      address: 'Galle Branch Office, Fort Area, Galle'
    }
  },
  {
    title: 'Staff Training - Cybersecurity',
    description: 'Conduct mandatory cybersecurity awareness training for all staff members. Cover phishing, password security, and data protection.',
    assignmentType: 'team',
    priority: 'low',
    dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
    estimateMinutes: 180,
    status: 'not_started'
  },
  {
    title: 'Network Upgrade - Negombo',
    description: 'Upgrade network infrastructure at Negombo office. Install new switches and configure firewall settings.',
    assignmentType: 'individual',
    priority: 'high',
    dueDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
    estimateMinutes: 420,
    status: 'completed',
    location: {
      latitude: 7.2083,
      longitude: 79.8358,
      radiusMeters: 100,
      address: 'Negombo Branch Office, Main Street, Negombo'
    }
  }
];

async function clearAndSeedTasks() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/design-asia-etm');
    console.log('Connected to database');

    // Clear existing tasks
    console.log('Clearing existing tasks...');
    await Task.deleteMany({});
    console.log('Existing tasks cleared');

    // Get users and teams for assignment
    const users = await User.find({ role: { $ne: 'admin' } }).limit(5);
    const teams = await Team.find().populate('leader members');
    const admin = await User.findOne({ role: 'admin' });

    if (users.length === 0) {
      console.log('No users found for task assignment');
      return;
    }

    console.log(`Found ${users.length} users and ${teams.length} teams`);

    // Create tasks with assignments
    const tasksToCreate = sampleTasks.map((taskData, index) => {
      const task: any = {
        ...taskData,
        createdBy: admin?._id || users[0]._id,
      };

      if (taskData.assignmentType === 'individual') {
        // Assign to a random user
        const randomUser = users[index % users.length];
        task.assignedTo = [randomUser._id];
      } else if (taskData.assignmentType === 'team' && teams.length > 0) {
        // Assign to a random team
        const randomTeam = teams[index % teams.length];
        task.assignedTeam = randomTeam._id;
      }

      return task;
    });

    console.log('Creating new demo tasks...');
    const createdTasks = await Task.insertMany(tasksToCreate);
    console.log(`Created ${createdTasks.length} demo tasks successfully!`);

    // Log assignment details
    for (const task of createdTasks) {
      const populatedTask = await Task.findById(task._id)
        .populate('assignedTo', 'name email')
        .populate('assignedTeam', 'name')
        .populate('createdBy', 'name');

      if (populatedTask) {
        console.log(`\nTask: ${populatedTask.title}`);
        console.log(`  Type: ${populatedTask.assignmentType}`);
        console.log(`  Status: ${populatedTask.status}`);
        console.log(`  Priority: ${populatedTask.priority}`);
        
        if (populatedTask.assignmentType === 'individual' && populatedTask.assignedTo?.length > 0) {
          console.log(`  Assigned to: ${populatedTask.assignedTo.map((u: any) => u.name).join(', ')}`);
        } else if (populatedTask.assignmentType === 'team' && populatedTask.assignedTeam) {
          console.log(`  Assigned team: ${(populatedTask.assignedTeam as any).name}`);
        }
        
        if (populatedTask.location) {
          console.log(`  Location: ${populatedTask.location.address || 'Unknown Address'} (${populatedTask.location.radiusMeters}m radius)`);
        }
      }
    }

  } catch (error) {
    console.error('Error seeding tasks:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDatabase connection closed');
  }
}

// Run the script
clearAndSeedTasks();