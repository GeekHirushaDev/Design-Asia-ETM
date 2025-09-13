// Sample data for demo purposes
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import Team from '../models/Team.js';
import Task from '../models/Task.js';
import { connectDatabase } from '../config/database.js';

const sampleUsers = [
  {
    name: 'Admin User',
    email: 'admin@company.com',
    password: 'admin123',
    role: 'admin' as const,
    phone: '+94 77 123 4567',
    status: 'active' as const
  },
  {
    name: 'John Silva',
    email: 'john.silva@company.com',
    password: 'john123',
    role: 'employee' as const,
    phone: '+94 77 234 5678',
    status: 'active' as const
  },
  {
    name: 'Mary Fernando',
    email: 'mary.fernando@company.com',
    password: 'mary123',
    role: 'employee' as const,
    phone: '+94 77 345 6789',
    status: 'active' as const
  },
  {
    name: 'David Perera',
    email: 'david.perera@company.com',
    password: 'david123',
    role: 'employee' as const,
    phone: '+94 77 456 7890',
    status: 'active' as const
  },
  {
    name: 'Sarah Kumari',
    email: 'sarah.kumari@company.com',
    password: 'sarah123',
    role: 'employee' as const,
    phone: '+94 77 567 8901',
    status: 'active' as const
  },
  {
    name: 'Michael De Silva',
    email: 'michael.desilva@company.com',
    password: 'michael123',
    role: 'employee' as const,
    phone: '+94 77 678 9012',
    status: 'active' as const
  },
  {
    name: 'Priya Wickramasinghe',
    email: 'priya.wickramasinghe@company.com',
    password: 'priya123',
    role: 'employee' as const,
    phone: '+94 77 789 0123',
    status: 'active' as const
  }
];

const sampleTeams = [
  {
    name: 'Development Team',
    description: 'Software development and engineering team responsible for building and maintaining applications.',
    status: 'active' as const
  },
  {
    name: 'Marketing Team',
    description: 'Marketing and promotional activities, campaigns, and brand management.',
    status: 'active' as const
  },
  {
    name: 'Sales Team',
    description: 'Customer acquisition, sales strategies, and client relationship management.',
    status: 'active' as const
  },
  {
    name: 'Quality Assurance',
    description: 'Testing, quality control, and ensuring product standards are maintained.',
    status: 'active' as const
  }
];

const sampleTasks = [
  {
    title: 'Complete User Authentication Module',
    description: 'Implement login, registration, and password reset functionality with JWT tokens.',
    priority: 'high' as const,
    status: 'in_progress' as const,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    location: {
      lat: 6.9271,
      lng: 79.8612,
      radiusMeters: 100,
      address: '123 Galle Road, Colombo 03, Sri Lanka'
    },
    estimateMinutes: 480 // 8 hours
  },
  {
    title: 'Design New Landing Page',
    description: 'Create a modern, responsive landing page with improved user experience.',
    priority: 'medium' as const,
    status: 'not_started' as const,
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    location: {
      lat: 6.9147,
      lng: 79.8587,
      radiusMeters: 50,
      address: '456 Marine Drive, Colombo 06, Sri Lanka'
    },
    estimateMinutes: 360 // 6 hours
  },
  {
    title: 'Customer Survey Analysis',
    description: 'Analyze customer feedback surveys and prepare quarterly report.',
    priority: 'medium' as const,
    status: 'not_started' as const,
    dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
    location: {
      lat: 6.9319,
      lng: 79.8541,
      radiusMeters: 75,
      address: '789 Duplication Road, Colombo 04, Sri Lanka'
    },
    estimateMinutes: 240 // 4 hours
  },
  {
    title: 'Database Performance Optimization',
    description: 'Optimize database queries and improve overall system performance.',
    priority: 'high' as const,
    status: 'completed' as const,
    dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    location: {
      lat: 6.9311,
      lng: 79.8598,
      radiusMeters: 25,
      address: '321 Galle Road, Colombo 04, Sri Lanka'
    },
    estimateMinutes: 600 // 10 hours
  },
  {
    title: 'Mobile App Testing',
    description: 'Comprehensive testing of mobile application across different devices and platforms.',
    priority: 'high' as const,
    status: 'in_progress' as const,
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    location: {
      lat: 6.9349,
      lng: 79.8653,
      radiusMeters: 100,
      address: '654 Sir Chittampalam A. Gardiner Mawatha, Colombo 02, Sri Lanka'
    },
    estimateMinutes: 720 // 12 hours
  }
];

async function createSampleData() {
  try {
    console.log('🔗 Connecting to database...');
    await connectDatabase();

    // Clear existing data (optional - be careful in production!)
    console.log('🧹 Cleaning existing sample data...');
    await User.deleteMany({ email: { $in: sampleUsers.map(u => u.email) } });
    await Team.deleteMany({ name: { $in: sampleTeams.map(t => t.name) } });
    await Task.deleteMany({ title: { $in: sampleTasks.map(t => t.title) } });

    // Create users
    console.log('👥 Creating sample users...');
    const createdUsers: any[] = [];
    
    for (const userData of sampleUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = new User({
        ...userData,
        password: hashedPassword
      });
      const savedUser = await user.save();
      createdUsers.push(savedUser);
      console.log(`✅ Created user: ${savedUser.name} (${savedUser.email})`);
    }

    // Find admin user for team creation
    const adminUser = createdUsers.find(u => u.role === 'admin');
    const employees = createdUsers.filter(u => u.role === 'employee');

    // Create teams with members
    console.log('\n🏢 Creating sample teams...');
    const createdTeams: any[] = [];

    // Development Team
    const devTeam = new Team({
      ...sampleTeams[0],
      members: [employees[0]._id, employees[1]._id, employees[2]._id], // John, Mary, David
      leader: employees[0]._id, // John Silva as leader
      createdBy: adminUser._id
    });
    const savedDevTeam = await devTeam.save();
    createdTeams.push(savedDevTeam);
    console.log(`✅ Created team: ${savedDevTeam.name} with ${savedDevTeam.members.length} members`);

    // Marketing Team
    const marketingTeam = new Team({
      ...sampleTeams[1],
      members: [employees[3]._id, employees[4]._id], // Sarah, Michael
      leader: employees[3]._id, // Sarah Kumari as leader
      createdBy: adminUser._id
    });
    const savedMarketingTeam = await marketingTeam.save();
    createdTeams.push(savedMarketingTeam);
    console.log(`✅ Created team: ${savedMarketingTeam.name} with ${savedMarketingTeam.members.length} members`);

    // Sales Team
    const salesTeam = new Team({
      ...sampleTeams[2],
      members: [employees[5]._id], // Priya
      leader: employees[5]._id, // Priya Wickramasinghe as leader
      createdBy: adminUser._id
    });
    const savedSalesTeam = await salesTeam.save();
    createdTeams.push(savedSalesTeam);
    console.log(`✅ Created team: ${savedSalesTeam.name} with ${savedSalesTeam.members.length} members`);

    // QA Team
    const qaTeam = new Team({
      ...sampleTeams[3],
      members: [employees[1]._id, employees[2]._id], // Mary, David (cross-functional)
      leader: employees[1]._id, // Mary Fernando as leader
      createdBy: adminUser._id
    });
    const savedQATeam = await qaTeam.save();
    createdTeams.push(savedQATeam);
    console.log(`✅ Created team: ${savedQATeam.name} with ${savedQATeam.members.length} members`);

    // Create sample tasks
    console.log('\n📋 Creating sample tasks...');
    
    for (let i = 0; i < sampleTasks.length; i++) {
      const taskData = sampleTasks[i];
      const assignedTeam = createdTeams[i % createdTeams.length];
      const assignedTo = employees[i % employees.length];

      const task = new Task({
        ...taskData,
        assignedTo: [assignedTo._id],
        team: assignedTeam._id,
        createdBy: adminUser._id
      });
      
      const savedTask = await task.save();
      console.log(`✅ Created task: ${savedTask.title} (${savedTask.status})`);
    }

    console.log('\n🎉 Sample data created successfully!');
    console.log('\n📋 Summary:');
    console.log(`   Users: ${createdUsers.length} (1 admin, ${employees.length} employees)`);
    console.log(`   Teams: ${createdTeams.length}`);
    console.log(`   Tasks: ${sampleTasks.length}`);
    
    console.log('\n🔐 Login Credentials:');
    console.log('   Admin: admin@company.com / admin123');
    console.log('   John Silva: john.silva@company.com / john123');
    console.log('   Mary Fernando: mary.fernando@company.com / mary123');
    console.log('   And more... (password pattern: firstname123)');
    
    console.log('\n🌐 Access the application:');
    console.log('   Frontend: http://localhost:5174');
    console.log('   Backend: http://localhost:3001');

  } catch (error) {
    console.error('❌ Error creating sample data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
}

createSampleData();