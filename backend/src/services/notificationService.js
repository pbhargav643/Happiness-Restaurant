import mongoose from 'mongoose';
import NotificationLog from '../models/NotificationLog.js';
import Order from '../models/Order.js';
import { whatsappProvider, smsProvider, getProvidersStatus } from './notifications/index.js';

export const ALLOWED_CHANNELS = ['WHATSAPP'];
export const HISTORICAL_CHANNELS = ['WHATSAPP', 'SMS'];
export const ALLOWED_TYPES = [
  'ORDER_PLACED',
  'ORDER_PREPARING',
  'ORDER_READY',
  'ORDER_PICKED_UP',
];
export const ALLOWED_STATUSES = ['PENDING', 'SENT', 'FAILED'];

/**
 * Generates official pickup-only customer notification message
 * STRICTLY NO DELIVERY WORDING, ETAs, DRIVERS, OR FAKE LINKS
 */
export function formatOrderReadyMessage(order) {
  return whatsappProvider.formatMessage(order, 'ORDER_READY');
}

/**
 * Centralized Notification Service Layer (Phase 13)
 *
 * Location: backend/src/services/notificationService.js
 *
 * Centralizes notification event dispatch, provider abstraction, idempotency,
 * failure isolation, and audit logging.
 */
export const notificationService = {
  whatsapp: whatsappProvider,
  sms: smsProvider,

  /**
   * Safe provider configuration inspection (Zero credential leakage)
   */
  getProviderStatus() {
    const status = getProvidersStatus();
    return {
      whatsapp: status.whatsapp,
      sms: status.sms,
      // Backwards-compatible status strings
      WHATSAPP: status.whatsapp.status,
      SMS: status.sms.status,
    };
  },

  /**
   * Create an event notification log record
   * @param {Object} payload
   */
  async createNotificationLog(payload) {
    if (!payload || typeof payload !== 'object') {
      const err = new Error('Notification payload must be a valid object');
      err.statusCode = 400;
      throw err;
    }

    const { orderId, type, channel, recipient, message, status = 'PENDING', providerMessageId = null, error } = payload;

    if (!orderId || typeof orderId !== 'string' || !orderId.trim()) {
      const err = new Error('orderId is required for notification logging');
      err.statusCode = 400;
      throw err;
    }

    const upperChannel = String(channel || '').toUpperCase();
    if (!ALLOWED_CHANNELS.includes(upperChannel) && !HISTORICAL_CHANNELS.includes(upperChannel)) {
      const err = new Error(`Invalid channel: ${channel}. Allowed channels: ${ALLOWED_CHANNELS.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }

    const upperType = String(type || '').toUpperCase();
    if (!ALLOWED_TYPES.includes(upperType)) {
      const err = new Error(`Invalid notification type: ${type}. Allowed types: ${ALLOWED_TYPES.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }

    const upperStatus = String(status || 'PENDING').toUpperCase();
    if (!ALLOWED_STATUSES.includes(upperStatus)) {
      const err = new Error(`Invalid status: ${status}. Allowed statuses: ${ALLOWED_STATUSES.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }

    if (upperStatus === 'SENT' && !providerMessageId) {
      const err = new Error('Cannot record SENT notification status without real provider dispatch (Fake success prohibited)');
      err.statusCode = 400;
      throw err;
    }

    if (!recipient || typeof recipient !== 'string' || !recipient.trim()) {
      const err = new Error('recipient contact is required');
      err.statusCode = 400;
      throw err;
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      const err = new Error('message content is required');
      err.statusCode = 400;
      throw err;
    }

    const logData = {
      orderId: orderId.trim().toUpperCase(),
      type: upperType,
      channel: upperChannel,
      status: upperStatus,
      recipient: recipient.trim(),
      message: message.trim(),
      providerMessageId: providerMessageId ? String(providerMessageId).trim() : null,
      sentAt: upperStatus === 'SENT' ? new Date() : null,
      error: error || null,
    };

    const logDoc = new NotificationLog(logData);

    if (mongoose.connection.readyState !== 1) {
      return logDoc.toObject();
    }

    return await logDoc.save();
  },

  /**
   * Retrieve all notification logs for a specific orderId
   * @param {string} orderId
   */
  async getNotificationsByOrderId(orderId) {
    if (!orderId || typeof orderId !== 'string' || !orderId.trim()) {
      const err = new Error('Valid orderId is required');
      err.statusCode = 400;
      throw err;
    }

    if (mongoose.connection.readyState !== 1) {
      return [];
    }

    return await NotificationLog.find({ orderId: orderId.trim().toUpperCase() })
      .select('-__v')
      .sort({ createdAt: -1 })
      .lean();
  },

  /**
   * Alias for backwards compatibility
   */
  async getNotificationLogsByOrder(orderId) {
    return this.getNotificationsByOrderId(orderId);
  },

  /**
   * Centralized Order Notification Dispatcher (Phase 13 Core Requirement)
   *
   * @param {Object} order The Order mongoose document or plain object
   * @param {'ORDER_PLACED' | 'ORDER_PREPARING' | 'ORDER_READY'} event Notification event
   * @param {Object} [options] Optional overrides for testing
   * @returns {Promise<{ orderId: string, event: string, results: Object }>}
   */
  async sendOrderNotification(order, event = 'ORDER_READY', options = {}) {
    if (!order || !order.orderId) {
      console.warn('[NotificationService] sendOrderNotification called without valid order');
      return { success: false, error: 'Invalid order' };
    }

    const orderId = order.orderId.trim().toUpperCase();
    const recipient = order.customer?.phone || order.customer?.mobile;

    if (!recipient) {
      console.warn(`[NotificationService] Order ${orderId} has no customer mobile number.`);
      return { success: false, error: 'No mobile number' };
    }

    const upperEvent = String(event || 'ORDER_READY').toUpperCase();
    if (!ALLOWED_TYPES.includes(upperEvent)) {
      console.warn(`[NotificationService] Invalid event ${upperEvent} for order ${orderId}`);
      return { success: false, error: `Invalid event: ${upperEvent}` };
    }

    const channelsToDispatch = options.channels || (options.mockDispatchers?.SMS ? ['WHATSAPP', 'SMS'] : ALLOWED_CHANNELS);
    const results = {};

    for (const channel of channelsToDispatch) {
      try {
        // 1. Idempotency Guard: Do not send duplicate notifications for same orderId + event + channel
        if (mongoose.connection.readyState === 1 && !options.force) {
          const existingSent = await NotificationLog.findOne({
            orderId,
            type: upperEvent,
            channel,
            status: 'SENT',
          });

          if (existingSent) {
            results[channel] = {
              status: 'SKIPPED_DUPLICATE',
              message: `Order ${orderId} already has a successful ${channel} notification for ${upperEvent}.`,
              logId: existingSent._id,
            };
            continue;
          }
        }

        // 2. Select Provider
        const provider = channel === 'WHATSAPP' ? whatsappProvider : smsProvider;
        const customDispatcher = options.mockDispatchers?.[channel] || null;
        const message = provider.formatMessage(order, upperEvent);

        // 3. Provider Configuration Check
        if (channel === 'SMS' && !customDispatcher && !options.channels?.includes('SMS')) {
          results[channel] = {
            status: 'DEACTIVATED',
            reason: 'SMS notification module is deactivated for this project',
          };
          continue;
        }

        if (!provider.isConfigured() && !customDispatcher) {
          const errorMsg = `Provider not configured (${channel}_NOT_CONFIGURED)`;
          const log = await this.createNotificationLog({
            orderId,
            type: upperEvent,
            channel,
            recipient,
            message,
            status: 'FAILED',
            error: errorMsg,
          });

          results[channel] = {
            status: 'FAILED',
            reason: errorMsg,
            logId: log._id || null,
          };
          continue;
        }

        // 4. Dispatch to Provider
        let sendRes;
        if (channel === 'WHATSAPP') {
          sendRes = await provider.sendWhatsAppNotification({
            order,
            recipient,
            message,
            type: upperEvent,
            orderId,
            customDispatcher,
          });
        } else {
          sendRes = await provider.sendSmsNotification({
            order,
            recipient,
            message,
            type: upperEvent,
            orderId,
            customDispatcher,
          });
        }

        if (sendRes?.success) {
          const providerMessageId = sendRes.providerMessageId || `msg_${Date.now()}`;
          const log = await this.createNotificationLog({
            orderId,
            type: upperEvent,
            channel,
            recipient,
            message,
            status: 'SENT',
            providerMessageId,
            error: null,
          });

          results[channel] = {
            status: 'SENT',
            messageId: providerMessageId,
            providerMessageId,
            logId: log._id || null,
          };
        } else {
          const sanitizedErr = String(sendRes?.error || 'Provider rejected request')
            .replace(/Bearer\s+[^\s]+/gi, '[REDACTED_TOKEN]')
            .slice(0, 200);

          const log = await this.createNotificationLog({
            orderId,
            type: upperEvent,
            channel,
            recipient,
            message,
            status: 'FAILED',
            error: sanitizedErr,
          });

          results[channel] = {
            status: 'FAILED',
            reason: sanitizedErr,
            logId: log._id || null,
          };
        }
      } catch (channelErr) {
        console.warn(`[NotificationService] ${channel} dispatch error for ${orderId}:`, channelErr.message);

        const sanitizedErr = String(channelErr.message || 'Dispatch failed')
          .replace(/Bearer\s+[^\s]+/gi, '[REDACTED_TOKEN]')
          .slice(0, 200);

        try {
          const provider = channel === 'WHATSAPP' ? whatsappProvider : smsProvider;
          const log = await this.createNotificationLog({
            orderId,
            type: upperEvent,
            channel,
            recipient,
            message: provider.formatMessage(order, upperEvent),
            status: 'FAILED',
            error: sanitizedErr,
          });
          results[channel] = {
            status: 'FAILED',
            reason: sanitizedErr,
            logId: log._id || null,
          };
        } catch (logErr) {
          results[channel] = {
            status: 'FAILED',
            reason: sanitizedErr,
          };
        }
      }
    }

    return {
      orderId,
      event: upperEvent,
      results,
    };
  },

  /**
   * Trigger ORDER_READY notifications across WhatsApp and SMS
   * Backwards-compatible wrapper around sendOrderNotification
   *
   * @param {Object} order The Order mongoose document or plain object
   * @param {Object} [options] Optional overrides for testing
   * @returns {Promise<{ orderId: string, results: Object }>}
   */
  async triggerOrderReadyNotification(order, options = {}) {
    const res = await this.sendOrderNotification(order, 'ORDER_READY', options);
    return {
      orderId: res.orderId,
      results: res.results,
    };
  },

  /**
   * Manual Retry for Failed Order Notifications (Admin Action by Order ID)
   * @param {string} orderId Order identifier
   * @param {string} [channel] Specific channel ('WHATSAPP' | 'SMS') or null for all failed
   * @param {Object} [options] Optional overrides
   */
  async retryNotification(orderId, channel = null, options = {}) {
    if (!orderId || typeof orderId !== 'string') {
      const err = new Error('Valid orderId is required');
      err.statusCode = 400;
      throw err;
    }

    const cleanOrderId = orderId.trim().toUpperCase();

    if (channel && !ALLOWED_CHANNELS.includes(channel.toUpperCase()) && !HISTORICAL_CHANNELS.includes(channel.toUpperCase())) {
      const err = new Error(`Invalid channel: ${channel}. Allowed channels: ${ALLOWED_CHANNELS.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }

    let order = null;
    if (mongoose.connection.readyState === 1) {
      order = await Order.findOne({ orderId: cleanOrderId });
    }

    if (!order && !options.mockOrder) {
      const err = new Error(`Order ${cleanOrderId} not found`);
      err.statusCode = 404;
      throw err;
    }

    const targetOrder = order || options.mockOrder;
    if (targetOrder.status !== 'READY') {
      const err = new Error(`Cannot retry notification. Order status must be "READY" (current: "${targetOrder.status}")`);
      err.statusCode = 400;
      throw err;
    }

    const channels = channel ? [channel.toUpperCase()] : ALLOWED_CHANNELS;

    return await this.sendOrderNotification(targetOrder, 'ORDER_READY', {
      ...options,
      channels,
      force: true,
    });
  },

  /**
   * Manual Retry for a specific failed NotificationLog by its ID (Admin Action)
   *
   * @param {string} notificationId NotificationLog _id
   * @param {Object} [options] Optional mock dispatchers/order for testing
   */
  async retryNotificationById(notificationId, options = {}) {
    if (!notificationId || typeof notificationId !== 'string') {
      const err = new Error('Valid notificationId is required');
      err.statusCode = 400;
      throw err;
    }

    let notification = null;
    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(notificationId)) {
      notification = await NotificationLog.findById(notificationId);
    } else if (options.mockLog) {
      notification = options.mockLog;
    }

    if (!notification) {
      const err = new Error(`Notification record not found: ${notificationId}`);
      err.statusCode = 404;
      throw err;
    }

    if (notification.status === 'SENT') {
      const err = new Error(`Notification already successfully sent (${notification.channel})`);
      err.statusCode = 400;
      throw err;
    }

    let order = null;
    if (mongoose.connection.readyState === 1) {
      order = await Order.findOne({ orderId: notification.orderId });
    } else if (options.mockOrder) {
      order = options.mockOrder;
    }

    if (!order) {
      const err = new Error(`Associated order ${notification.orderId} not found`);
      err.statusCode = 404;
      throw err;
    }

    if (order.status !== 'READY') {
      const err = new Error(`Cannot retry notification. Order status must be "READY" (current: "${order.status}")`);
      err.statusCode = 400;
      throw err;
    }

    const channel = notification.channel;
    const provider = channel === 'WHATSAPP' ? whatsappProvider : smsProvider;
    const customDispatcher = options.mockDispatchers?.[channel] || null;

    if (!provider.isConfigured() && !customDispatcher) {
      const errorMsg = `Provider not configured (${channel}_NOT_CONFIGURED)`;
      notification.status = 'FAILED';
      notification.error = errorMsg;
      if (typeof notification.save === 'function') {
        await notification.save();
      }
      return {
        success: false,
        status: 'FAILED',
        channel,
        orderId: notification.orderId,
        providerMessageId: null,
        error: errorMsg,
        log: notification,
      };
    }

    try {
      let sendRes;
      if (channel === 'WHATSAPP') {
        sendRes = await provider.sendWhatsAppNotification({
          order,
          recipient: notification.recipient,
          message: notification.message,
          type: notification.type || 'ORDER_READY',
          orderId: notification.orderId,
          customDispatcher,
        });
      } else {
        sendRes = await provider.sendSmsNotification({
          order,
          recipient: notification.recipient,
          message: notification.message,
          type: notification.type || 'ORDER_READY',
          orderId: notification.orderId,
          customDispatcher,
        });
      }

      if (sendRes?.success) {
        const providerMessageId = sendRes.providerMessageId || `retry_msg_${Date.now()}`;
        notification.status = 'SENT';
        notification.sentAt = new Date();
        notification.providerMessageId = providerMessageId;
        notification.error = null;

        if (typeof notification.save === 'function') {
          await notification.save();
        }

        return {
          success: true,
          status: 'SENT',
          channel,
          orderId: notification.orderId,
          providerMessageId,
          log: notification,
        };
      } else {
        const sanitizedErr = String(sendRes?.error || 'Dispatch failed')
          .replace(/Bearer\s+[^\s]+/gi, '[REDACTED_TOKEN]')
          .slice(0, 200);

        notification.status = 'FAILED';
        notification.error = sanitizedErr;

        if (typeof notification.save === 'function') {
          await notification.save();
        }

        return {
          success: false,
          status: 'FAILED',
          channel,
          orderId: notification.orderId,
          providerMessageId: null,
          error: sanitizedErr,
          log: notification,
        };
      }
    } catch (sendErr) {
      const sanitizedErr = String(sendErr.message || 'Dispatch failed')
        .replace(/Bearer\s+[^\s]+/gi, '[REDACTED_TOKEN]')
        .slice(0, 200);

      notification.status = 'FAILED';
      notification.error = sanitizedErr;

      if (typeof notification.save === 'function') {
        await notification.save();
      }

      return {
        success: false,
        status: 'FAILED',
        channel,
        orderId: notification.orderId,
        providerMessageId: null,
        error: sanitizedErr,
        log: notification,
      };
    }
  },

  /**
   * Clear Notification History for a specific Year and Month (Admin Only)
   *
   * @param {number|string} year Full 4-digit year (e.g. 2026)
   * @param {number|string} month Month number 1-12 or month name (e.g. 9 or 'September')
   * @returns {Promise<{ success: boolean, deletedCount: number, message: string }>}
   */
  async clearNotificationHistory(year, month) {
    const MONTH_NAMES = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const parsedYear = parseInt(year, 10);
    if (isNaN(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
      const err = new Error('Valid 4-digit year is required');
      err.statusCode = 400;
      throw err;
    }

    let monthNum = null;
    let monthName = null;

    if (typeof month === 'number' && month >= 1 && month <= 12) {
      monthNum = month;
      monthName = MONTH_NAMES[month - 1];
    } else if (typeof month === 'string') {
      const trimmed = month.trim();
      const asNum = parseInt(trimmed, 10);
      if (!isNaN(asNum) && asNum >= 1 && asNum <= 12) {
        monthNum = asNum;
        monthName = MONTH_NAMES[asNum - 1];
      } else {
        const idx = MONTH_NAMES.findIndex((m) => m.toLowerCase() === trimmed.toLowerCase());
        if (idx !== -1) {
          monthNum = idx + 1;
          monthName = MONTH_NAMES[idx];
        }
      }
    }

    if (!monthNum) {
      const err = new Error('Valid month (1-12 or month name) is required');
      err.statusCode = 400;
      throw err;
    }

    if (mongoose.connection.readyState !== 1) {
      return {
        success: true,
        deletedCount: 0,
        message: `No notification history found for ${monthName} ${parsedYear}.`,
      };
    }

    // Timezone-safe start and end of month calculation without manual hour offsets
    const startOfMonth = new Date(Date.UTC(parsedYear, monthNum - 1, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(parsedYear, monthNum, 1, 0, 0, 0, 0));

    const dateFilter = {
      createdAt: {
        $gte: startOfMonth,
        $lt: endOfMonth,
      },
    };

    const count = await NotificationLog.countDocuments(dateFilter);
    if (count === 0) {
      return {
        success: true,
        deletedCount: 0,
        message: `No notification history found for ${monthName} ${parsedYear}.`,
      };
    }

    const deleteResult = await NotificationLog.deleteMany(dateFilter);

    return {
      success: true,
      deletedCount: deleteResult.deletedCount,
      message: `Successfully cleared ${deleteResult.deletedCount} notification history record(s) for ${monthName} ${parsedYear}.`,
    };
  },
};

export default notificationService;
