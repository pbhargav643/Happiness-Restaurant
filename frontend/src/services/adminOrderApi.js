import api from './api.js';
import { normalizeBackendOrder } from './orderApi.js';

/**

 * Admin Order API Service
 * Centralizes all administrative order management requests.
 * Connects to:
 * - GET /api/admin/orders
 * - GET /api/admin/orders/:orderId
 * - PATCH /api/admin/orders/:orderId/status
 * - PATCH /api/admin/orders/:orderId/ready-time
 *
 * NOTE: Admin Authentication is PENDING — PHASE 10.
 * Endpoints are currently in "AUTHENTICATION PENDING" mode for development.
 */
export const adminOrderApi = {
  /**
   * List all orders for admin queue with optional filtering, search, sorting, and pagination.
   * GET /api/admin/orders
   *
   * @param {Object} [options]
   * @param {string} [options.status] - Filter by status (PLACED, PREPARING, READY, PICKED_UP)
   * @param {string} [options.pickupDate] - Filter by pickup date (YYYY-MM-DD)
   * @param {string} [options.search] - Search by orderId, customer name, mobile
   * @param {string} [options.sort] - Field to sort by (createdAt, pickup.date, subtotal, status)
   * @param {string} [options.order] - Sort direction ('asc' | 'desc')
   * @param {number} [options.page] - Page number (default: 1)
   * @param {number} [options.limit] - Page size (default: 50)
   * @returns {Promise<{ success: boolean, orders: Array, total: number, meta: Object, error?: string }>}
   */
  async getAdminOrders(options = {}) {
    const params = new URLSearchParams();

    if (options.status && options.status !== 'ALL') {
      params.set('status', options.status.replace(' ', '_').toUpperCase());
    }
    if (options.pickupDate && options.pickupDate !== 'ALL') {
      params.set('pickupDate', options.pickupDate);
    }
    if (options.search && options.search.trim()) {
      params.set('search', options.search.trim());
    }
    if (options.sort) {
      params.set('sort', options.sort);
    }
    if (options.order) {
      params.set('order', options.order);
    }
    if (options.page) {
      params.set('page', String(options.page));
    }
    if (options.limit) {
      params.set('limit', String(options.limit));
    }

    const queryString = params.toString() ? `?${params.toString()}` : '';

    try {
      const response = await api.get(`/admin/orders${queryString}`);

      if (response && response.success && Array.isArray(response.data)) {
        const normalized = response.data
          .map(normalizeBackendOrder)
          .filter(Boolean);

        return {
          success: true,
          orders: normalized,
          total: response.meta?.total ?? normalized.length,
          meta: response.meta || {
            page: 1,
            limit: normalized.length,
            total: normalized.length,
            totalPages: 1,
          },
        };
      }

      return {
        success: true,
        orders: [],
        total: 0,
        meta: { page: 1, limit: 20, total: 0, totalPages: 1 },
      };
    } catch (err) {
      console.warn('[adminOrderApi.getAdminOrders] Failed:', err.message);
      return {
        success: false,
        orders: [],
        total: 0,
        error: err.message || 'Unable to load orders.',
      };
    }
  },

  /**
   * Retrieve single order details for admin by Order ID.
   * GET /api/admin/orders/:orderId
   *
   * @param {string} orderId
   * @returns {Promise<{ success: boolean, order: Object|null, error?: string }>}
   */
  async getAdminOrderById(orderId) {
    if (!orderId || typeof orderId !== 'string' || !orderId.trim()) {
      return { success: false, order: null, error: 'Order reference is required.' };
    }

    const cleanId = orderId.trim();

    try {
      const response = await api.get(`/admin/orders/${encodeURIComponent(cleanId)}`);

      if (response && response.success && response.data) {
        const normalized = normalizeBackendOrder(response.data);
        return {
          success: true,
          order: normalized,
        };
      }

      return {
        success: false,
        order: null,
        error: response?.message || 'Order not found.',
      };
    } catch (err) {
      console.warn(`[adminOrderApi.getAdminOrderById] Failed for ${cleanId}:`, err.message);
      return {
        success: false,
        order: null,
        error: err.status === 404 ? 'Order not found.' : (err.message || 'Unable to load order details.'),
      };
    }
  },

  /**
   * Update order status with strict sequential progression.
   * PATCH /api/admin/orders/:orderId/status
   * Allowed transitions:
   * PLACED -> PREPARING -> READY -> PICKED_UP
   *
   * @param {string} orderId
   * @param {string} newStatus - Target status ('PLACED', 'PREPARING', 'READY', 'PICKED_UP' or 'PICKED UP')
   * @returns {Promise<{ success: boolean, order: Object|null, message?: string, error?: string }>}
   */
  async updateAdminOrderStatus(orderId, newStatus) {
    if (!orderId || typeof orderId !== 'string' || !orderId.trim()) {
      return { success: false, order: null, error: 'Order ID is required.' };
    }
    if (!newStatus || typeof newStatus !== 'string' || !newStatus.trim()) {
      return { success: false, order: null, error: 'Status is required.' };
    }

    const cleanStatus = newStatus.trim().toUpperCase().replace(' ', '_');
    const validStatuses = ['PLACED', 'PREPARING', 'READY', 'PICKED_UP'];

    if (!validStatuses.includes(cleanStatus)) {
      return {
        success: false,
        order: null,
        error: `Invalid status: "${newStatus}". Allowed: ${validStatuses.join(', ')}`,
      };
    }

    try {
      const response = await api.patch(`/admin/orders/${encodeURIComponent(orderId.trim())}/status`, {
        status: cleanStatus,
      });

      if (response && response.success && response.data) {
        const normalized = normalizeBackendOrder(response.data);
        return {
          success: true,
          order: normalized,
          message: response.message || `Order status updated to ${cleanStatus}.`,
        };
      }

      return {
        success: false,
        order: null,
        error: response?.message || 'Unable to update order status.',
      };
    } catch (err) {
      console.warn(`[adminOrderApi.updateAdminOrderStatus] Failed:`, err.message);
      return {
        success: false,
        order: null,
        error: err.message || 'Unable to update order status.',
      };
    }
  },

  /**
   * Update order ready time without altering order status.
   * PATCH /api/admin/orders/:orderId/ready-time
   *
   * @param {string} orderId
   * @param {string|null} readyTime - Format: 'HH:MM' (24h) or 'hh:mm AM/PM' (12h), or null/empty to clear
   * @returns {Promise<{ success: boolean, order: Object|null, message?: string, error?: string }>}
   */
  async updateAdminOrderReadyTime(orderId, readyTime) {
    if (!orderId || typeof orderId !== 'string' || !orderId.trim()) {
      return { success: false, order: null, error: 'Order ID is required.' };
    }

    let payloadTime = null;
    if (readyTime !== null && readyTime !== undefined) {
      const trimmed = String(readyTime).trim();
      if (trimmed !== '') {
        // Validate format: 24h (HH:MM) or 12h (hh:mm AM/PM)
        const isValid =
          /^([01]?\d|2[0-3]):([0-5]\d)$/.test(trimmed) ||
          /^(0?[1-9]|1[0-2]):([0-5]\d)\s*(AM|PM)?$/i.test(trimmed);

        if (!isValid) {
          return {
            success: false,
            order: null,
            error: 'Invalid ready time format. Please use HH:MM (e.g. 20:15) or hh:mm AM/PM (e.g. 8:15 PM).',
          };
        }
        payloadTime = trimmed;
      }
    }

    try {
      const response = await api.patch(`/admin/orders/${encodeURIComponent(orderId.trim())}/ready-time`, {
        readyTime: payloadTime,
      });

      if (response && response.success && response.data) {
        const normalized = normalizeBackendOrder(response.data);
        return {
          success: true,
          order: normalized,
          message: response.message || (payloadTime ? `Ready time set to ${payloadTime}.` : 'Ready time cleared.'),
        };
      }

      return {
        success: false,
        order: null,
        error: response?.message || 'Unable to update ready time.',
      };
    } catch (err) {
      console.warn(`[adminOrderApi.updateAdminOrderReadyTime] Failed:`, err.message);
      return {
        success: false,
        order: null,
        error: err.message || 'Unable to update ready time.',
      };
    }
  },

  /**
   * Permanently delete a single order (Admin Only).
   * DELETE /api/admin/orders/:orderId
   *
   * @param {string} orderId
   * @returns {Promise<{ success: boolean, orderId?: string, message?: string, error?: string }>}
   */
  async deleteAdminOrder(orderId) {
    if (!orderId || typeof orderId !== 'string' || !orderId.trim()) {
      return { success: false, error: 'Order reference is required.' };
    }

    const cleanId = orderId.trim();

    try {
      const response = await api.delete(`/admin/orders/${encodeURIComponent(cleanId)}`);

      if (response && response.success) {
        return {
          success: true,
          orderId: response.data?.orderId || cleanId,
          message: response.message || 'Order deleted successfully.',
        };
      }

      return {
        success: false,
        error: response?.message || 'Unable to delete order.',
      };
    } catch (err) {
      console.warn(`[adminOrderApi.deleteAdminOrder] Failed for ${cleanId}:`, err.message);
      return {
        success: false,
        error: err.message || 'Unable to delete order.',
      };
    }
  },

  /**
   * Delete orders by Year + Month (Admin Only)
   *
   * @param {number|string} year Full 4-digit year (e.g. 2026)
   * @param {number|string} month Month number 1-12 or month name (e.g. 9 or 'September')
   * @returns {Promise<{ success: boolean, deletedCount?: number, message?: string, error?: string }>}
   */
  async deleteOrdersByMonth(year, month) {
    if (!year || !month) {
      return { success: false, error: 'Year and month are required.' };
    }

    try {
      const response = await api.delete(`/admin/orders/by-month?year=${encodeURIComponent(year)}&month=${encodeURIComponent(month)}`);

      if (response && response.success) {
        return {
          success: true,
          deletedCount: response.deletedCount ?? 0,
          message: response.message || 'Orders deleted successfully.',
        };
      }

      return {
        success: false,
        error: response?.message || 'Unable to delete orders.',
      };
    } catch (err) {
      console.warn('[adminOrderApi.deleteOrdersByMonth] Failed:', err.message);
      return {
        success: false,
        error: err.message || 'Unable to delete orders.',
      };
    }
  },
};

export default adminOrderApi;
