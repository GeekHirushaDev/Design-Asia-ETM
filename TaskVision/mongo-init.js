// MongoDB initialization script
// This script will be executed when the MongoDB container starts for the first time

// Create application database
db = db.getSiblingDB('taskvision');

// Create application user
db.createUser({
  user: 'taskvision_user',
  pwd: 'taskvision_password',
  roles: [
    {
      role: 'readWrite',
      db: 'taskvision'
    }
  ]
});

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ isActive: 1 });

db.tasks.createIndex({ assignedTo: 1 });
db.tasks.createIndex({ createdBy: 1 });
db.tasks.createIndex({ status: 1 });
db.tasks.createIndex({ priority: 1 });
db.tasks.createIndex({ dueDate: 1 });
db.tasks.createIndex({ createdAt: -1 });

db.attendance.createIndex({ userId: 1 });
db.attendance.createIndex({ date: 1 });
db.attendance.createIndex({ userId: 1, date: 1 }, { unique: true });

db.chats.createIndex({ participants: 1 });
db.chats.createIndex({ createdAt: -1 });

// Insert default admin user
db.users.insertOne({
  firstName: 'System',
  lastName: 'Administrator',
  email: 'admin@taskvision.com',
  password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewisNKxWyeQN4CmG', // password: admin123
  role: 'admin',
  isActive: true,
  department: 'IT',
  position: 'System Administrator',
  phoneNumber: '+1-555-0123',
  address: {
    street: '123 Admin Street',
    city: 'Tech City',
    state: 'CA',
    zipCode: '12345',
    country: 'USA'
  },
  emergencyContact: {
    name: 'Emergency Contact',
    phoneNumber: '+1-555-0124',
    relationship: 'System'
  },
  preferences: {
    notifications: {
      email: true,
      push: true,
      sms: false
    },
    theme: 'light',
    language: 'en',
    timezone: 'America/New_York'
  },
  permissions: {
    canManageUsers: true,
    canManageTasks: true,
    canViewReports: true,
    canManageSettings: true
  },
  createdAt: new Date(),
  updatedAt: new Date()
});

print('Database initialization completed successfully!');
print('Default admin user created: admin@taskvision.com / admin123');
print('Please change the default password after first login.');
