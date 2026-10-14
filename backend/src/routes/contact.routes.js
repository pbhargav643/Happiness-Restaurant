import express from 'express';
import { contactController } from '../controllers/contact.controller.js';
import { apiRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * Public Contact Routes
 * POST /api/contact - Submit customer contact message
 */
router.post('/', apiRateLimiter, contactController.submitMessage);

export default router;
