import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../config/config.js';
import User from '../models/User.js';
import Task from '../models/Task.js';

const seedData = async () => {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Task.deleteMany({});

    // Create admin user (pass plain password; model will hash in pre-save hook)
    const admin = new User({
      name: 'Admin User',
      email: 'admin@company.com',
      password: 'admin123',
      role: 'admin',
    });
    await admin.save();

    // Create employee users
    const employeePassword = 'employee123';
    const employees = [];
    
    for (let i = 1; i <= 3; i++) {
      const employee = new User({
        name: `Employee ${i}`,
        email: `employee${i}@taskmanager.com`,
        password: employeePassword,
        role: 'employee',
      });
      await employee.save();
      employees.push(employee);
    }

    // Create sample tasks
    const sampleTasks = [
      {
        title: 'Setup Development Environment',
        description: 'Configure the development environment for the new project',
        priority: 'high',
        status: 'not_started',
        createdBy: admin._id,
        assignedTo: [employees[0]._id],
        estimateMinutes: 120,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        tags: ['setup', 'development'],
      },
      {
        title: 'Design Database Schema',
        description: 'Create the database schema for user management and task tracking',
        priority: 'medium',
        status: 'in_progress',
        createdBy: admin._id,
        assignedTo: [employees[1]._id],
        estimateMinutes: 180,
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        tags: ['database', 'design'],
      },
      {
        title: 'Implement User Authentication',
        description: 'Build secure user authentication system with JWT tokens',
        priority: 'high',
        status: 'completed',
        createdBy: admin._id,
        assignedTo: [employees[2]._id],
        estimateMinutes: 240,
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        tags: ['authentication', 'security'],
        location: {
          lat: 6.9271,
          lng: 79.8612,
          radiusMeters: 200,
          address: 'Colombo Office'
        }
      },
      {
        title: 'Create Task Management UI',
        description: 'Develop responsive task management interface',
        priority: 'medium',
        status: 'not_started',
        createdBy: admin._id,
        assignedTo: [employees[0]._id, employees[1]._id],
        estimateMinutes: 300,
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        tags: ['frontend', 'ui'],
      },
      {
        title: 'Mobile App Testing',
        description: 'Test mobile application on various devices',
        priority: 'low',
        status: 'paused',
        createdBy: admin._id,
        assignedTo: [employees[2]._id],
        estimateMinutes: 180,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        tags: ['testing', 'mobile'],
      },
    ];

    for (const taskData of sampleTasks) {
      const task = new Task(taskData);
      await task.save();
    }

    console.log('✅ Seed data created successfully');
    console.log('\n📧 Login Credentials:');
    console.log('Admin: admin@company.com / admin123');
    console.log('Employee 1: employee1@taskmanager.com / employee123');
    console.log('Employee 2: employee2@taskmanager.com / employee123');
    console.log('Employee 3: employee3@taskmanager.com / employee123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed data creation failed:', error);
    process.exit(1);
  }
};

seedData();