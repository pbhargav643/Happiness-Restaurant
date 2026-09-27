import mongoose from 'mongoose';

/**
 * Admin Mongoose Schema
 *
 * Rules:
 * - role default = 'ADMIN'
 * - isActive default = true
 * - email is unique (unique index, no duplicate index)
 * - NEVER store plaintext passwords (passwordHash with select: false)
 * - Architecture foundation only (no authentication in Phase 8 Prompt 1)
 */
const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Admin name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Admin email is required'],
      unique: true, // creates unique index without duplicate index: true
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false, // Never return password hash in default queries
    },
    role: {
      type: String,
      required: true,
      enum: ['ADMIN'],
      default: 'ADMIN',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);

export default Admin;
