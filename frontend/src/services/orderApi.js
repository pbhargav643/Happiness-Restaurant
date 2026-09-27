import api from './api.js';
import { customerStorage } from './customerAuthApi.js';
import {
  formatTime12h,
  formatDateReadable,
  normalizePhoneNumber,
} from '../config/pickupConfig.js';
import {
  ACTIVE_ORDER_STORAGE_KEY,
} from './orderService.js';

export const CUSTOMER_MOBILE_STORAGE_KEY = 'restaurant_customer_mobile';

/**
 * Retrieve the customer's mobile number safely from localStorage.
 * Resolves from:
 * 1. Dedicated customer mobile key ('restaurant_customer_mobile')
 * 2. Authenticated customer session user ('happiness_customer_user')
 * 3. Active order customer mobile ('restaurant_active_order')
 */
export function getCustomerMobile() {
  try {
    const direct = localStorage.getItem(CUSTOMER_MOBILE_STORAGE_KEY);
    if (direct && normalizePhoneNumber(direct)) {
      return normalizePhoneNumber(direct);
    }

    const customerUserRaw = localStorage.getItem('happiness_customer_user');
    if (customerUserRaw) {
      try {
        const cust = JSON.parse(customerUserRaw);
        if (cust?.mobile && normalizePhoneNumber(cust.mobile)) {
          return normalizePhoneNumber(cust.mobile);
        }
      } catch {
        // Parse error ignore
      }
    }

    const activeRaw = localStorage.getItem(ACTIVE_ORDER_STORAGE_KEY);
    if (activeRaw) {
      try {
        const active = JSON.parse(activeRaw);
        const mob = active?.customer?.mobile || active?.customer?.phone || active?.mobile;
        if (mob && normalizePhoneNumber(mob)) {
          return normalizePhoneNumber(mob);
        }
      } catch {
        // Parse error ignore
      }
    }

    return null;
  } catch (err) {
    console.warn('[orderApi] getCustomerMobile failed:', err);
    return null;
  }
}

/**
 * Store the customer mobile number safely in localStorage.
 */
export function setCustomerMobile(mobile) {
  const clean = normalizePhoneNumber(mobile);
  if (!clean) return;
  try {
    localStorage.setItem(CUSTOMER_MOBILE_STORAGE_KEY, clean);
  } catch (err) {
    console.warn('[orderApi] setCustomerMobile failed:', err);
  }
}

/**
 * Safely clears the active order reference from localStorage without deleting backend records.
 */
export function clearActiveOrder() {
  try {
    localStorage.removeItem(ACTIVE_ORDER_STORAGE_KEY);
  } catch (err) {
    console.warn('[orderApi] clearActiveOrder failed:', err);
  }
}

/**
 * Normalizes a backend order object to match frontend component expectations
 * while strictly preserving backend authoritative values (orderId, subtotal, status, items).
 */
export function normalizeBackendOrder(order) {
  if (!order || typeof order !== 'object') return null;

  const rawCustomer = order.customer || {};
  const rawPickup = order.pickup || {};
  const rawItems = Array.isArray(order.items) ? order.items : [];

  const items = rawItems.map((item) => {
    const unitPrice = Number(item.price) || 0;
    const qty = Number(item.quantity) || 1;
    return {
      itemId: item.itemId || item._id || item.id,
      name: item.name || '',
      price: unitPrice,
      unitPrice,
      quantity: qty,
      itemTotal: unitPrice * qty,
      image: item.image || null,
      isVeg: item.isVeg !== undefined ? item.isVeg : true,
    };
  });

  const totalCount = items.reduce((sum, it) => sum + it.quantity, 0);

  return {
    _id: order._id,
    orderId: order.orderId,
    orderType: order.orderType || 'PICKUP',
    status: order.status || 'PLACED',
    subtotal: Number(order.subtotal) || 0,
    readyTime: order.readyTime || null,
    createdAt: order.createdAt || new Date().toISOString(),
    updatedAt: order.updatedAt || order.createdAt || new Date().toISOString(),
    customer: {
      name: rawCustomer.name || '',
      mobile: rawCustomer.mobile || rawCustomer.phone || '',
      phone: rawCustomer.mobile || rawCustomer.phone || '',
      email: rawCustomer.email || null,
    },
    pickup: {
      date: rawPickup.date || '',
      dateFormatted: rawPickup.date ? formatDateReadable(rawPickup.date) : '',
      time: rawPickup.time || '',
      timeFormatted: rawPickup.time ? formatTime12h(rawPickup.time) : '',
      serviceMode: 'Restaurant Self-Pickup',
    },
    items,
    totalCount,
    pickupNotice:
      'Please collect your parcel from the restaurant counter at your selected pickup time. No home delivery is available.',
  };
}

/**
 * Stores a lightweight active order reference in localStorage for UI convenience
 * (e.g. auto-populating track-order search). Does NOT store complete authoritative orders.
 */
export function syncOrderToStorage(backendOrder) {
  if (!backendOrder || !backendOrder.orderId) return null;

  const normalized = normalizeBackendOrder(backendOrder);
  if (!normalized) return null;

  try {
    const reference = {
      orderId: normalized.orderId,
      pickup: {
        date: normalized.pickup?.date,
        dateFormatted: normalized.pickup?.dateFormatted,
        time: normalized.pickup?.time,
        timeFormatted: normalized.pickup?.timeFormatted,
      },
      customer: {
        name: normalized.customer?.name,
        mobile: normalized.customer?.mobile,
      },
      status: normalized.status,
      createdAt: normalized.createdAt,
    };
    localStorage.setItem(ACTIVE_ORDER_STORAGE_KEY, JSON.stringify(reference));
    return normalized;
  } catch (err) {
    console.warn('[orderApi] Failed to store active order reference:', err);
    return normalized;
  }
}

/**
 * Order API Service
 * Centralizes all customer and admin order operations.
 */
export const orderApi = {
  getCustomerMobile,
  setCustomerMobile,
  clearActiveOrder,

  /**
   * Place a new order via POST /api/orders
   *
   * Backend remains 100% authoritative for:
   * - Item pricing
   * - Subtotal calculation
   * - Order ID generation (RF-YYYYMMDD-XXXXXX)
   * - Initial status (PLACED)
   *
   * @param {Object} orderData
   * @param {Object} orderData.customer { name, phone/mobile, email }
   * @param {Object} orderData.pickup { date, time }
   * @param {Array} orderData.items Array of { itemId, quantity } or cart items
   * @returns {Promise<{ success: boolean, order: Object, message: string }>}
   */
  async createOrder(orderData) {
    if (!orderData || typeof orderData !== 'object') {
      throw new Error('Please check your order details.');
    }

    const { customer, pickup, items } = orderData;

    // 1. Client-Side Pre-Validation for required fields
    if (!customer?.name || !customer.name.trim()) {
      throw new Error('Please enter your full name.');
    }

    const cleanMobile = normalizePhoneNumber(customer.mobile || customer.phone);
    if (!cleanMobile || !/^[6-9]\d{9}$/.test(cleanMobile)) {
      throw new Error('Please enter a valid 10-digit mobile number.');
    }

    if (!pickup?.date) {
      throw new Error('Please select a valid pickup date.');
    }

    if (!pickup?.time) {
      throw new Error('Please select an available pickup time slot.');
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Your cart is empty. Please add items to proceed.');
    }

    // 2. Construct Safe API Payload (Prices are NEVER sent as authoritative)
    const payloadItems = items.map((item) => {
      const id = item._id || item.slug || item.itemId || item.id;
      const qty = Math.max(1, Math.floor(Number(item.quantity)) || 1);
      return {
        itemId: String(id).trim(),
        quantity: qty,
      };
    });

    const payload = {
      customer: {
        name: customer.name.trim(),
        mobile: cleanMobile,
        ...(customer.email && customer.email.trim() ? { email: customer.email.trim() } : {}),
      },
      pickup: {
        date: String(pickup.date).trim(),
        time: String(pickup.time).trim(),
      },
      items: payloadItems,
      orderType: 'PICKUP', // Strict Self-Pickup
    };

    // 3. Send POST Request to centralized backend (attaches customer token if authenticated)
    const customerToken = customerStorage.getToken();
    const requestOptions = customerToken
      ? { headers: { Authorization: `Bearer ${customerToken}` } }
      : {};

    const response = await api.post('/orders', payload, requestOptions);

    if (!response || !response.success || !response.data) {
      const err = new Error(response?.message || "We couldn't place your order right now. Please try again.");
      err.statusCode = response?.status || 400;
      throw err;
    }

    const rawOrder = response.data;
    const normalizedOrder = normalizeBackendOrder(rawOrder);

    // 4. Save customer mobile safely for order history retrieval
    setCustomerMobile(cleanMobile);

    // 5. Synchronize with local storage for seamless compatibility with tracking/history
    syncOrderToStorage(rawOrder);

    return {
      success: true,
      order: normalizedOrder,
      rawOrder,
      orderId: normalizedOrder.orderId,
      message: response.message || 'Order placed successfully',
    };
  },

  /**
   * Retrieve order details by Order ID
   * GET /api/orders/:orderId
   *
   * @param {string} orderId
   * @returns {Promise<{ success: boolean, order: Object, fromBackend: boolean, error?: string }>}
   */
  async getOrderById(orderId) {
    if (!orderId || typeof orderId !== 'string') {
      return { success: false, order: null, error: 'Invalid order reference.' };
    }

    const cleanId = orderId.trim();

    try {
      const customerToken = customerStorage.getToken();
      const requestOptions = customerToken
        ? { headers: { Authorization: `Bearer ${customerToken}` } }
        : {};
      const response = await api.get(`/orders/${encodeURIComponent(cleanId)}`, requestOptions);

      if (response && response.success && response.data) {
        const normalized = normalizeBackendOrder(response.data);
        syncOrderToStorage(response.data);
        return { success: true, order: normalized, fromBackend: true };
      }

      return { success: false, order: null, error: 'Order Not Found' };
    } catch (err) {
      console.warn(`[orderApi.getOrderById] Backend fetch failed for ${cleanId}:`, err.message);
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

  /**
   * Retrieve customer order history by mobile number
   * GET /api/orders?mobile=...
   *
   * @param {string} mobile
   * @param {Object} options
   */
  async getOrdersByMobile(mobile, options = {}) {
    const cleanMobile = normalizePhoneNumber(mobile);
    if (!cleanMobile) {
      return { success: false, orders: [], total: 0, error: 'Valid 10-digit mobile number required.' };
    }

    const params = new URLSearchParams();
    params.set('mobile', cleanMobile);
    if (options.page) params.set('page', String(options.page));
    if (options.limit) params.set('limit', String(options.limit));

    try {
      const response = await api.get(`/orders?${params.toString()}`);
      if (response && response.success && Array.isArray(response.data)) {
        const normalized = response.data
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
          meta: response.meta || { page: 1, limit: 20, total: normalized.length, totalPages: 1 },
        };
      }
      return { success: true, orders: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } };
    } catch (err) {
      console.warn('[orderApi.getOrdersByMobile] Failed:', err.message);
      return { success: false, orders: [], error: 'Unable to load your orders. Please try again.' };
    }
  },
};

export default orderApi;
