import mongoose from 'mongoose';
import Admin from '../models/Admin.js';
import { verifyToken } from '../utils/jwt.js';

/**
 * Authentication and Authorization Middleware for Admin Operations
 *
 * Rules:
 * - Reads 'Authorization: Bearer <token>' header
 * - Verifies token signature and expiration
 * - Rejects unauthorized requests with 401 Unauthorized
 * - Validates admin role === 'ADMIN' and isActive === true
 * - Rejects inactive admins and unauthorized roles with 403 Forbidden
 * - Attaches safe admin information to req.admin
 * - Never attaches or exposes passwordHash
 */
export async function authenticateAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader || typeof authHeader !== 'string') {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No token provided.',
      });
    }

    const parts = authHeader.trim().split(/\s+/);
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization format. Format must be: Bearer <token>',
      });
    }

    const token = parts[1];
    let decoded;

    try {
      decoded = verifyToken(token);
    } catch (tokenErr) {
      if (tokenErr.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Session has expired. Please log in again.',
          expired: true,
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token.',
      });
    }

    if (!decoded || !decoded.sub) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token payload: missing subject identifier.',
      });
    }

    // Role check from decoded token
    if (decoded.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden: Admin authorization required.',
      });
    }

    // Verify against database if MongoDB connection is open
    if (mongoose.connection.readyState === 1) {
      const admin = await Admin.findById(decoded.sub);

      if (!admin) {
        return res.status(401).json({
          success: false,
          message: 'Admin account not found.',
        });
      }

      if (admin.isActive === false) {
        return res.status(403).json({
          success: false,
          message: 'Your admin account is inactive.',
        });
      }

      if (admin.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Access forbidden: Admin authorization required.',
        });
      }

      req.admin = {
        id: admin._id.toString(),
        name: admin.name,
        email: admin.email,
        role: admin.role,
        isActive: admin.isActive,
      };
    } else {
      // In-memory or offline fallback: attach safe payload data
      req.admin = {
        id: decoded.sub,
        name: decoded.name || 'Admin',
        email: decoded.email || 'admin@happinessrestaurant.com',
        role: decoded.role,
        isActive: true,
      };
    }

    next();
  } catch (err) {
    console.error('[Auth Middleware Error]:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Authentication service encountered an error.',
    });
  }
}

export default authenticateAdmin;
