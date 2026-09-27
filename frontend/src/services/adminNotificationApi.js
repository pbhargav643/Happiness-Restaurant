import api from './api.js';

/**
 * Admin Notification API Service (Phase 13)
 *
 * Interacts with /api/notifications endpoints.
 * Requires admin authentication header automatically attached by api.js.
 */
export const adminNotificationApi = {
  /**
   * Check safe WhatsApp and SMS provider configuration status
   * @returns {Promise<{success: boolean, providers: { whatsapp: string, sms: string }}>}
   */
  async getProviderStatus() {
    try {
      const res = await api.get('/notifications/status');
      return {
        success: true,
        providers: res?.providers || { whatsapp: 'NOT_CONFIGURED', sms: 'NOT_CONFIGURED' },
      };
    } catch (err) {
      console.warn('[adminNotificationApi] Could not fetch provider status:', err.message);
      return {
        success: false,
        error: err.message,
        providers: { whatsapp: 'NOT_CONFIGURED', sms: 'NOT_CONFIGURED' },
      };
    }
  },

  /**
   * Retrieve all notification history logs across all orders
   * @returns {Promise<{success: boolean, logs: Array, providers: Object, error?: string}>}
   */
  async getAllLogs() {
    try {
      const res = await api.get('/notifications/logs');
      return {
        success: true,
        logs: Array.isArray(res?.data) ? res.data : [],
        providers: res?.providers || { whatsapp: 'NOT_CONFIGURED', sms: 'NOT_CONFIGURED' },
      };
    } catch (err) {
      console.warn('[adminNotificationApi] Failed to load notification logs:', err.message);
      return {
        success: false,
        logs: [],
        providers: { whatsapp: 'NOT_CONFIGURED', sms: 'NOT_CONFIGURED' },
        error: err.message,
      };
    }
  },

  /**
   * Retrieve notification history logs for a specific orderId
   * @param {string} orderId
   * @returns {Promise<{success: boolean, logs: Array, error?: string}>}
   */
  async getOrderNotifications(orderId) {
    if (!orderId) {
      return { success: false, logs: [], error: 'Order ID is required' };
    }

    try {
      const res = await api.get(`/notifications/order/${encodeURIComponent(orderId)}`);
      return {
        success: true,
        logs: Array.isArray(res?.data) ? res.data : [],
      };
    } catch (err) {
      console.warn(`[adminNotificationApi] Failed to load notifications for ${orderId}:`, err.message);
      return {
        success: false,
        logs: [],
        error: err.message,
      };
    }
  },

  /**
   * Request manual retry of a failed notification for an order
   * @param {string} orderId
   * @param {string} [channel] Optional specific channel ('WHATSAPP' | 'SMS')
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  async retryNotification(orderId, channel = null) {
    if (!orderId) {
      return { success: false, error: 'Order ID is required' };
    }

    try {
      const payload = channel ? { channel } : {};
      const res = await api.post(`/notifications/order/${encodeURIComponent(orderId)}/retry`, payload);
      return {
        success: true,
        data: res?.data,
        message: res?.message || 'Notification retry initiated',
      };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Failed to retry notification',
      };
    }
  },

  /**
   * Request manual retry of a specific failed notification by its log ID
   * @param {string} notificationId
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  async retryNotificationById(notificationId) {
    if (!notificationId) {
      return { success: false, error: 'Notification ID is required' };
    }

    try {
      const res = await api.post(`/admin/notifications/${encodeURIComponent(notificationId)}/retry`);
      return {
        success: Boolean(res?.success !== false),
        data: res?.data,
        message: res?.message || 'Notification retry initiated',
      };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Failed to retry notification',
      };
    }
  },

  /**
   * Clear notification history logs for a specific year and month (Admin only)
   * @param {number|string} year
   * @param {number|string} month
   * @returns {Promise<{success: boolean, deletedCount: number, message: string, error?: string}>}
   */
  async clearHistory(year, month) {
    if (!year || !month) {
      return { success: false, error: 'Year and month are required' };
    }

    try {
      const res = await api.delete(`/notifications/history?year=${encodeURIComponent(year)}&month=${encodeURIComponent(month)}`);
      return {
        success: Boolean(res?.success !== false),
        deletedCount: res?.deletedCount ?? 0,
        message: res?.message || 'Notification history cleared',
      };
    } catch (err) {
      return {
        success: false,
        deletedCount: 0,
        error: err.message || 'Failed to clear notification history',
      };
    }
  },
};

export default adminNotificationApi;
