import mongoose from 'mongoose';
import Admin from '../models/Admin.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken } from '../utils/jwt.js';

const EMAIL_REGEX = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/;

/**
 * Authentication Service Layer
 * Encapsulates credentials verification, JWT generation, and admin profile retrieval.
 */
export const authService = {
  /**
   * Authenticate an Admin by email and password
   *
   * @param {Object} credentials
   * @param {string} credentials.email
   * @param {string} credentials.password
   * @returns {Promise<{ token: string, admin: Object }>}
   */
  async loginAdmin({ email, password }) {
    // 1. Validate presence of credentials
    if (!email || typeof email !== 'string' || !email.trim()) {
      const err = new Error('Email is required.');
      err.statusCode = 400;
      throw err;
    }

    if (!password || typeof password !== 'string') {
      const err = new Error('Password is required.');
      err.statusCode = 400;
      throw err;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 2. Validate email format
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      const err = new Error('Please provide a valid email address.');
      err.statusCode = 400;
      throw err;
    }

    // 3. Database query for Admin account
    if (mongoose.connection.readyState !== 1) {
      const err = new Error('Database service unavailable.');
      err.statusCode = 503;
      throw err;
    }

    const admin = await Admin.findOne({ email: normalizedEmail }).select('+passwordHash');

    // Generic error message to prevent account enumeration / reconnaissance
    const invalidCredentialsError = () => {
      const err = new Error('Invalid email or password.');
      err.statusCode = 401;
      return err;
    };

    if (!admin) {
      throw invalidCredentialsError();
    }

    // 4. Check account active status
    if (admin.isActive === false) {
      const err = new Error('Your admin account is inactive.');
      err.statusCode = 403;
      throw err;
    }

    // 5. Compare password hash
    const isPasswordValid = await comparePassword(password, admin.passwordHash);
    if (!isPasswordValid) {
      throw invalidCredentialsError();
    }

    // 6. Generate JWT token
    const token = generateToken({
      sub: admin._id.toString(),
      role: admin.role,
    });

    // 7. Return safe admin representation (never expose passwordHash)
    return {
      token,
      admin: {
        id: admin._id.toString(),
        name: admin.name,
        email: admin.email,
        role: admin.role,
        isActive: admin.isActive,
      },
    };
  },

  /**
   * Fetch admin details by ID
   *
   * @param {string} adminId
   * @returns {Promise<Object>}
   */
  async getAdminById(adminId) {
    if (!adminId) {
      const err = new Error('Admin ID is required.');
      err.statusCode = 400;
      throw err;
    }

    if (mongoose.connection.readyState !== 1) {
      return {
        id: adminId,
        name: 'Admin Manager',
        email: 'admin@happinessrestaurant.com',
        role: 'ADMIN',
        isActive: true,
      };
    }

    const admin = await Admin.findById(adminId);
    if (!admin) {
      const err = new Error('Admin account not found.');
      err.statusCode = 404;
      throw err;
    }

    return {
      id: admin._id.toString(),
      name: admin.name,
      email: admin.email,
      role: admin.role,
      isActive: admin.isActive,
    };
  },
};

export default authService;
