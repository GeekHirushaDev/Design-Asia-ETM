// Create a startup script that adds demo users when the application starts

// Import the User model
import { User } from './models/User';
import bcrypt from 'bcryptjs';

// Function to create initial admin user if none exists
export const createInitialUsers = async (): Promise<void> => {
  try {
    // Check if any admin user exists
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (!adminExists) {
      console.log('No admin user found, creating demo users...');
      
      // Create admin user
      await User.create({
        email: 'admin@designasia.com',
        password: await bcrypt.hash('Admin123!', 10),
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        department: 'Management',
        isActive: true
      });
      
      console.log('✅ Created admin user: admin@designasia.com');
      
      // Create employee user
      await User.create({
        email: 'employee@designasia.com',
        password: await bcrypt.hash('Employee123!', 10),
        firstName: 'John',
        lastName: 'Doe',
        role: 'employee',
        department: 'Design',
        isActive: true
      });
      
      console.log('✅ Created employee user: employee@designasia.com');
      
      console.log('Demo users created successfully!');
    } else {
      console.log('Admin user already exists, skipping demo user creation');
    }
  } catch (error) {
    console.error('Error creating demo users:', error);
  }
};
