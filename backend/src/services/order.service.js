import mongoose from 'mongoose';
import Order from '../models/Order.js';
import MenuItem, { generateSlug } from '../models/MenuItem.js';
import notificationService from './notificationService.js';
import { MENU_ITEMS, MENU_CATEGORIES } from '../data/menuData.js';

// Allowed sequential status transitions (Strict Forward Progression)
const ALLOWED_STATUS_TRANSITIONS = {
  PLACED: ['PREPARING'],
  PREPARING: ['READY'],
  READY: ['PICKED_UP'],
  PICKED_UP: [], // Terminal status: zero transitions allowed
};

// Whitelisted sorting fields to prevent arbitrary MongoDB field injection
const ALLOWED_SORT_FIELDS = ['createdAt', 'pickup.date', 'status', 'subtotal'];

/**
 * Normalizes and validates an Indian 10-digit mobile number
 */
export function normalizeIndianMobile(mobile) {
  if (!mobile || (typeof mobile !== 'string' && typeof mobile !== 'number')) return null;
  const str = String(mobile).trim();
  const digits = str.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    const local = digits.slice(2);
    return /^[6-9]\d{9}$/.test(local) ? local : null;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    const local = digits.slice(1);
    return /^[6-9]\d{9}$/.test(local) ? local : null;
  }
  if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
    return digits;
  }
  return null;
}

/**
 * Validates pickup date (YYYY-MM-DD or textual date like 'Today' / 'Tomorrow')
 */
export function validatePickupDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const match = dateStr.trim().match(/^\d{4}-\d{2}-\d{2}$/);
  if (!match) return false;

  const [y, m, d] = dateStr.trim().split('-').map(Number);
  const pickupDate = new Date(y, m - 1, d);
  if (
    pickupDate.getFullYear() !== y ||
    pickupDate.getMonth() !== m - 1 ||
    pickupDate.getDate() !== d
  ) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return pickupDate >= today;
}

/**
 * Validates pickup time in 24-hour (HH:MM) or 12-hour (hh:mm AM/PM) format
 */
export function validatePickupTime(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return false;
  const trimmed = timeStr.trim();
  if (!trimmed) return false;
  const time24 = /^([01]?\d|2[0-3]):([0-5]\d)$/;
  const time12 = /^(0?[1-9]|1[0-2]):([0-5]\d)\s*(AM|PM)?$/i;
  return time24.test(trimmed) || time12.test(trimmed);
}

/**
 * Generates a unique, readable server-side Order ID formatted as RF-YYYYMMDD-XXXXXX
 */
export async function generateUniqueOrderId() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const datePart = `${yyyy}${mm}${dd}`;

  for (let i = 0; i < 10; i++) {
    const randomSix = Math.floor(100000 + Math.random() * 900000);
    const candidateId = `RF-${datePart}-${randomSix}`;
    if (mongoose.connection.readyState !== 1) {
      return candidateId;
    }
    const exists = await Order.findOne({ orderId: candidateId });
    if (!exists) {
      return candidateId;
    }
  }

  return `RF-${datePart}-${Date.now().toString().slice(-6)}`;
}

/**
 * Order Service Layer
 * Centralizes all Order database logic, price verification, and status control.
 */
export const orderService = {
  /**
   * Create a new order with server-side price verification and subtotal calculation
   */
  async createOrder(payload, authenticatedCustomerId = null) {
    const { customer, pickup, items, orderType = 'PICKUP' } = payload || {};

    // 1. Order Type Validation (Strictly PICKUP only)
    if (orderType && String(orderType).toUpperCase() !== 'PICKUP') {
      const err = new Error('Order type must be strictly "PICKUP". Delivery is not supported.');
      err.statusCode = 400;
      throw err;
    }

    // 2. Customer Validation
    if (!customer || typeof customer !== 'object') {
      const err = new Error('Customer details are required');
      err.statusCode = 400;
      throw err;
    }

    if (!customer.name || typeof customer.name !== 'string' || !customer.name.trim()) {
      const err = new Error('Customer name is required and cannot be empty');
      err.statusCode = 400;
      throw err;
    }

    const cleanMobile = normalizeIndianMobile(customer.mobile);
    if (!cleanMobile) {
      const err = new Error('Valid 10-digit Indian mobile number is required');
      err.statusCode = 400;
      throw err;
    }

    if (customer.email && typeof customer.email === 'string' && customer.email.trim()) {
      const emailRegex = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/;
      if (!emailRegex.test(customer.email.trim())) {
        const err = new Error('Please provide a valid email address');
        err.statusCode = 400;
        throw err;
      }
    }

    // 3. Pickup Details Validation
    if (!pickup || typeof pickup !== 'object') {
      const err = new Error('Pickup details are required');
      err.statusCode = 400;
      throw err;
    }

    if (!pickup.date || !validatePickupDate(pickup.date)) {
      const err = new Error('Valid pickup date is required');
      err.statusCode = 400;
      throw err;
    }

    if (!pickup.time || !validatePickupTime(pickup.time)) {
      const err = new Error('Valid pickup time is required');
      err.statusCode = 400;
      throw err;
    }

    // 4. Items Validation
    if (!Array.isArray(items) || items.length === 0) {
      const err = new Error('Order must contain at least one item');
      err.statusCode = 400;
      throw err;
    }

    // Validate item format and positive integer quantities upfront
    for (const entry of items) {
      if (!entry || typeof entry !== 'object') {
        const err = new Error('Each order item must be a valid object');
        err.statusCode = 400;
        throw err;
      }
      const { itemId, quantity } = entry;
      if (!itemId || typeof itemId !== 'string' || !itemId.trim()) {
        const err = new Error('Each order item must specify a valid itemId');
        err.statusCode = 400;
        throw err;
      }

      const numQuantity = Number(quantity);
      if (!Number.isInteger(numQuantity) || numQuantity < 1) {
        const err = new Error('Quantity must be a positive integer (minimum 1)');
        err.statusCode = 400;
        throw err;
      }
    }

    if (mongoose.connection.readyState !== 1) {
      const err = new Error('Database is not connected');
      err.statusCode = 503;
      throw err;
    }

    // 5. Server-Side Price Verification & Historical Item Snapshot Generation
    let calculatedSubtotal = 0;
    const itemSnapshots = [];

    for (const entry of items) {
      const { itemId, quantity } = entry;
      const numQuantity = Number(quantity);

      // Fetch MenuItem directly from database (by ObjectId, direct slug, catalog ID, or category-prefixed slug)
      const cleanItemId = itemId.trim();
      let menuItem = null;

      // 1. By MongoDB ObjectId
      if (mongoose.isValidObjectId(cleanItemId)) {
        menuItem = await MenuItem.findById(cleanItemId);
      }

      // 2. By direct slug match
      if (!menuItem) {
        menuItem = await MenuItem.findOne({ slug: cleanItemId.toLowerCase() });
      }

      // 3. By matching physical MENU_ITEMS catalog (frontend item.id e.g. 'fast-food-cheese-sandwich')
      if (!menuItem) {
        const catalogItem = MENU_ITEMS.find(
          (m) => m.id === cleanItemId || (m.slug && m.slug === cleanItemId.toLowerCase())
        );
        if (catalogItem) {
          const expectedSlug = catalogItem.slug || generateSlug(catalogItem.name);
          menuItem = await MenuItem.findOne({
            $or: [{ slug: expectedSlug }, { name: catalogItem.name }],
          });
        }
      }

      // 4. By stripping known multi-word category prefixes (e.g. 'fast-food-', 'tandoori-starter-')
      if (!menuItem && cleanItemId.includes('-')) {
        for (const cat of MENU_CATEGORIES) {
          if (cleanItemId.startsWith(`${cat.slug}-`)) {
            const potentialSlug = cleanItemId.slice(cat.slug.length + 1);
            menuItem = await MenuItem.findOne({ slug: potentialSlug.toLowerCase() });
            if (menuItem) break;
          }
        }
      }

      // 5. Generic single-word prefix fallback (e.g. 'soup-veg-clear-soup' -> 'veg-clear-soup')
      if (!menuItem && cleanItemId.includes('-')) {
        const stripped = cleanItemId.replace(/^[a-z0-9]+-/, '');
        if (stripped && stripped !== cleanItemId) {
          menuItem = await MenuItem.findOne({ slug: stripped.toLowerCase() });
        }
      }

      if (!menuItem) {
        const err = new Error('Menu item not found');
        err.statusCode = 404;
        throw err;
      }

      if (menuItem.isAvailable === false || menuItem.available === false) {
        const err = new Error(`Menu item "${menuItem.name}" is currently unavailable`);
        err.statusCode = 400;
        throw err;
      }

      // Server reads authentic price from DB - never trust client price or client subtotal
      const realPrice = menuItem.price;
      calculatedSubtotal += realPrice * numQuantity;

      // Historical item snapshot: preserves name, price, quantity, image at order time
      itemSnapshots.push({
        itemId: menuItem._id.toString(),
        name: menuItem.name,
        price: realPrice,
        quantity: numQuantity,
        image: menuItem.image || null,
      });
    }

    // 6. Generate Unique Order ID: RF-YYYYMMDD-XXXXXX
    const orderId = await generateUniqueOrderId();

    // 7. Persist Order with Initial Status strictly PLACED
    // Secure Customer Order Ownership:
    // Never trust payload.customerId from frontend body. Only use verified authenticatedCustomerId.
    let cleanCustomerId = null;
    if (authenticatedCustomerId) {
      cleanCustomerId = mongoose.isValidObjectId(authenticatedCustomerId)
        ? new mongoose.Types.ObjectId(authenticatedCustomerId)
        : authenticatedCustomerId;
    }

    const newOrder = new Order({
      orderId,
      customerId: cleanCustomerId,
      customer: {
        name: customer.name.trim(),
        mobile: cleanMobile,
        email: customer.email && customer.email.trim() ? customer.email.trim() : null,
      },
      pickup: {
        date: pickup.date.trim(),
        time: pickup.time.trim(),
      },
      items: itemSnapshots,
      subtotal: calculatedSubtotal,
      orderType: 'PICKUP',
      status: 'PLACED',
      readyTime: null,
    });

    const savedOrder = await newOrder.save();

    // Trigger ORDER_PLACED notification non-blockingly
    // Strict Failure Isolation: Order creation is guaranteed even if notification dispatch fails
    try {
      await notificationService.sendOrderNotification(savedOrder, 'ORDER_PLACED');
    } catch (notifErr) {
      console.warn(`[OrderService] Non-blocking ORDER_PLACED notification error for order ${savedOrder.orderId}:`, notifErr.message);
    }

    return savedOrder;
  },

  /**
   * Get single order by orderId
   */
  async getOrderById(orderId) {
    if (!orderId || typeof orderId !== 'string') return null;
    if (mongoose.connection.readyState !== 1) return null;

    const clean = orderId.trim();
    let order = await Order.findOne({ orderId: clean.toUpperCase() })
      .select('-__v')
      .lean();

    if (!order && mongoose.isValidObjectId(clean)) {
      order = await Order.findById(clean).select('-__v').lean();
    }
    return order;
  },

  /**
   * Alias for getOrderById for backwards compatibility
   */
  async getOrderByOrderId(orderId) {
    return this.getOrderById(orderId);
  },

  /**
   * Authenticated Customer: Retrieve own orders.
   * Scoped strictly by customerId from verified token.
   * Does NOT accept mobile number query or arbitrary customerId from client.
   */
  async getCustomerOrders(customerId, options = {}) {
    if (!customerId) {
      const err = new Error('Customer authentication required');
      err.statusCode = 401;
      throw err;
    }

    const cleanCustomerId = mongoose.isValidObjectId(customerId)
      ? new mongoose.Types.ObjectId(customerId)
      : customerId;

    const { page = 1, limit = 20 } = options;
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (safePage - 1) * safeLimit;

    if (mongoose.connection.readyState !== 1) {
      return { items: [], total: 0, page: safePage, limit: safeLimit, totalPages: 1 };
    }

    const query = { customerId: cleanCustomerId };

    const [total, items] = await Promise.all([
      Order.countDocuments(query),
      Order.find(query)
        .select('-__v')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
    ]);

    return {
      items,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit) || 1,
    };
  },

  /**
   * Authenticated Customer: Retrieve single order with strict ownership verification.
   * If order does not exist OR order.customerId does not match authenticated customerId,
   * returns null (mapped to safe 404 by controller without leaking order existence).
   */
  async getCustomerOrderById(orderId, customerId) {
    if (!orderId || typeof orderId !== 'string' || !customerId) return null;
    if (mongoose.connection.readyState !== 1) return null;

    const clean = orderId.trim();
    let order = await Order.findOne({ orderId: clean.toUpperCase() })
      .select('-__v')
      .lean();

    if (!order && mongoose.isValidObjectId(clean)) {
      order = await Order.findById(clean).select('-__v').lean();
    }

    if (!order) return null;

    // Strict ownership verification:
    // Guest orders (no customerId) or orders belonging to another customer cannot be accessed
    if (!order.customerId || order.customerId.toString() !== customerId.toString()) {
      return null;
    }

    return order;
  },

  /**
   * Get customer order history by mobile number
   */
  async getOrdersByMobile(mobile, options = {}) {
    const cleanMobile = normalizeIndianMobile(mobile);
    if (!cleanMobile) {
      const err = new Error('Valid 10-digit Indian mobile number is required');
      err.statusCode = 400;
      throw err;
    }

    const { page = 1, limit = 20 } = options;
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (safePage - 1) * safeLimit;

    if (mongoose.connection.readyState !== 1) {
      return { items: [], total: 0, page: safePage, limit: safeLimit, totalPages: 1 };
    }

    const query = { 'customer.mobile': cleanMobile };

    const [total, items] = await Promise.all([
      Order.countDocuments(query),
      Order.find(query)
        .select('-__v')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
    ]);

    return {
      items,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit) || 1,
    };
  },

  /**
   * Get admin orders with filtering, search, safe sorting, and pagination
   */
  async getAdminOrders(options = {}) {
    const {
      status,
      pickupDate,
      date,
      search,
      sort = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 20,
    } = options;

    const query = {};

    // 1. Status Filter
    if (status && typeof status === 'string' && status.trim()) {
      const cleanStatus = status.trim().toUpperCase();
      if (['PLACED', 'PREPARING', 'READY', 'PICKED_UP'].includes(cleanStatus)) {
        query.status = cleanStatus;
      }
    }

    // 2. Pickup Date Filter (supports both date and pickupDate)
    const filterDate = pickupDate || date;
    if (filterDate && typeof filterDate === 'string' && filterDate.trim()) {
      query['pickup.date'] = filterDate.trim();
    }

    // 3. Search across orderId, customer name, mobile
    if (search && typeof search === 'string' && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');
      query.$or = [
        { orderId: searchRegex },
        { 'customer.name': searchRegex },
        { 'customer.mobile': searchRegex },
      ];
    }

    // 4. Safe Sorting Whitelist
    const sortField = ALLOWED_SORT_FIELDS.includes(sort) ? sort : 'createdAt';
    const sortDirection = String(order).toLowerCase() === 'asc' ? 1 : -1;
    const sortOption = { [sortField]: sortDirection };

    // 5. Pagination Bounds
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (safePage - 1) * safeLimit;

    if (mongoose.connection.readyState !== 1) {
      return { items: [], total: 0, page: safePage, limit: safeLimit, totalPages: 1 };
    }

    const [total, items] = await Promise.all([
      Order.countDocuments(query),
      Order.find(query)
        .select('-__v')
        .sort(sortOption)
        .skip(skip)
        .limit(safeLimit)
        .lean(),
    ]);

    return {
      items,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit) || 1,
    };
  },

  /**
   * Get single order details for Admin by orderId
   */
  async getAdminOrderByOrderId(orderId) {
    return this.getOrderById(orderId);
  },

  /**
   * Update order status with strict sequential transition validation
   * Workflow: PLACED -> PREPARING -> READY -> PICKED_UP
   */
  async updateOrderStatus(orderId, newStatus) {
    if (!orderId || typeof orderId !== 'string') return null;
    if (!newStatus || typeof newStatus !== 'string') {
      const err = new Error('Status is required');
      err.statusCode = 400;
      throw err;
    }

    const cleanStatus = newStatus.trim().toUpperCase();
    const validStatuses = ['PLACED', 'PREPARING', 'READY', 'PICKED_UP'];

    if (!validStatuses.includes(cleanStatus)) {
      const err = new Error(`Invalid status: "${newStatus}". Allowed statuses: ${validStatuses.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }

    if (mongoose.connection.readyState !== 1) return null;

    const order = await Order.findOne({ orderId: orderId.trim().toUpperCase() });
    if (!order) {
      return null;
    }

    const currentStatus = order.status;

    // Idempotent: same status returns order as is
    if (currentStatus === cleanStatus) {
      return order;
    }

    // Enforce sequential progression
    const allowedNext = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
    if (!allowedNext.includes(cleanStatus)) {
      const err = new Error(
        `Invalid status transition from "${currentStatus}" to "${cleanStatus}". Allowed next step: ${
          allowedNext.length > 0 ? allowedNext.join(', ') : 'None (Terminal status)'
        }`
      );
      err.statusCode = 400;
      throw err;
    }

    order.status = cleanStatus;
    const savedOrder = await order.save();

    // Trigger notifications on status transitions:
    // PLACED -> PREPARING => ORDER_PREPARING
    // PREPARING -> READY => ORDER_READY
    // Strict Failure Isolation: Notification failures must NEVER break or rollback order status
    if (currentStatus === 'PLACED' && cleanStatus === 'PREPARING') {
      try {
        await notificationService.sendOrderNotification(savedOrder, 'ORDER_PREPARING');
      } catch (notifErr) {
        console.warn(`[OrderService] Non-blocking ORDER_PREPARING notification error for order ${order.orderId}:`, notifErr.message);
      }
    } else if (currentStatus === 'PREPARING' && cleanStatus === 'READY') {
      try {
        await notificationService.sendOrderNotification(savedOrder, 'ORDER_READY');
      } catch (notifErr) {
        console.warn(`[OrderService] Non-blocking ORDER_READY notification error for order ${order.orderId}:`, notifErr.message);
      }
    }

    return savedOrder;
  },

  /**
   * Update order readyTime (Admin)
   * Updates readyTime only; does NOT mutate status
   */
  async updateReadyTime(orderId, readyTime) {
    if (!orderId || typeof orderId !== 'string') return null;

    if (readyTime !== null && readyTime !== undefined) {
      if (typeof readyTime !== 'string' || !validatePickupTime(readyTime)) {
        const err = new Error('Invalid readyTime format. Use HH:MM (e.g. 20:15) or null');
        err.statusCode = 400;
        throw err;
      }
    }

    if (mongoose.connection.readyState !== 1) return null;

    const order = await Order.findOne({ orderId: orderId.trim().toUpperCase() });
    if (!order) {
      return null;
    }

    order.readyTime = readyTime ? readyTime.trim() : null;
    return await order.save();
  },

  /**
   * Delete single order permanently by orderId (Admin Only)
   * Deletes only the selected Order document from database.
   */
  async deleteOrder(orderId) {
    if (!orderId || typeof orderId !== 'string') return null;
    if (mongoose.connection.readyState !== 1) return null;

    const clean = orderId.trim();
    let deleted = await Order.findOneAndDelete({ orderId: clean.toUpperCase() });

    if (!deleted && mongoose.isValidObjectId(clean)) {
      deleted = await Order.findByIdAndDelete(clean);
    }
    return deleted;
  },

  /**
   * Delete orders matching a specific Year and Month based strictly on order createdAt timestamp (Admin Only)
   *
   * @param {number|string} year Full 4-digit year (e.g. 2026)
   * @param {number|string} month Month number 1-12 or month name (e.g. 9 or 'September')
   * @returns {Promise<{ success: boolean, deletedCount: number, message: string }>}
   */
  async deleteOrdersByMonth(year, month) {
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
        message: `No orders found for ${monthName} ${parsedYear}.`,
      };
    }

    // Timezone-safe start and end of month based STRICTLY on authoritative createdAt
    const startOfMonth = new Date(Date.UTC(parsedYear, monthNum - 1, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(parsedYear, monthNum, 1, 0, 0, 0, 0));

    const dateFilter = {
      createdAt: {
        $gte: startOfMonth,
        $lt: endOfMonth,
      },
    };

    const count = await Order.countDocuments(dateFilter);
    if (count === 0) {
      return {
        success: true,
        deletedCount: 0,
        message: `No orders found for ${monthName} ${parsedYear}.`,
      };
    }

    const deleteResult = await Order.deleteMany(dateFilter);

    return {
      success: true,
      deletedCount: deleteResult.deletedCount,
      message: `Successfully deleted ${deleteResult.deletedCount} order(s) created during ${monthName} ${parsedYear}.`,
    };
  },
};

export default orderService;
