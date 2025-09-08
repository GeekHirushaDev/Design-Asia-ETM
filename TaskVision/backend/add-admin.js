// Create a demo admin user using direct MongoDB driver
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function addDemoAdmin() {
  // Use MongoDB Node.js driver directly
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskvision';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const database = client.db('taskvision');
    const users = database.collection('users');
    
    // Check if admin already exists
    const existingAdmin = await users.findOne({ email: 'admin@designasia.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
    } else {
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Admin123!', salt);
      
      // Create admin user
      const result = await users.insertOne({
        email: 'admin@designasia.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        department: 'Management',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log(`Admin user created with ID: ${result.insertedId}`);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Run the function
addDemoAdmin();
