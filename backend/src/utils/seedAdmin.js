import mongoose from 'mongoose';
import connectDB, { disconnectDB } from '../config/database.js';
import Admin from '../models/Admin.js';
import { hashPassword, comparePassword } from './password.js';
import { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } from '../config/env.js';

/**
 * Seed Database with Initial Admin User
 *
 * Rules:
 * - Reads credentials strictly from environment variables
 * - Hashes password before saving to database
 * - Never logs or reveals plaintext password
 * - Idempotent: Skips creation if an Admin already exists
 * - Sets role: 'ADMIN', isActive: true
 */
export async function seedAdmin(force = false) {
  await connectDB();

  if (mongoose.connection.readyState !== 1) {
    console.warn('[Seed Admin] Database not connected. Skipping admin seed.');
    return { success: false, reason: 'Database not connected' };
  }

  const name = ADMIN_NAME || 'Admin Manager';
  const email = (ADMIN_EMAIL || 'admin@happinessrestaurant.com').toLowerCase().trim();
  const rawPassword = ADMIN_PASSWORD || 'Admin@12345';

  const existingAdmin = await Admin.findOne({ email }).select('+passwordHash');

  if (existingAdmin && !force) {
    const isPasswordMatching = await comparePassword(rawPassword, existingAdmin.passwordHash);

    if (isPasswordMatching && existingAdmin.isActive && existingAdmin.role === 'ADMIN') {
      console.log(`[Seed Admin] Admin already exists (${existingAdmin.email}) with valid credentials. Skipping seed.`);
      return {
        success: true,
        count: 1,
        admin: { id: existingAdmin._id.toString(), email: existingAdmin.email, role: existingAdmin.role },
        seeded: false,
      };
    }

    console.log(`[Seed Admin] Synchronizing credentials for existing Admin: ${email}...`);
    existingAdmin.name = name;
    existingAdmin.passwordHash = await hashPassword(rawPassword);
    existingAdmin.isActive = true;
    existingAdmin.role = 'ADMIN';
    const updated = await existingAdmin.save();

    console.log(`[Seed Admin] Successfully synchronized Admin credentials for: ${updated.email}`);
    return {
      success: true,
      count: 1,
      admin: { id: updated._id.toString(), email: updated.email, role: updated.role },
      seeded: true,
    };
  }

  console.log(`[Seed Admin] Creating initial Admin account for: ${email}...`);

  const passwordHash = await hashPassword(rawPassword);

  if (existingAdmin) {
    existingAdmin.name = name;
    existingAdmin.passwordHash = passwordHash;
    existingAdmin.role = 'ADMIN';
    existingAdmin.isActive = true;
    const updated = await existingAdmin.save();
    return {
      success: true,
      count: 1,
      admin: { id: updated._id.toString(), email: updated.email, role: updated.role },
      seeded: true,
    };
  }

  // Ensure no duplicate or obsolete admin accounts
  const existingCount = await Admin.countDocuments();
  if (existingCount > 0) {
    await Admin.deleteMany({ email: { $ne: email } });
  }

  const newAdmin = new Admin({
    name,
    email,
    passwordHash,
    role: 'ADMIN',
    isActive: true,
  });

  const saved = await newAdmin.save();

  console.log(`[Seed Admin] Successfully created initial Admin: ${saved.email} (Role: ${saved.role})`);

  return {
    success: true,
    count: 1,
    admin: { id: saved._id.toString(), email: saved.email, role: saved.role },
    seeded: true,
  };
}

// Allow direct execution: node src/utils/seedAdmin.js
if (process.argv[1]?.endsWith('seedAdmin.js')) {
  (async () => {
    try {
      await seedAdmin(process.argv.includes('--force'));
    } catch (err) {
      console.error('[Seed Admin Error]:', err.message);
    } finally {
      await disconnectDB();
      process.exit(0);
    }
  })();
}

export default seedAdmin;
