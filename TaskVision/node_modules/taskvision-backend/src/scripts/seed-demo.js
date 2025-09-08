// Simple script to add demo users to MongoDB
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Connect to MongoDB
async function connectDB() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskvision';
    await mongoose.connect(mongoUri, {
      dbName: 'taskvision'
    });
    console.log(`✅ MongoDB Connected: ${mongoUri}`);
    return true;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    process.exit(1);
  }
}

// Define User Schema for this script
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    select: false
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'employee'],
    default: 'employee'
  },
  department: {
    type: String,
    trim: true
  },
  avatar: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date
}, {
  timestamps: true
});

// Hash password before save
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const User = mongoose.model('User', userSchema);

// Define demo user data
const demoUsers = [
  {
    email: 'admin@designasia.com',
    password: 'Admin123!',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    department: 'Management',
    isActive: true
  },
  {
    email: 'manager@designasia.com',
    password: 'Manager123!',
    firstName: 'Manager',
    lastName: 'User',
    role: 'manager',
    department: 'Design',
    isActive: true
  },
  {
    email: 'employee1@designasia.com',
    password: 'Employee123!',
    firstName: 'John',
    lastName: 'Doe',
    role: 'employee',
    department: 'Design',
    isActive: true
  },
  {
    email: 'employee2@designasia.com',
    password: 'Employee123!',
    firstName: 'Jane',
    lastName: 'Smith',
    role: 'employee',
    department: 'Development',
    isActive: true
  },
  {
    email: 'employee3@designasia.com',
    password: 'Employee123!',
    firstName: 'Bob',
    lastName: 'Johnson',
    role: 'employee',
    department: 'Marketing',
    isActive: true
  }
];

// Seed users
async function seedUsers() {
  try {
    // Clear existing users
    console.log('🗑️ Clearing existing users...');
    await User.deleteMany({});

    // Create users
    console.log('🌱 Seeding demo users...');
    
    for (const userData of demoUsers) {
      await User.create(userData);
      console.log(`✅ Created user: ${userData.email}`);
    }

    console.log('✅ Database seeding completed!');
    console.log('\n🔐 Demo User Credentials:');
    console.log('----------------------------------');
    console.log('Role: Admin');
    console.log('Email: admin@designasia.com');
    console.log('Password: Admin123!');
    console.log('----------------------------------');
    console.log('Role: Manager');
    console.log('Email: manager@designasia.com');
    console.log('Password: Manager123!');
    console.log('----------------------------------');
    console.log('Role: Employee');
    console.log('Email: employee1@designasia.com');
    console.log('Password: Employee123!');
    console.log('----------------------------------');

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('👋 MongoDB Disconnected');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seeding process
async function run() {
  const connected = await connectDB();
  if (connected) {
    await seedUsers();
  }
}

run();
