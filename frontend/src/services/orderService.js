import { getMenuItemById } from '../data/menuData.js';
import {
  PICKUP_CONFIG,
  formatTime12h,
  formatDateReadable,
  normalizePhoneNumber,
  validateCustomerDetails,
} from '../config/pickupConfig.js';

export const ORDERS_STORAGE_KEY = 'restaurant_orders';
export const ACTIVE_ORDER_STORAGE_KEY = 'restaurant_active_order';
export const HIDDEN_ORDERS_STORAGE_KEY = 'restaurant_hidden_order_ids';

export const ORDER_STATUSES = {
  PLACED: 'PLACED',
  PREPARING: 'PREPARING',
  READY: 'READY',
  PICKED_UP: 'PICKED UP',
};

export const ORDER_STATUS_STEPS = ['PLACED', 'PREPARING', 'READY', 'PICKED UP'];

export const ORDER_STATUS_DESCRIPTIONS = {
  PLACED: 'Your order has been placed.',
  PREPARING: 'Your order is being prepared.',
  READY: 'Your parcel is ready for pickup.',
  PICKED_UP: 'Your order has been completed.',
};

/**
 * Returns user-friendly status description for current status
 */
export function getOrderStatusDescription(status) {
  if (!status) return ORDER_STATUS_DESCRIPTIONS.PLACED;
  const normalized = String(status).trim().toUpperCase();
  if (normalized === 'PREPARING') return ORDER_STATUS_DESCRIPTIONS.PREPARING;
  if (normalized === 'READY') return ORDER_STATUS_DESCRIPTIONS.READY;
  if (normalized === 'PICKED UP' || normalized === 'PICKED_UP') return ORDER_STATUS_DESCRIPTIONS.PICKED_UP;
  return ORDER_STATUS_DESCRIPTIONS.PLACED;
}

/**
 * Checks if an order is completed (PICKED UP)
 */
export function isOrderCompleted(status) {
  if (!status) return false;
  const normalized = String(status).trim().toUpperCase();
  return normalized === 'PICKED UP' || normalized === 'PICKED_UP';
}

/**
 * Maps an order status string to a 0-indexed step number:
 * 0: PLACED
 * 1: PREPARING
 * 2: READY
 * 3: PICKED UP
 */
export function getOrderStatusStepIndex(status) {
  if (!status) return 0;
  const normalized = String(status).trim().toUpperCase();
  if (normalized === 'PLACED') return 0;
  if (normalized === 'PREPARING') return 1;
  if (normalized === 'READY') return 2;
  if (normalized === 'PICKED UP' || normalized === 'PICKED_UP') return 3;
  return 0;
}

/**
 * Retrieve the active/recent order from localStorage
 */
export function getActiveOrder() {
  try {
    const raw = localStorage.getItem(ACTIVE_ORDER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.orderId) return null;
    return parsed;
  } catch (e) {
    console.warn('Unable to read active order from localStorage:', e);
    return null;
  }
}

/**
 * Generate a unique, human-readable Order ID
 * Format: RF-YYYYMMDD-XXXXXX (e.g. RF-20260915-482731)
 */
export function generateOrderId(referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, '0');
  const day = String(referenceDate.getDate()).padStart(2, '0');
  const dateSegment = `${year}${month}${day}`;

  // Random 6-digit numeric suffix
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  return `RF-${dateSegment}-${randomSuffix}`;
}

/**
 * Retrieve all locally saved orders
 * Guaranteed chronological descending order (newest first)
 * Resilient against null, corrupted entries, or invalid dates.
 */
export function getAllOrders() {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Filter valid order objects
    const validOrders = parsed.filter(
      (item) => item && typeof item === 'object' && typeof item.orderId === 'string'
    );

    // Sort chronological descending (newest first, invalid dates at the end)
    return validOrders.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      const validA = !isNaN(timeA) && timeA > 0;
      const validB = !isNaN(timeB) && timeB > 0;

      if (validA && validB) {
        return timeB - timeA;
      }
      if (validA && !validB) return -1;
      if (!validA && validB) return 1;
      return 0;
    });
  } catch (e) {
    console.warn('Unable to read orders from localStorage:', e);
    return [];
  }
}

/**
 * Retrieve an order by its unique Order ID
 * Validates against locally stored records to ensure privacy.
 */
export function getOrderById(orderId) {
  if (!orderId || typeof orderId !== 'string') {
    return { success: false, order: null, error: 'Invalid order ID requested.' };
  }

  try {
    const cleanId = orderId.trim().toUpperCase();
    const orders = getAllOrders();
    const found = orders.find(
      (o) => o && String(o.orderId || '').trim().toUpperCase() === cleanId
    );

    if (found) {
      return { success: true, order: found, error: null };
    }

    // Check active order fallback if exists
    const activeRaw = localStorage.getItem(ACTIVE_ORDER_STORAGE_KEY);
    if (activeRaw) {
      const active = JSON.parse(activeRaw);
      if (active && String(active.orderId || '').trim().toUpperCase() === cleanId) {
        return { success: true, order: active, error: null };
      }
    }

    return { success: false, order: null, error: 'Order Not Found' };
  } catch (e) {
    console.warn('Error reading order from localStorage:', e);
    return { success: false, order: null, error: 'Failed to access order storage.' };
  }
}

/**
 * Validate order data and price/quantity integrity against centralized menuData
 */
export function validateOrderIntegrity({ customer, pickup, items }) {
  // 1. Validate Customer
  const customerValidation = validateCustomerDetails(customer || {});
  if (!customerValidation.isValid) {
    return {
      isValid: false,
      error: 'Please fill in all required customer contact details correctly.',
      fieldErrors: customerValidation.errors,
    };
  }

  // 2. Validate Pickup
  if (!pickup || !pickup.date) {
    return { isValid: false, error: 'Please select a valid pickup date.' };
  }
  if (!pickup.time) {
    return { isValid: false, error: 'Please select an available pickup time slot.' };
  }

  // 3. Validate Items & Cart Not Empty
  if (!Array.isArray(items) || items.length === 0) {
    return { isValid: false, error: 'Your cart is empty. Please add items to proceed.' };
  }

  // 4. Quantity & Price Integrity Check against centralized menuData
  const validatedItems = [];
  let calculatedSubtotal = 0;

  for (const item of items) {
    const itemId = item.itemId || item.id;
    if (!itemId) {
      return { isValid: false, error: 'Invalid food item in cart.' };
    }

    const menuItem = getMenuItemById(itemId);
    if (!menuItem) {
      return {
        isValid: false,
        error: `Item "${item.name || itemId}" is no longer available. Please review your cart.`,
      };
    }

    const qty = Number(item.quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      return {
        isValid: false,
        error: `Invalid quantity for "${menuItem.name}". Quantity must be at least 1.`,
      };
    }

    // Verify price matches centralized source of truth
    if (item.unitPrice !== undefined && Number(item.unitPrice) !== menuItem.price) {
      return {
        isValid: false,
        error: 'Some menu information has changed. Please review your cart.',
      };
    }

    const lineTotal = menuItem.price * qty;
    calculatedSubtotal += lineTotal;

    validatedItems.push({
      itemId: menuItem.id,
      name: menuItem.name,
      categoryName: menuItem.categoryName,
      isVeg: menuItem.isVeg,
      image: menuItem.image,
      quantity: qty,
      unitPrice: menuItem.price,
      itemTotal: lineTotal,
    });
  }

  return {
    isValid: true,
    validatedItems,
    calculatedSubtotal,
    customer: {
      name: customer.name.trim(),
      phone: normalizePhoneNumber(customer.phone),
      email: customer.email ? customer.email.trim() : null,
    },
    pickup: {
      date: pickup.date,
      dateFormatted: formatDateReadable(pickup.date),
      time: pickup.time,
      timeFormatted: formatTime12h(pickup.time),
      serviceMode: PICKUP_CONFIG.serviceMode,
    },
  };
}

/**
 * Create Frontend Order
 * Modular integration point for frontend order placement.
 * Validates integrity, generates Order ID, saves to localStorage.
 *
 * NOTE: ZERO backend/Express/MongoDB/SMS/WhatsApp/Payment.
 */
export function createOrder({ customer, pickup, items }) {
  const integrity = validateOrderIntegrity({ customer, pickup, items });
  if (!integrity.isValid) {
    return {
      success: false,
      error: integrity.error,
      fieldErrors: integrity.fieldErrors,
      order: null,
    };
  }

  const orderId = generateOrderId();
  const createdAt = new Date().toISOString();

  const order = {
    orderId,
    createdAt,
    customer: integrity.customer,
    pickup: integrity.pickup,
    items: integrity.validatedItems,
    totalCount: integrity.validatedItems.reduce((acc, item) => acc + item.quantity, 0),
    subtotal: integrity.calculatedSubtotal,
    orderType: 'PICKUP',
    status: 'PLACED',
    pickupNotice:
      'Please collect your parcel from the restaurant counter at your selected pickup time. No home delivery is available.',
  };

  // Persist order locally
  try {
    const existingOrders = getAllOrders();
    const updatedOrders = [order, ...existingOrders];
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updatedOrders));
    localStorage.setItem(ACTIVE_ORDER_STORAGE_KEY, JSON.stringify(order));

    return {
      success: true,
      error: null,
      order,
    };
  } catch (e) {
    console.error('LocalStorage storage failure:', e);
    return {
      success: false,
      error: "We couldn't save your order on this device. Please try again.",
      order: null,
    };
  }
}

/**
 * Update Order Status (Admin UI Foundation)
 * Allows Admin to transition order status: PLACED -> PREPARING -> READY -> PICKED UP
 * Optionally update estimated pickup ready time.
 * Validates against invalid backward transitions unless explicit admin correction mode is active.
 * Updates both restaurant_orders and restaurant_active_order (if matching).
 *
 * NOTE: Frontend/localStorage foundation only. Real server-side status updates will be handled with backend.
 */
export function updateOrderStatus(orderId, newStatus, readyTime = undefined, isCorrection = false) {
  if (!orderId || !newStatus) {
    return { success: false, error: 'Order ID and new status are required.', order: null };
  }

  const validStatuses = ['PLACED', 'PREPARING', 'READY', 'PICKED UP'];
  const normalized = String(newStatus).trim().toUpperCase();
  const matchedStatus = validStatuses.find(
    (s) => s === normalized || s === normalized.replace('_', ' ')
  );

  if (!matchedStatus) {
    return { success: false, error: `Invalid status "${newStatus}".`, order: null };
  }

  try {
    const orders = getAllOrders();
    const targetIdx = orders.findIndex((o) => o && o.orderId === orderId);

    if (targetIdx === -1) {
      return { success: false, error: 'Order not found.', order: null };
    }

    const currentOrder = orders[targetIdx];
    const currentStep = getOrderStatusStepIndex(currentOrder.status);
    const targetStep = getOrderStatusStepIndex(matchedStatus);

    // Prevent backward transition unless explicit admin correction is provided
    if (targetStep < currentStep && !isCorrection) {
      return {
        success: false,
        isBackward: true,
        error: `Cannot transition backward from "${currentOrder.status}" to "${matchedStatus}" without explicit admin correction mode.`,
        order: null,
      };
    }

    const updatedOrder = {
      ...currentOrder,
      status: matchedStatus,
    };

    if (isCorrection && targetStep < currentStep) {
      updatedOrder.lastCorrection = {
        from: currentOrder.status,
        to: matchedStatus,
        correctedAt: new Date().toISOString(),
      };
    }

    if (readyTime !== undefined) {
      updatedOrder.readyTime = readyTime;
    }

    orders[targetIdx] = updatedOrder;
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));

    // Also update active order if matching
    const active = getActiveOrder();
    if (active && active.orderId === orderId) {
      localStorage.setItem(ACTIVE_ORDER_STORAGE_KEY, JSON.stringify(updatedOrder));
    }

    return { success: true, error: null, order: updatedOrder };
  } catch (e) {
    console.error('Failed to update order status in localStorage:', e);
    return { success: false, error: 'Storage update failed.', order: null };
  }
}

/**
 * Retrieve list of order IDs hidden from the user's personal history view.
 */
export function getHiddenOrderIds() {
  try {
    const raw = localStorage.getItem(HIDDEN_ORDERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Unable to read hidden order IDs from localStorage:', e);
    return [];
  }
}

/**
 * Check if a specific order is hidden from the user's personal history view.
 */
export function isOrderHiddenFromHistory(orderId) {
  if (!orderId) return false;
  const hidden = getHiddenOrderIds();
  return hidden.includes(orderId);
}

/**
 * Hide a completed order from user personal history view.
 * IMPORTANT: Strictly preserves the underlying restaurant order record.
 * Only PICKED_UP / completed orders are eligible. Active orders cannot be removed.
 * Supports both locally stored orders and orders fetched from backend API.
 *
 * @param {string} orderId - Unique order ID to hide
 * @param {Object} [orderObj] - Optional order object (for orders from backend API)
 * @returns {{ success: boolean, hiddenOrderIds?: string[], error?: string }}
 */
export function hideOrderFromHistory(orderId, orderObj = null) {
  if (!orderId || typeof orderId !== 'string') {
    return { success: false, error: 'Invalid order ID requested.' };
  }

  try {
    // 1. Resolve order details: check passed orderObj first, then fallback to local storage
    let targetOrder = orderObj && typeof orderObj === 'object' ? orderObj : null;
    if (!targetOrder) {
      const res = getOrderById(orderId);
      if (res && res.success && res.order) {
        targetOrder = res.order;
      }
    }

    // 2. Validate completion status if order details are available
    if (targetOrder && targetOrder.status) {
      if (!isOrderCompleted(targetOrder.status)) {
        return {
          success: false,
          error: 'Active orders cannot be removed from history. Only completed (Picked Up) orders can be removed.',
        };
      }
    }

    // 3. Persist hidden order ID into localStorage using existing architecture
    const hidden = getHiddenOrderIds();
    if (!hidden.includes(orderId)) {
      hidden.push(orderId);
      localStorage.setItem(HIDDEN_ORDERS_STORAGE_KEY, JSON.stringify(hidden));
    }

    return { success: true, hiddenOrderIds: hidden };
  } catch (e) {
    console.error('Failed to hide order from history in localStorage:', e);
    return { success: false, error: 'Storage update failed.' };
  }
}

/**
 * Retrieve customer-visible orders for Order History.
 * Filters out completed orders that the user removed/hid from their personal history.
 * Does NOT alter restaurant_orders, Admin orders, or database records.
 */
export function getUserOrderHistory() {
  const allOrders = getAllOrders();
  const hiddenIds = new Set(getHiddenOrderIds());
  return allOrders.filter((order) => order && !hiddenIds.has(order.orderId));
}

/**
 * Safely removes a specific stale or invalid order reference from local storage
 * without deleting other orders, cart, customer auth, or backend database records.
 *
 * @param {string} orderId - Unique order ID to prune from local storage
 * @returns {boolean} True if successfully pruned
 */
export function removeStaleLocalOrder(orderId) {
  if (!orderId || typeof orderId !== 'string') return false;
  const cleanId = orderId.trim().toUpperCase();

  try {
    const orders = getAllOrders();
    const filtered = orders.filter(
      (o) => o && String(o.orderId || '').trim().toUpperCase() !== cleanId
    );
    if (filtered.length !== orders.length) {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(filtered));
    }

    const activeRaw = localStorage.getItem(ACTIVE_ORDER_STORAGE_KEY);
    if (activeRaw) {
      try {
        const active = JSON.parse(activeRaw);
        if (active && String(active.orderId || '').trim().toUpperCase() === cleanId) {
          localStorage.removeItem(ACTIVE_ORDER_STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(ACTIVE_ORDER_STORAGE_KEY);
      }
    }

    return true;
  } catch (e) {
    console.warn('Unable to remove stale order from localStorage:', e);
    return false;
  }
}

