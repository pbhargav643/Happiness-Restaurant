import express from 'express';
import { notificationController } from '../controllers/notificationController.js';
import { authenticateAdmin } from '../middleware/authMiddleware.js';
import { notificationRetryRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * Notification Routes (Phase 13)
 * Mounted at /api/notifications
 * Protected by Admin Authorization (Phase 10 JWT authentication)
 */

// GET /api/notifications/status - Check WhatsApp and SMS provider configuration (Admin only)
router.get('/status', authenticateAdmin, notificationController.getProviderStatus);
router.get('/providers/status', authenticateAdmin, notificationController.getProviderStatus);

// GET /api/notifications/logs - Service overview (Admin only)
router.get('/logs', authenticateAdmin, notificationController.getAllLogs);

// GET /api/notifications/order/:orderId - Retrieve notification audit trail for order (Admin only)
router.get('/order/:orderId', authenticateAdmin, notificationController.getNotificationLogsByOrder);

// POST /api/notifications/order/:orderId/retry - Retry failed notification for order (Admin only)
router.post('/order/:orderId/retry', authenticateAdmin, notificationRetryRateLimiter, notificationController.retryNotification);

// POST /api/notifications/:notificationId/retry - Retry specific failed notification by ID (Admin only)
router.post('/:notificationId/retry', authenticateAdmin, notificationRetryRateLimiter, notificationController.retryNotificationById);
router.post('/log/:notificationId/retry', authenticateAdmin, notificationRetryRateLimiter, notificationController.retryNotificationById);

// DELETE /api/notifications/history - Clear Notification History by Year + Month (Admin only)
router.delete('/history', authenticateAdmin, notificationController.clearNotificationHistory);
router.delete('/logs', authenticateAdmin, notificationController.clearNotificationHistory);

export default router;
