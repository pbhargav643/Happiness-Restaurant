import express from 'express';
import { menuController } from '../controllers/menuController.js';
import { orderController } from '../controllers/orderController.js';
import { settingsController } from '../controllers/settingsController.js';
import { notificationController } from '../controllers/notificationController.js';
import { reviewController } from '../controllers/review.controller.js';
import { authenticateAdmin } from '../middleware/authMiddleware.js';
import handleImageUpload from '../middleware/imageUpload.js';

const router = express.Router();

/**
 * All routes mounted on /api/admin require active Admin authentication.
 * Backend protection is mandatory.
 */
router.use(authenticateAdmin);

/**
 * Admin Dashboard Foundation Endpoint
 * GET /api/admin/dashboard-summary
 */
router.get('/dashboard-summary', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Admin dashboard summary endpoint ready',
    admin: req.admin,
    data: {
      totalOrders: 0,
      activeOrders: 0,
      totalRevenue: 0,
    },
  });
});

/**
 * Admin Menu Management Endpoints (PROTECTED)
 */
router.post('/menu/upload-image', handleImageUpload, menuController.uploadImage);
router.post('/menu', menuController.createMenuItem);
router.patch('/menu/:itemId/availability', menuController.updateAvailability);
router.patch('/menu/:itemId', menuController.updateMenuItem);
router.delete('/menu/:itemId', menuController.deleteMenuItem);

/**
 * Admin Order Management Endpoints (PROTECTED)
 */
// GET /api/admin/orders - List orders with filters, search, sorting, and pagination
router.get('/orders', orderController.getAdminOrders);

// GET /api/admin/orders/:orderId - Single order full details
router.get('/orders/:orderId', orderController.getAdminOrder);

// PATCH /api/admin/orders/:orderId/status - Controlled status transitions
router.patch('/orders/:orderId/status', orderController.updateOrderStatus);

// PATCH /api/admin/orders/:orderId/ready-time - Update estimated/actual ready time
router.patch('/orders/:orderId/ready-time', orderController.updateReadyTime);

// DELETE /api/admin/orders/by-month - Permanently delete orders by Month + Year (PROTECTED)
router.delete('/orders/by-month', orderController.deleteOrdersByMonth);

// DELETE /api/admin/orders/:orderId - Permanently delete a single order (PROTECTED)
router.delete('/orders/:orderId', orderController.deleteAdminOrder);

/**
 * Admin Restaurant Settings Endpoints (PROTECTED)
 */
router.get('/settings', settingsController.getSettings);
router.patch('/settings', settingsController.updateSettings);

/**
 * Admin Notification Management Endpoints (PROTECTED)
 */
// POST /api/admin/notifications/:notificationId/retry - Retry single failed notification
router.post('/notifications/:notificationId/retry', notificationController.retryNotificationById);

// DELETE /api/admin/notifications/history - Clear notification history by Year + Month
router.delete('/notifications/history', notificationController.clearNotificationHistory);

/**
 * Admin Review Management Endpoints (PROTECTED)
 */
// GET /api/admin/reviews - View all customer reviews
router.get('/reviews', reviewController.getAdminReviews);

// DELETE /api/admin/reviews/:reviewId - Permanently delete a single review
router.delete('/reviews/:reviewId', reviewController.deleteReview);

export default router;
