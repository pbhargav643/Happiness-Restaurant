import express from 'express';
import { customerAuthController } from '../controllers/customer.auth.controller.js';
import { authenticateCustomer } from '../middleware/customerAuthMiddleware.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * POST /api/auth/customer/register
 * Customer registration with rate limiting
 */
router.post('/register', authRateLimiter, customerAuthController.register);

/**
 * POST /api/auth/customer/login
 * Customer login with rate limiting
 */
router.post('/login', authRateLimiter, customerAuthController.login);

/**
 * POST /api/auth/customer/forgot-password
 * Customer forgot password with rate limiting
 */
router.post('/forgot-password', authRateLimiter, customerAuthController.forgotPassword);

/**
 * GET /api/auth/customer/me
 * Protected Customer profile
 */
router.get('/me', authenticateCustomer, customerAuthController.getMe);

/**
 * POST /api/auth/customer/logout
 * Customer logout
 */
router.post('/logout', customerAuthController.logout);

export default router;
