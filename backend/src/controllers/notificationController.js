import mongoose from 'mongoose';
import NotificationLog from '../models/NotificationLog.js';
import notificationService from '../services/notificationService.js';

/**
 * Notification Controller (Phase 13)
 *
 * Handles notification log retrieval, provider configuration inspection, and manual admin retries.
 * Strictly protected by Admin authorization.
 */
export const notificationController = {
  /**
   * GET /api/notifications/status
   * Safe check of WhatsApp and SMS provider configuration (zero credentials leaked)
   * Section 9 Schema:
   * {
   *   "success": true,
   *   "whatsapp": { "configured": boolean, "provider": string },
   *   "sms": { "configured": boolean, "provider": string }
   * }
   */
  async getProviderStatus(req, res, next) {
    try {
      const status = notificationService.getProviderStatus();
      return res.status(200).json({
        success: true,
        whatsapp: {
          configured: status.whatsapp.configured,
          provider: status.whatsapp.provider,
        },
        sms: {
          configured: status.sms.configured,
          provider: status.sms.provider,
        },
        providers: {
          whatsapp: status.whatsapp.status,
          sms: status.sms.status,
          WHATSAPP: status.whatsapp.status,
          SMS: status.sms.status,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/notifications/logs
   * Smoke test / compatibility endpoint
   */
  async getAllLogs(req, res, next) {
    try {
      let logs = [];
      if (mongoose.connection.readyState === 1) {
        logs = await NotificationLog.find().sort({ createdAt: -1 }).limit(100).select('-__v').lean();
      }
      return res.status(200).json({
        success: true,
        message: 'Notification logs retrieved',
        providers: notificationService.getProviderStatus(),
        data: logs,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/notifications/order/:orderId
   * Retrieve notification audit logs for a specific orderId (Admin only)
   */
  async getNotificationLogsByOrder(req, res, next) {
    try {
      const { orderId } = req.params;

      if (!orderId || !orderId.trim() || orderId.trim() === 'undefined' || orderId.trim() === 'null') {
        return res.status(400).json({
          success: false,
          message: 'Valid order ID parameter is required',
        });
      }

      const logs = await notificationService.getNotificationsByOrderId(orderId.trim());

      return res.status(200).json({
        success: true,
        data: logs,
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  },

  /**
   * POST /api/notifications/order/:orderId/retry
   * Manually retry failed notifications for a READY order (Admin only)
   */
  async retryNotification(req, res, next) {
    try {
      const { orderId } = req.params;
      const { channel } = req.body || {};

      if (!orderId || !orderId.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Valid order ID parameter is required',
        });
      }

      const retryResult = await notificationService.retryNotification(orderId.trim(), channel);

      return res.status(200).json({
        success: true,
        message: 'Notification retry processed',
        data: retryResult,
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  },

  /**
   * POST /api/admin/notifications/:notificationId/retry
   * and POST /api/notifications/:notificationId/retry
   * Manually retry a specific notification record by its ID (Admin only)
   */
  async retryNotificationById(req, res, next) {
    try {
      const { notificationId } = req.params;

      if (!notificationId || !notificationId.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Valid notification ID parameter is required',
        });
      }

      const retryResult = await notificationService.retryNotificationById(notificationId.trim());

      return res.status(200).json({
        success: Boolean(retryResult?.success !== false),
        message: retryResult?.error ? 'Notification retry failed' : 'Notification retry processed',
        data: retryResult,
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  },

  /**
   * DELETE /api/notifications/history
   * Clear notification history logs for a specific year and month (Admin only)
   */
  async clearNotificationHistory(req, res, next) {
    try {
      const year = req.query.year || req.body?.year;
      const month = req.query.month || req.body?.month;

      if (!year || !month) {
        return res.status(400).json({
          success: false,
          message: 'Year and month parameters are required',
        });
      }

      const result = await notificationService.clearNotificationHistory(year, month);

      return res.status(200).json(result);
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  },
};

export default notificationController;
