import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Table from '../models/Table.js';
import { tableService } from './table.service.js';
import MenuItem, { generateSlug } from '../models/MenuItem.js';
import notificationService from './notificationService.js';
import { MENU_ITEMS, MENU_CATEGORIES } from '../data/menuData.js';

// Allowed sequential status transitions per order type
export const PICKUP_STATUS_TRANSITIONS = {
  PLACED: ['PREPARING'],
  PREPARING: ['READY'],
  READY: ['PICKED_UP'],
  PICKED_UP: [], // Terminal status: zero transitions allowed
};

export const DINE_IN_STATUS_TRANSITIONS = {
  PLACED: ['PREPARING'],
  PREPARING: ['READY'],
  READY: ['SERVED'],
  SERVED: [], // Terminal status: zero transitions allowed
};

// Unified fallback transitions
export const ALLOWED_STATUS_TRANSITIONS = {
  PLACED: ['PREPARING'],
  PREPARING: ['READY'],
  READY: ['PICKED_UP', 'SERVED'],
  PICKED_UP: [],
  SERVED: [],
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

    // 1. Order Type Validation
    const normalizedType = orderType ? String(orderType).trim().toUpperCase() : 'PICKUP';
    if (normalizedType !== 'PICKUP' && normalizedType !== 'DINE_IN') {
      const err = new Error('Order type must be strictly "PICKUP" or "DINE_IN". Delivery is not supported.');
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

    // 3. Order-Type-Specific Validations
    let validatedTable = null;

    if (normalizedType === 'PICKUP') {
      // Pickup Details Validation
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
    } else if (normalizedType === 'DINE_IN') {
      // Dine-in Table Validation
      const candidateIdentifier = payload.tableId || payload.tableNumber;
      if (!candidateIdentifier || (typeof candidateIdentifier !== 'string' && typeof candidateIdentifier !== 'object')) {
        const err = new Error('Table information (tableId or tableNumber) is required for Dine-in orders');
        err.statusCode = 400;
        throw err;
      }

      const tableLookupKey = typeof candidateIdentifier === 'string' ? candidateIdentifier.trim() : String(candidateIdentifier);
      validatedTable = await tableService.getTableById(tableLookupKey);

      if (!validatedTable) {
        const err = new Error('The specified table was not found or is invalid');
        err.statusCode = 404;
        throw err;
      }

      if (validatedTable.status !== 'Active') {
        const err = new Error(`Table "${validatedTable.tableNumber}" is currently Inactive and cannot accept dine-in orders`);
        err.statusCode = 400;
        throw err;
      }
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
      pickup: normalizedType === 'PICKUP' && pickup ? {
        date: pickup.date.trim(),
        time: pickup.time.trim(),
      } : null,
      tableId: validatedTable ? (validatedTable._id || validatedTable.id) : (payload.tableId || null),
      tableNumber: validatedTable ? validatedTable.tableNumber : (payload.tableNumber || null),
      instructions: payload.instructions ? String(payload.instructions).trim() : '',
      items: itemSnapshots,
      subtotal: calculatedSubtotal,
      orderType: normalizedType,
      status: 'PLACED',
      readyTime: null,
    });

    const savedOrder = await newOrder.save();

    // Update Table occupancy if Dine-in
    if (normalizedType === 'DINE_IN' && validatedTable && mongoose.connection.readyState === 1) {
      try {
        await Table.findByIdAndUpdate(validatedTable._id || validatedTable.id, {
          isOccupied: true,
          activeOrderId: savedOrder._id,
        });
      } catch (tblErr) {
        console.warn(`[OrderService] Non-blocking table occupancy update note:`, tblErr.message);
      }
    }

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
      if (['PLACED', 'PREPARING', 'READY', 'PICKED_UP', 'SERVED'].includes(cleanStatus)) {
        query.status = cleanStatus;
      }
    }

    // 1b. Order Type Filter (DINE_IN or PICKUP)
    if (options.orderType && typeof options.orderType === 'string' && options.orderType.trim()) {
      const cleanType = options.orderType.trim().toUpperCase();
      if (['DINE_IN', 'PICKUP'].includes(cleanType)) {
        query.orderType = cleanType;
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

    if (mongoose.connection.readyState !== 1) return null;

    const order = await Order.findOne({ orderId: orderId.trim().toUpperCase() });
    if (!order) {
      return null;
    }

    const currentStatus = order.status;
    const isDineIn = (order.orderType || '').toUpperCase() === 'DINE_IN';
    const validStatuses = isDineIn
      ? ['PLACED', 'PREPARING', 'READY', 'SERVED']
      : ['PLACED', 'PREPARING', 'READY', 'PICKED_UP'];

    if (!validStatuses.includes(cleanStatus)) {
      const err = new Error(`Invalid status: "${newStatus}". Allowed statuses: ${validStatuses.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }

    // Idempotent: same status returns order as is
    if (currentStatus === cleanStatus) {
      return order;
    }

    // Enforce sequential progression based on order type
    const allowedNext = isDineIn
      ? (DINE_IN_STATUS_TRANSITIONS[currentStatus] || [])
      : (PICKUP_STATUS_TRANSITIONS[currentStatus] || []);

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

    // If Dine-in order is SERVED, free table occupancy
    if (isDineIn && cleanStatus === 'SERVED' && order.tableId && mongoose.connection.readyState === 1) {
      try {
        await Table.findByIdAndUpdate(order.tableId, {
          isOccupied: false,
          activeOrderId: null,
        });
      } catch (tblErr) {
        console.warn(`[OrderService] Non-blocking table de-occupancy note:`, tblErr.message);
      }
    }

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

  /**
   * Record manual Cash or UPI payment for an order (Admin Only)
   *
   * Rules:
   * 1. Order must exist in database.
   * 2. Idempotent / Duplicate prevention: If already paid, reject to prevent duplicate recording.
   * 3. Payment method must be strictly 'CASH' or 'UPI'.
   * 4. Amount must be a non-negative number; defaults to order.subtotal.
   * 5. Persist record with timestamp, method, amount, status 'COMPLETED', and recording admin.
   */
  async recordOrderPayment(orderId, paymentData = {}, adminUser = null) {
    if (!orderId || typeof orderId !== 'string') {
      const err = new Error('Order ID is required');
      err.statusCode = 400;
      throw err;
    }

    if (mongoose.connection.readyState !== 1) {
      const err = new Error('Database connection is not available');
      err.statusCode = 503;
      throw err;
    }

    const cleanId = orderId.trim().toUpperCase();
    const order = await Order.findOne({ orderId: cleanId });
    if (!order) {
      const err = new Error(`Order "${cleanId}" not found`);
      err.statusCode = 404;
      throw err;
    }

    // Duplicate payment prevention
    if (order.payment && order.payment.status === 'COMPLETED') {
      const recordedTime = order.payment.recordedAt
        ? new Date(order.payment.recordedAt).toLocaleString('en-IN')
        : 'previously';
      const err = new Error(
        `Payment for order "${cleanId}" has already been confirmed and recorded via ${order.payment.method} on ${recordedTime}. Duplicate payment recording is blocked.`
      );
      err.statusCode = 409;
      throw err;
    }

    const rawMethod = paymentData.method ? String(paymentData.method).trim().toUpperCase() : '';
    if (rawMethod !== 'CASH' && rawMethod !== 'UPI') {
      const err = new Error('Payment method must be strictly "CASH" or "UPI"');
      err.statusCode = 400;
      throw err;
    }

    let paymentAmount = order.subtotal;
    if (paymentData.amount !== undefined && paymentData.amount !== null) {
      const parsedAmount = Number(paymentData.amount);
      if (isNaN(parsedAmount) || parsedAmount < 0) {
        const err = new Error('Payment amount must be a non-negative number');
        err.statusCode = 400;
        throw err;
      }
      paymentAmount = parsedAmount;
    }

    order.payment = {
      method: rawMethod,
      amount: paymentAmount,
      status: 'COMPLETED',
      recordedAt: new Date(),
      recordedBy: adminUser?.name || adminUser?.email || 'Admin',
      transactionNote: paymentData.note ? String(paymentData.note).trim() : null,
    };

    const savedOrder = await order.save();
    return savedOrder;
  },

  /**
   * Get verified payment revenue analytics with date filtering (Admin Only)
   * Calculates Total, Cash, and UPI revenue for Dine-in and Parcel Pickup.
   * Cash Revenue + UPI Revenue = Total Paid Revenue (Guaranteed reconciliation).
   */
  async getPaymentAnalytics(options = {}) {
    if (mongoose.connection.readyState !== 1) {
      return {
        totalCashRevenue: 0,
        totalUpiRevenue: 0,
        totalPaidRevenue: 0,
        dineInCashRevenue: 0,
        dineInUpiRevenue: 0,
        dineInPaidRevenue: 0,
        pickupCashRevenue: 0,
        pickupUpiRevenue: 0,
        pickupPaidRevenue: 0,
        transactions: [],
      };
    }

    const { dateFilter, startDate, endDate } = options;
    const query = { 'payment.status': 'COMPLETED' };

    if (dateFilter === 'TODAY') {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      query['payment.recordedAt'] = { $gte: startOfToday };
    } else if (dateFilter === 'WEEK') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      query['payment.recordedAt'] = { $gte: weekAgo };
    } else if (dateFilter === 'MONTH') {
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      query['payment.recordedAt'] = { $gte: monthAgo };
    } else if (startDate && endDate) {
      query['payment.recordedAt'] = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const paidOrders = await Order.find(query)
      .select('orderId orderType subtotal payment customer tableNumber createdAt')
      .sort({ 'payment.recordedAt': -1 })
      .lean();

    let totalCashRevenue = 0;
    let totalUpiRevenue = 0;
    let dineInCashRevenue = 0;
    let dineInUpiRevenue = 0;
    let pickupCashRevenue = 0;
    let pickupUpiRevenue = 0;

    const transactions = paidOrders.map((o) => {
      const amt = Number(o.payment?.amount || o.subtotal || 0);
      const isDineIn = (o.orderType || '').toUpperCase() === 'DINE_IN';
      const isCash = o.payment?.method === 'CASH';

      if (isCash) {
        totalCashRevenue += amt;
        if (isDineIn) dineInCashRevenue += amt;
        else pickupCashRevenue += amt;
      } else {
        totalUpiRevenue += amt;
        if (isDineIn) dineInUpiRevenue += amt;
        else pickupUpiRevenue += amt;
      }

      return {
        orderId: o.orderId,
        orderType: isDineIn ? 'DINE_IN' : 'PICKUP',
        tableNumber: o.tableNumber || null,
        customerName: o.customer?.name || (isDineIn ? 'Dine-In Guest' : 'Takeaway Customer'),
        method: o.payment?.method,
        amount: amt,
        status: o.payment?.status || 'COMPLETED',
        timestamp: o.payment?.recordedAt || o.createdAt,
        recordedBy: o.payment?.recordedBy || 'Admin',
      };
    });

    const dineInPaidRevenue = dineInCashRevenue + dineInUpiRevenue;
    const pickupPaidRevenue = pickupCashRevenue + pickupUpiRevenue;
    const totalPaidRevenue = totalCashRevenue + totalUpiRevenue;

    return {
      totalCashRevenue,
      totalUpiRevenue,
      totalPaidRevenue,
      dineInCashRevenue,
      dineInUpiRevenue,
      dineInPaidRevenue,
      pickupCashRevenue,
      pickupUpiRevenue,
      pickupPaidRevenue,
      transactions,
    };
  },

  /**
   * Cash & UPI Transactions Report Service (Admin Only)
   * Calculates trusted summary metrics and returns matching transactions.
   */
  async getTransactionReport(options = {}) {
    if (mongoose.connection.readyState !== 1) {
      return {
        summary: {
          totalCashCollected: 0,
          totalUpiCollected: 0,
          totalConfirmed: 0,
          dineInCollection: 0,
          pickupCollection: 0,
          pendingAmount: 0,
          failedAmount: 0,
          totalTransactions: 0,
          paidCount: 0,
          pendingCount: 0,
          cashCount: 0,
          upiCount: 0,
        },
        transactions: [],
      };
    }

    const {
      month,
      year,
      startDate,
      endDate,
      quickFilter,
      method,
      orderType,
      paymentStatus,
      search,
    } = options;

    const query = {};

    // 1. Order Type Filter
    if (orderType && orderType !== 'ALL') {
      const cleanType = String(orderType).trim().toUpperCase();
      if (cleanType === 'DINE_IN' || cleanType === 'PICKUP') {
        query.orderType = cleanType;
      }
    }

    // 2. Payment Method Filter
    if (method && method !== 'ALL') {
      const cleanMethod = String(method).trim().toUpperCase();
      if (cleanMethod === 'CASH' || cleanMethod === 'UPI') {
        query['payment.method'] = cleanMethod;
      }
    }

    // 3. Payment Status Filter
    if (paymentStatus && paymentStatus !== 'ALL') {
      const cleanStatus = String(paymentStatus).trim().toUpperCase();
      if (cleanStatus === 'PAID' || cleanStatus === 'COMPLETED') {
        query['payment.status'] = 'COMPLETED';
      } else if (cleanStatus === 'PENDING') {
        const pendingCondition = { $or: [{ payment: null }, { 'payment.status': 'PENDING' }] };
        query.$and = (query.$and || []).concat([pendingCondition]);
      } else if (cleanStatus === 'FAILED' || cleanStatus === 'REFUNDED') {
        query['payment.status'] = 'FAILED';
      }
    }

    // 4. Date Filter Construction
    let startBoundary = null;
    let endBoundary = null;

    if (quickFilter === 'TODAY') {
      const now = new Date();
      startBoundary = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      endBoundary = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (quickFilter === 'THIS_MONTH') {
      const now = new Date();
      startBoundary = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endBoundary = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (quickFilter === 'LAST_MONTH') {
      const now = new Date();
      startBoundary = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      endBoundary = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (month && year) {
      const mNum = parseInt(month, 10);
      const yNum = parseInt(year, 10);
      if (!isNaN(mNum) && !isNaN(yNum) && mNum >= 1 && mNum <= 12) {
        startBoundary = new Date(yNum, mNum - 1, 1, 0, 0, 0, 0);
        endBoundary = new Date(yNum, mNum, 0, 23, 59, 59, 999);
      }
    } else if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
        s.setHours(0, 0, 0, 0);
        e.setHours(23, 59, 59, 999);
        startBoundary = s;
        endBoundary = e;
      }
    } else if (startDate) {
      const s = new Date(startDate);
      if (!isNaN(s.getTime())) {
        s.setHours(0, 0, 0, 0);
        startBoundary = s;
      }
    } else if (endDate) {
      const e = new Date(endDate);
      if (!isNaN(e.getTime())) {
        e.setHours(23, 59, 59, 999);
        endBoundary = e;
      }
    }

    if (startBoundary && endBoundary) {
      query.$and = (query.$and || []).concat([
        {
          $or: [
            { 'payment.recordedAt': { $gte: startBoundary, $lte: endBoundary } },
            {
              $and: [
                { 'payment.recordedAt': { $exists: false } },
                { createdAt: { $gte: startBoundary, $lte: endBoundary } },
              ],
            },
            {
              $and: [
                { payment: null },
                { createdAt: { $gte: startBoundary, $lte: endBoundary } },
              ],
            },
          ],
        },
      ]);
    } else if (startBoundary) {
      query.$and = (query.$and || []).concat([
        {
          $or: [
            { 'payment.recordedAt': { $gte: startBoundary } },
            {
              $and: [
                { 'payment.recordedAt': { $exists: false } },
                { createdAt: { $gte: startBoundary } },
              ],
            },
            {
              $and: [
                { payment: null },
                { createdAt: { $gte: startBoundary } },
              ],
            },
          ],
        },
      ]);
    } else if (endBoundary) {
      query.$and = (query.$and || []).concat([
        {
          $or: [
            { 'payment.recordedAt': { $lte: endBoundary } },
            {
              $and: [
                { 'payment.recordedAt': { $exists: false } },
                { createdAt: { $lte: endBoundary } },
              ],
            },
            {
              $and: [
                { payment: null },
                { createdAt: { $lte: endBoundary } },
              ],
            },
          ],
        },
      ]);
    }

    // 5. Search
    if (search && typeof search === 'string' && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');
      const searchCondition = {
        $or: [
          { orderId: searchRegex },
          { 'customer.name': searchRegex },
          { 'customer.mobile': searchRegex },
          { 'payment.transactionNote': searchRegex },
        ],
      };
      query.$and = (query.$and || []).concat([searchCondition]);
    }

    const orders = await Order.find(query)
      .select('orderId orderType subtotal payment customer tableNumber instructions createdAt status')
      .sort({ createdAt: -1 })
      .lean();

    let totalCashCollected = 0;
    let totalUpiCollected = 0;
    let dineInCollection = 0;
    let pickupCollection = 0;
    let pendingAmount = 0;
    let failedAmount = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let cashCount = 0;
    let upiCount = 0;

    const transactions = orders.map((o) => {
      const isDineIn = (o.orderType || '').toUpperCase() === 'DINE_IN';
      const isPaid = o.payment && o.payment.status === 'COMPLETED';
      const isFailed = o.payment && o.payment.status === 'FAILED';
      const isPending = !isPaid && !isFailed;

      const amt = Number(isPaid ? (o.payment?.amount || o.subtotal || 0) : (o.subtotal || 0));

      if (isPaid) {
        paidCount++;
        const isCash = o.payment?.method === 'CASH';
        if (isCash) {
          totalCashCollected += amt;
          cashCount++;
        } else {
          totalUpiCollected += amt;
          upiCount++;
        }

        if (isDineIn) {
          dineInCollection += amt;
        } else {
          pickupCollection += amt;
        }
      } else if (isPending) {
        pendingAmount += amt;
        pendingCount++;
      } else if (isFailed) {
        failedAmount += amt;
      }

      return {
        orderId: o.orderId,
        orderType: isDineIn ? 'DINE_IN' : 'PICKUP',
        tableNumber: o.tableNumber || null,
        orderStatus: o.status || 'PLACED',
        customerName: o.customer?.name || (isDineIn ? 'Dine-In Guest' : 'Takeaway Customer'),
        customerMobile: o.customer?.mobile || '',
        customerEmail: o.customer?.email || '',
        method: isPaid ? o.payment.method : (o.payment?.method || 'PENDING'),
        status: isPaid ? 'PAID' : (isFailed ? 'FAILED' : 'PENDING'),
        amount: amt,
        timestamp: isPaid && o.payment.recordedAt ? o.payment.recordedAt : o.createdAt,
        recordedBy: o.payment?.recordedBy || '—',
        transactionNote: o.payment?.transactionNote || null,
        instructions: o.instructions || '',
        createdAt: o.createdAt,
      };
    });

    const totalConfirmed = totalCashCollected + totalUpiCollected;

    return {
      summary: {
        totalCashCollected,
        totalUpiCollected,
        totalConfirmed,
        dineInCollection,
        pickupCollection,
        pendingAmount,
        failedAmount,
        totalTransactions: transactions.length,
        paidCount,
        pendingCount,
        cashCount,
        upiCount,
      },
      transactions,
    };
  },

  /**
   * Helper to construct query for transactions deletion / preview
   */
  _buildTransactionDeleteQuery(options = {}) {
    const { year, month, day, method } = options;

    const parsedYear = parseInt(year, 10);
    if (isNaN(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
      const err = new Error('Valid 4-digit year is required');
      err.statusCode = 400;
      throw err;
    }

    const parsedMonth = parseInt(month, 10);
    if (isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
      const err = new Error('Valid month (1-12) is required');
      err.statusCode = 400;
      throw err;
    }

    let startBoundary;
    let endBoundary;

    if (day && day !== 'ALL') {
      const parsedDay = parseInt(day, 10);
      if (isNaN(parsedDay) || parsedDay < 1 || parsedDay > 31) {
        const err = new Error('Valid day (1-31) is required');
        err.statusCode = 400;
        throw err;
      }
      startBoundary = new Date(parsedYear, parsedMonth - 1, parsedDay, 0, 0, 0, 0);
      endBoundary = new Date(parsedYear, parsedMonth - 1, parsedDay, 23, 59, 59, 999);
    } else {
      startBoundary = new Date(parsedYear, parsedMonth - 1, 1, 0, 0, 0, 0);
      endBoundary = new Date(parsedYear, parsedMonth, 0, 23, 59, 59, 999);
    }

    const query = {
      'payment.status': 'COMPLETED',
    };

    if (method && method !== 'ALL') {
      const cleanMethod = String(method).trim().toUpperCase();
      if (cleanMethod === 'CASH' || cleanMethod === 'UPI') {
        query['payment.method'] = cleanMethod;
      }
    } else {
      query['payment.method'] = { $in: ['CASH', 'UPI'] };
    }

    query.$and = [
      {
        $or: [
          { 'payment.recordedAt': { $gte: startBoundary, $lte: endBoundary } },
          {
            $and: [
              { 'payment.recordedAt': { $exists: false } },
              { createdAt: { $gte: startBoundary, $lte: endBoundary } },
            ],
          },
        ],
      },
    ];

    return { query, startBoundary, endBoundary, parsedYear, parsedMonth };
  },

  /**
   * Preview matching transactions count and amount before deletion (Admin Only)
   */
  async getTransactionsDeletePreview(options = {}) {
    if (mongoose.connection.readyState !== 1) {
      return { success: true, count: 0, totalAmount: 0 };
    }

    const { query } = this._buildTransactionDeleteQuery(options);
    const matchingOrders = await Order.find(query).select('orderId payment subtotal').lean();
    const count = matchingOrders.length;
    const totalAmount = matchingOrders.reduce(
      (sum, o) => sum + Number(o.payment?.amount || o.subtotal || 0),
      0
    );

    return {
      success: true,
      count,
      totalAmount,
    };
  },

  /**
   * Delete transactions matching year, month, optional day, and payment method (Admin Only)
   * Safely unsets the payment record without deleting customer orders or menu/table records.
   */
  async deleteTransactions(options = {}) {
    if (mongoose.connection.readyState !== 1) {
      return {
        success: true,
        deletedCount: 0,
        deletedAmount: 0,
        message: 'Database connection offline; zero transactions deleted.',
      };
    }

    const { query } = this._buildTransactionDeleteQuery(options);
    const matchingOrders = await Order.find(query).select('orderId payment subtotal').lean();
    const deletedCount = matchingOrders.length;
    const deletedAmount = matchingOrders.reduce(
      (sum, o) => sum + Number(o.payment?.amount || o.subtotal || 0),
      0
    );

    if (deletedCount > 0) {
      await Order.updateMany(query, { $unset: { payment: 1 } });
    }

    const methodLabel = options.method === 'CASH' ? 'Cash' : options.method === 'UPI' ? 'UPI' : 'Cash & UPI';

    return {
      success: true,
      deletedCount,
      deletedAmount,
      message: `Successfully deleted ${deletedCount} ${methodLabel} transaction(s) totaling ₹${deletedAmount}.`,
    };
  },
};

export default orderService;
