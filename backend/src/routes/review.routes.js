import express from 'express';
import { reviewController } from '../controllers/review.controller.js';
import { authenticateCustomer } from '../middleware/customerAuthMiddleware.js';

const router = express.Router();

/**
 * Public Review Routes
 * GET /api/reviews - View all submitted reviews
 */
router.get('/', reviewController.getReviews);

/**
 * Authenticated Customer Review Routes
 * POST /api/reviews - Submit a new review (1 active review per customer)
 */
router.post('/', authenticateCustomer, reviewController.createReview);

export default router;
