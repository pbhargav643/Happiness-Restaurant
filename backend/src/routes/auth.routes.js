import express from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authenticateAdmin } from '../middleware/authMiddleware.js';
import { loginRateLimiter } from '../middleware/rateLimiter.js';
import customerAuthRoutes from './customer.auth.routes.js';

const router = express.Router();

/**
 * Customer Authentication Sub-router
 * Mounted at /api/auth/customer
 */
router.use('/customer', customerAuthRoutes);

/**
 * Authentication Foundation Status
 * Preserved for test compatibility
 */
router.get('/status', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Auth route foundation active',
  });
});

/**
 * POST /api/auth/login
 * Admin Login endpoint with rate limiting
 */
router.post('/login', loginRateLimiter, authController.login);

/**
 * GET /api/auth/me
 * Authenticated Admin profile verification
 */
router.get('/me', authenticateAdmin, authController.getMe);

/**
 * POST /api/auth/logout
 * Admin Logout endpoint
 */
router.post('/logout', authController.logout);

export default router;

