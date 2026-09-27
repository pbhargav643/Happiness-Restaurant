import { api } from './api.js';
import { customerStorage } from './customerAuthApi.js';
import { normalizeBackendOrder } from './orderApi.js';

/**
 * Customer Order API Service
 * Centralized API layer for authenticated customer order access with strict ownership verification.
 *
 * Rules:
 * - Never passes customerId or mobile number as the authorization parameter.
 * - Authenticated customer identity (JWT Bearer token) is the sole authority.
 * - Does not expose internal DB schemas or error stack traces to UI.
 */
export const customerOrderApi = {
  /**
   * Retrieve authenticated customer's own order history.
   * GET /api/customer/orders
   *
   * @param {Object} [options]
   * @param {number} [options.page]
   * @param {number} [options.limit]
   * @returns {Promise<{ success: boolean, orders: Array, meta: Object, error?: string }>}
   */
  async getMyOrders(options = {}) {
    const token = customerStorage.getToken();
    if (!token) {
      const err = new Error('Please sign in to view your orders.');
      err.statusCode = 401;
      throw err;
    }

    const params = new URLSearchParams();
    if (options.page) params.set('page', String(options.page));
    if (options.limit) params.set('limit', String(options.limit));

    const queryStr = params.toString() ? `?${params.toString()}` : '';

    try {
      const res = await api.get(`/customer/orders${queryStr}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res && res.success && Array.isArray(res.data)) {
        const normalized = res.data
          .map(normalizeBackendOrder)
          .filter(Boolean)
          .sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA;
          });

        return {
          success: true,
          orders: normalized,
          meta: res.meta || { page: 1, limit: 20, total: normalized.length, totalPages: 1 },
        };
      }

      return {
        success: true,
        orders: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 1 },
      };
    } catch (err) {
      console.warn('[customerOrderApi.getMyOrders] Failed:', err.message);
      return {
        success: false,
        orders: [],
        error: err.statusCode === 401
          ? 'Please sign in to view your orders.'
          : 'Unable to load your orders. Please try again.',
      };
    }
  },

  /**
   * Retrieve single customer order with strict backend ownership verification.
   * GET /api/customer/orders/:orderId
   *
   * If the order does not belong to this customer, returns safe 'Order Not Found' error.
   *
   * @param {string} orderId
   * @returns {Promise<{ success: boolean, order: Object|null, error?: string }>}
   */
  async getMyOrderById(orderId) {
    if (!orderId || typeof orderId !== 'string') {
      return { success: false, order: null, error: 'Invalid order reference.' };
    }

    const token = customerStorage.getToken();
    if (!token) {
      return {
        success: false,
        order: null,
        status: 401,
        isAuthError: true,
        error: 'You are not authorized to view this order.',
      };
    }

    const cleanId = orderId.trim();

    try {
      const res = await api.get(`/customer/orders/${encodeURIComponent(cleanId)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res && res.success && res.data) {
        const normalized = normalizeBackendOrder(res.data);
        return {
          success: true,
          order: normalized,
        };
      }

      return {
        success: false,
        order: null,
        status: 404,
        isNotFound: true,
        error: 'Order not found.',
      };
    } catch (err) {
      console.warn(`[customerOrderApi.getMyOrderById] Failed for ${cleanId}:`, err.message);
      const statusCode = err.status || err.statusCode || 0;
      const isAuthError = statusCode === 401 || statusCode === 403 || err.isAuthError || err.isForbidden;
      const isNotFound = statusCode === 404;

      let errorMessage = 'Unable to refresh order status. Please try again.';
      if (isAuthError) {
        errorMessage = 'You are not authorized to view this order.';
      } else if (isNotFound) {
        errorMessage = 'Order not found.';
      }

      return {
        success: false,
        order: null,
        status: statusCode,
        isAuthError,
        isNotFound,
        error: errorMessage,
      };
    }
  },
};

export default customerOrderApi;
