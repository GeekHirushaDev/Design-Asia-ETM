import mongoose from 'mongoose';
import { config } from '../config/config.js';
import User from '../models/User.js';
import Role from '../models/Role.js';

async function run() {
  await mongoose.connect(config.MONGODB_URI);

  // Ensure a basic role exists for super_admin and employee
  const superRole = await Role.findOneAndUpdate(
    { name: 'super_admin' },
    { name: 'super_admin', description: 'Full system access', isSystem: true },
    { upsert: true, new: true }
  );
  const employeeRole = await Role.findOneAndUpdate(
    { name: 'employee' },
    { name: 'employee', description: 'Standard employee', isSystem: true },
    { upsert: true, new: true }
  );

  // Wipe users
  await User.deleteMany({});

  // Insert requested super admin
  const superAdmin = new User({
    prefix: 'Mr',
    firstName: 'System',
    lastName: 'Owner',
    name: 'System Owner',
    username: 'owner',
    email: 'geekhirusha@gmail.com',
    mobile: '+9477' + Math.floor(Math.random() * 1e7).toString().padStart(7, '0'),
    password: 'WDtharushi1#',
    role: 'super_admin',
    isSuperAdmin: true,
    roleId: superRole._id,
    status: 'active',
    mustChangePassword: false,
  });
  await superAdmin.save();

  // Insert one demo employee
  const employee = new User({
    prefix: 'Mr',
    firstName: 'Demo',
    lastName: 'Employee',
    name: 'Demo Employee',
    username: 'employee.demo',
    email: 'employee.demo@company.com',
    mobile: '+9477' + Math.floor(Math.random() * 1e7).toString().padStart(7, '0'),
    password: 'Employee@123',
    role: 'employee',
    isSuperAdmin: false,
    roleId: employeeRole._id,
    status: 'active',
    mustChangePassword: false,
  });
  await employee.save();

  console.log('✅ Seeded users:');
  console.log('Super Admin -> username: owner, email: geekhirusha@gmail.com, password: WDtharushi1#');
  console.log('Employee    -> username: employee.demo, email: employee.demo@company.com, password: Employee@123');

  await mongoose.disconnect();
}

run().catch(async (e) => {
  console.error('Seeding failed', e);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});




