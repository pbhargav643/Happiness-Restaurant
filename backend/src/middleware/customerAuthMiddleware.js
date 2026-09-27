import mongoose from 'mongoose';
import Customer from '../models/Customer.js';
import { verifyToken } from '../utils/jwt.js';

/**
 * Authentication and Authorization Middleware for Customer Operations
 *
 * Rules:
 * - Reads 'Authorization: Bearer <token>' header
 * - Verifies token signature and expiration
 * - Rejects unauthorized requests with 401 Unauthorized
 * - Validates customer role === 'CUSTOMER'
 * - Rejects admin tokens or other non-customer roles with 403 Forbidden
 * - Rejects inactive customer accounts with 403 Forbidden
 * - Attaches safe customer profile to req.customer
 * - Never attaches or exposes passwordHash
 */
export async function authenticateCustomer(req, res, next) {
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

    // Explicit Customer role isolation: Non-customers (e.g. Admins) are forbidden
    if (decoded.role !== 'CUSTOMER') {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden: Customer authorization required.',
      });
    }

    // Verify against database if MongoDB connection is open
    if (mongoose.connection.readyState === 1) {
      const customer = await Customer.findById(decoded.sub);

      if (!customer) {
        return res.status(401).json({
          success: false,
          message: 'Customer account not found.',
        });
      }

      if (customer.isActive === false) {
        return res.status(403).json({
          success: false,
          message: 'Your customer account is inactive. Please contact support.',
        });
      }

      if (customer.role !== 'CUSTOMER') {
        return res.status(403).json({
          success: false,
          message: 'Access forbidden: Customer authorization required.',
        });
      }

      req.customer = {
        id: customer._id.toString(),
        name: customer.name,
        mobile: customer.mobile,
        email: customer.email,
        role: customer.role || 'CUSTOMER',
        isActive: customer.isActive !== false,
      };
    } else {
      // In-memory or offline fallback: attach safe payload data
      req.customer = {
        id: decoded.sub,
        name: decoded.name || 'Customer',
        mobile: decoded.mobile || '',
        email: decoded.email || null,
        role: decoded.role,
        isActive: true,
      };
    }

    next();
  } catch (err) {
    console.error('[Customer Auth Middleware Error]:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Authentication service encountered an error.',
    });
  }
}

/**
 * Optional Customer Authentication Middleware
 * If Authorization header is present, strictly validates customer token.
 * If Authorization header is absent, safely sets req.customer = null and passes through (guest mode).
 */
export async function optionalAuthenticateCustomer(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader || typeof authHeader !== 'string' || !authHeader.trim()) {
    req.customer = null;
    return next();
  }

  // If header was provided, delegate to strict customer verification
  return authenticateCustomer(req, res, next);
}

export default authenticateCustomer;
