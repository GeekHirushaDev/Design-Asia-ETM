import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { config } from '../config/config.js';
import User from '../models/User.js';
import Role from '../models/Role.js';
import Permission from '../models/Permission.js';

type SeedUser = {
  fullName: string;
  email: string;
  department: string;
  roleName: string;
  managerUsername?: string;
  username?: string;
  password?: string;
};

async function ensurePermissions() {
  // Minimal set, reuse existing initialize if already run
  const count = await Permission.countDocuments();
  if (count === 0) {
    console.log('No permissions found. Please run initializePermissions script first.');
  }
}

async function ensureRole(name: string, description: string) {
  const role = await Role.findOne({ name });
  if (role) return role;
  const newRole = new Role({ name, description, permissions: [], isSystem: name === 'super_admin' });
  return newRole.save();
}

function usernameFromName(fullName: string): string {
  const parts = fullName.trim().toLowerCase().split(/\s+/);
  const first = parts[0];
  const last = parts.slice(1).join('') || 'user';
  return `${first}.${last}`.replace(/[^a-z0-9.]/g, '');
}

function makePassword(): string {
  // 12 chars: upper, lower, digit, symbol
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$%&*';
  let pwd = '';
  for (let i = 0; i < 12; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

async function seed() {
  await mongoose.connect(config.MONGODB_URI);
  await ensurePermissions();

  // Roles hierarchy
  const superAdminRole = await ensureRole('super_admin', 'Full system access');
  const adminRole = await ensureRole('admin', 'Administrative access');
  const managerRole = await ensureRole('manager', 'Department or team management');
  const employeeRole = await ensureRole('employee', 'Standard employee access');

  // Org chart-based users (derived from provided diagram)
  const users: SeedUser[] = [
    { fullName: 'Mahesh Directors', email: 'mahesh@company.com', department: 'Executive', roleName: 'super_admin' },
    { fullName: 'Nilanga Directors', email: 'nilanga@company.com', department: 'Executive', roleName: 'admin', managerUsername: config.SUPER_ADMIN_USERNAME },
    { fullName: 'Rashi', email: 'rashi@company.com', department: 'Finance', roleName: 'manager' },
    { fullName: 'Suranga', email: 'suranga@company.com', department: 'Operations', roleName: 'manager' },
    { fullName: 'Upali', email: 'upali@company.com', department: 'Production', roleName: 'manager' },
    { fullName: 'Yashoda', email: 'yashoda@company.com', department: 'HR & Admin', roleName: 'manager' },
    { fullName: 'Asanka', email: 'asanka@company.com', department: 'Sales & Marketing', roleName: 'manager' },
    { fullName: 'Keeth', email: 'keeth@company.com', department: 'Stores / Inventory', roleName: 'manager' },
  ];

  // Add primary super admin
  const superAdminUsername = config.SUPER_ADMIN_USERNAME;
  const superAdminPassword = makePassword();
  const superAdmin = new User({
    prefix: 'Mr',
    firstName: 'Super',
    lastName: 'Admin',
    name: 'Super Admin',
    username: superAdminUsername,
    email: `${superAdminUsername}@company.com`,
    mobile: '+94770000000',
    password: superAdminPassword,
    role: 'super_admin',
    isSuperAdmin: true,
    roleId: superAdminRole._id,
    status: 'active',
    mustChangePassword: true,
  });

  const credentials: { username: string; password: string; role: string; name: string; department?: string }[] = [];

  const existingSuper = await User.findOne({ username: superAdminUsername });
  if (!existingSuper) {
    await superAdmin.save();
  }
  credentials.push({ username: superAdminUsername, password: superAdminPassword, role: 'super_admin', name: 'Super Admin' });

  // Create other users
  for (const u of users) {
    const username = usernameFromName(u.fullName);
    const password = makePassword();
    const [firstName, ...rest] = u.fullName.split(' ');
    const lastName = rest.join(' ') || 'User';
    const roleId =
      u.roleName === 'admin' ? adminRole._id : u.roleName === 'manager' ? managerRole._id : employeeRole._id;

    const created = new User({
      prefix: 'Mr',
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      username,
      email: u.email,
      mobile: '+9477' + Math.floor(Math.random() * 1e7).toString().padStart(7, '0'),
      password,
      role: u.roleName,
      isSuperAdmin: false,
      roleId,
      status: 'active',
      mustChangePassword: true,
    });
    await created.save();
    credentials.push({ username, password, role: u.roleName, name: u.fullName, department: u.department });
  }

  // Write credentials to file
  const outDir = path.join(process.cwd(), 'server', 'seed-output');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `credentials_${Date.now()}.json`);
  fs.writeFileSync(outFile, JSON.stringify(credentials, null, 2));
  console.log('✅ Seeded users. Credentials saved to', outFile);

  await mongoose.disconnect();
}

seed().catch(async (e) => {
  console.error('Seeding failed', e);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});


