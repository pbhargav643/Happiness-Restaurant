import express from 'express';
import { customerOrderController } from '../controllers/customer.order.controller.js';
import { authenticateCustomer } from '../middleware/customerAuthMiddleware.js';
import { validateOrderIdParam } from '../middleware/inputValidation.js';

const router = express.Router();

// Strict Customer Authentication Guard for all customer order endpoints
router.use(authenticateCustomer);

/**
 * GET /api/customer/orders
 * Retrieve authenticated customer's own order history
 */
router.get('/', customerOrderController.getMyOrders);

/**
 * GET /api/customer/orders/:orderId
 * Retrieve single customer order with ownership verification
 */
router.get('/:orderId', validateOrderIdParam('orderId'), customerOrderController.getMyOrderById);

export default router;
