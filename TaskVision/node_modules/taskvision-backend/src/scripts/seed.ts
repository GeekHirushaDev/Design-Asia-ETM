import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User';
import { Task } from '../models/Task';
import { Attendance } from '../models/Attendance';
import { UserRole, TaskStatus, TaskPriority } from '@shared/types';

// Load environment variables
dotenv.config();

/**
 * Seed database with initial test data
 */
const seedDatabase = async (): Promise<void> => {
  try {
    console.log('🌱 Starting database seeding...');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskvision';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await User.deleteMany({});
    await Task.deleteMany({});
    await Attendance.deleteMany({});

    // Create admin user
    console.log('👤 Creating admin user...');
    const adminUser = await User.create({
      email: 'admin@designasia.com',
      password: 'admin123',
      firstName: 'System',
      lastName: 'Administrator',
      role: UserRole.ADMIN,
      department: 'Management',
      phone: '+1-555-0101',
      isActive: true
    });

    // Create sample employees
    console.log('👥 Creating employee users...');
    const employees = await User.create([
      {
        email: 'employee@designasia.com',
        password: 'employee123',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.EMPLOYEE,
        department: 'Development',
        phone: '+1-555-0102',
        isActive: true
      },
      {
        email: 'jane.smith@designasia.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith',
        role: UserRole.EMPLOYEE,
        department: 'Design',
        phone: '+1-555-0103',
        isActive: true
      },
      {
        email: 'mike.wilson@designasia.com',
        password: 'password123',
        firstName: 'Mike',
        lastName: 'Wilson',
        role: UserRole.EMPLOYEE,
        department: 'Marketing',
        phone: '+1-555-0104',
        isActive: true
      },
      {
        email: 'sarah.jones@designasia.com',
        password: 'password123',
        firstName: 'Sarah',
        lastName: 'Jones',
        role: UserRole.EMPLOYEE,
        department: 'Development',
        phone: '+1-555-0105',
        isActive: true
      }
    ]);

    console.log(`✅ Created ${employees.length + 1} users`);

    // Create sample tasks
    console.log('📋 Creating sample tasks...');
    const tasks = await Task.create([
      {
        title: 'Design Homepage Mockup',
        description: 'Create a modern and responsive homepage design for the new client website. Include mobile and desktop versions.',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        assignedTo: employees[1]._id, // Jane Smith (Design)
        assignedBy: adminUser._id,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        estimatedDuration: 480, // 8 hours
        tags: ['design', 'frontend', 'urgent'],
        location: {
          latitude: 37.7749,
          longitude: -122.4194,
          address: 'San Francisco, CA',
          radius: 1000
        }
      },
      {
        title: 'Implement User Authentication',
        description: 'Develop JWT-based authentication system with role-based access control for the TaskVision application.',
        status: TaskStatus.COMPLETED,
        priority: TaskPriority.URGENT,
        assignedTo: employees[0]._id, // John Doe (Development)
        assignedBy: adminUser._id,
        dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        estimatedDuration: 960, // 16 hours
        actualDuration: 840, // 14 hours
        tags: ['backend', 'security', 'authentication'],
        startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        title: 'Social Media Campaign Setup',
        description: 'Create and schedule social media posts for the product launch campaign across all platforms.',
        status: TaskStatus.NOT_STARTED,
        priority: TaskPriority.MEDIUM,
        assignedTo: employees[2]._id, // Mike Wilson (Marketing)
        assignedBy: adminUser._id,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        estimatedDuration: 240, // 4 hours
        tags: ['marketing', 'social-media', 'campaign']
      },
      {
        title: 'Database Optimization',
        description: 'Optimize database queries and add proper indexing to improve application performance.',
        status: TaskStatus.PAUSED,
        priority: TaskPriority.LOW,
        assignedTo: employees[3]._id, // Sarah Jones (Development)
        assignedBy: adminUser._id,
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        estimatedDuration: 600, // 10 hours
        tags: ['backend', 'database', 'optimization'],
        startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        pausedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        title: 'Mobile App UI Testing',
        description: 'Conduct comprehensive UI testing on the mobile application across different devices and screen sizes.',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        assignedTo: employees[1]._id, // Jane Smith (Design)
        assignedBy: adminUser._id,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        estimatedDuration: 360, // 6 hours
        tags: ['mobile', 'testing', 'ui'],
        startedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      }
    ]);

    console.log(`✅ Created ${tasks.length} tasks`);

    // Create sample attendance records for the last 7 days
    console.log('⏰ Creating attendance records...');
    const attendanceRecords = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      for (const employee of employees) {
        // Skip some days to simulate absences
        if (Math.random() > 0.1) { // 90% attendance rate
          const clockInTime = new Date(date);
          clockInTime.setHours(8 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 30)); // 8:00-9:30 AM

          const clockOutTime = new Date(clockInTime);
          clockOutTime.setHours(clockInTime.getHours() + 8 + Math.floor(Math.random() * 2)); // 8-10 hours later

          attendanceRecords.push({
            userId: employee._id,
            date,
            clockInTime,
            clockOutTime,
            clockInLocation: {
              latitude: 37.7749 + (Math.random() - 0.5) * 0.01,
              longitude: -122.4194 + (Math.random() - 0.5) * 0.01,
              address: 'Design Asia Office'
            },
            clockOutLocation: {
              latitude: 37.7749 + (Math.random() - 0.5) * 0.01,
              longitude: -122.4194 + (Math.random() - 0.5) * 0.01,
              address: 'Design Asia Office'
            }
          });
        }
      }
    }

    await Attendance.create(attendanceRecords);
    console.log(`✅ Created ${attendanceRecords.length} attendance records`);

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Users: ${employees.length + 1} (1 admin, ${employees.length} employees)`);
    console.log(`- Tasks: ${tasks.length}`);
    console.log(`- Attendance records: ${attendanceRecords.length}`);
    console.log('\n🔐 Login credentials:');
    console.log('Admin: admin@designasia.com / admin123');
    console.log('Employee: employee@designasia.com / employee123');
    console.log('Employee: jane.smith@designasia.com / password123');
    console.log('Employee: mike.wilson@designasia.com / password123');
    console.log('Employee: sarah.jones@designasia.com / password123');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('✅ Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export default seedDatabase;
