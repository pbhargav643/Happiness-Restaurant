import express from 'express';
import { orderController } from '../controllers/orderController.js';
import { optionalAuthenticateCustomer } from '../middleware/customerAuthMiddleware.js';
import { orderRateLimiter } from '../middleware/rateLimiter.js';
import { validateOrderPlacement, validateOrderIdParam } from '../middleware/inputValidation.js';

const router = express.Router();

/**
 * Public Customer Order Routes
 * Mounted under /api/orders
 */

// POST /api/orders - Place a new order (supports both authenticated customer and guest orders)
router.post(
  '/',
  optionalAuthenticateCustomer,
  orderRateLimiter,
  validateOrderPlacement,
  orderController.createOrder
);

// GET /api/orders - Customer order history (supports authenticated customer or ?mobile=... for guests)
router.get('/', optionalAuthenticateCustomer, orderController.getCustomerOrders);

// GET /api/orders/:orderId - Customer single order status / lookup with ownership verification
router.get('/:orderId', validateOrderIdParam('orderId'), optionalAuthenticateCustomer, orderController.getOrder);

export default router;
