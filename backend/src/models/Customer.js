import mongoose from 'mongoose';

/**
 * Customer Mongoose Schema
 *
 * Requirements:
 * - name: required, trimmed
 * - mobile: required, unique, validated to 10-digit Indian phone (/^[6-9]\d{9}$/)
 * - email: optional, trimmed, lowercase, sparse unique (allows multiple nulls/empty, enforces unique if present)
 * - passwordHash: required, select: false (never returned in default queries)
 * - role: enum ['CUSTOMER'], default 'CUSTOMER'
 * - isActive: Boolean, default true
 * - timestamps: createdAt, updatedAt
 */
const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      minlength: [2, 'Customer name must be at least 2 characters'],
      maxlength: [100, 'Customer name cannot exceed 100 characters'],
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      unique: true, // creates unique index on mobile without duplicate index: true
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Please provide a valid 10-digit Indian mobile number'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true, // enforces unique sparse index on email directly on field
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
      default: null,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false, // Never return password hash in default queries
    },
    role: {
      type: String,
      required: true,
      enum: ['CUSTOMER'],
      default: 'CUSTOMER',
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

const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);

export default Customer;
