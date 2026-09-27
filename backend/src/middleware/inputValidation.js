import mongoose from 'mongoose';

/**
 * Input Validation Middleware & Sanitization Helpers
 * Centralizes strict bounds checking, regex validation, enum enforcement, and parameter safety.
 */

const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;
const EMAIL_REGEX = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/;
const ORDER_ID_REGEX = /^RF-\d{8}-\d{6}$/i;
const TIME_REGEX = /^([01]?\d|2[0-3]):([0-5]\d)(\s*(AM|PM))?$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates that an ID parameter is either a valid MongoDB ObjectId or clean alphanumeric identifier.
 * Prevents CastError crashes and NoSQL injection attempts.
 */
export function validateObjectIdParam(paramName = 'id') {
  return (req, res, next) => {
    const val = req.params[paramName];
    if (!val || typeof val !== 'string') {
      return res.status(400).json({
        success: false,
        message: `Missing or invalid parameter: ${paramName}`,
      });
    }

    const trimmed = val.trim();
    if (!mongoose.isValidObjectId(trimmed)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ID format for parameter '${paramName}'`,
      });
    }

    req.params[paramName] = trimmed;
    next();
  };
}

/**
 * Validates Order ID route parameter
 */
export function validateOrderIdParam(paramName = 'orderId') {
  return (req, res, next) => {
    const val = req.params[paramName];
    if (!val || typeof val !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required',
      });
    }

    const trimmed = val.trim();
    // Allow RF-YYYYMMDD-XXXXXX format or valid ObjectId or clean alphanumeric format (up to 40 chars)
    if (!ORDER_ID_REGEX.test(trimmed) && !mongoose.isValidObjectId(trimmed) && !/^[a-zA-Z0-9_-]{3,40}$/.test(trimmed)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Order ID format',
      });
    }

    req.params[paramName] = trimmed;
    next();
  };
}

/**
 * Validates customer order placement payload
 */
export function validateOrderPlacement(req, res, next) {
  const { customer, pickup, items, orderType } = req.body || {};

  // 1. Order Type
  if (orderType && String(orderType).trim().toUpperCase() !== 'PICKUP') {
    return res.status(400).json({
      success: false,
      message: 'Order type must be strictly "PICKUP". Delivery is not supported.',
    });
  }

  // 2. Customer
  if (!customer || typeof customer !== 'object' || Array.isArray(customer)) {
    return res.status(400).json({
      success: false,
      message: 'Customer information is required and must be an object',
    });
  }

  const { name, mobile, email } = customer;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Customer name is required and cannot be empty',
    });
  }

  if (name.trim().length < 2 || name.trim().length > 100) {
    return res.status(400).json({
      success: false,
      message: 'Customer name must be between 2 and 100 characters',
    });
  }

  if (!mobile || (typeof mobile !== 'string' && typeof mobile !== 'number')) {
    return res.status(400).json({
      success: false,
      message: 'Customer mobile number is required',
    });
  }

  const cleanDigits = String(mobile).replace(/\D/g, '');
  const tenDigitMobile = cleanDigits.length === 12 && cleanDigits.startsWith('91')
    ? cleanDigits.slice(2)
    : cleanDigits.length === 11 && cleanDigits.startsWith('0')
    ? cleanDigits.slice(1)
    : cleanDigits;

  if (!INDIAN_MOBILE_REGEX.test(tenDigitMobile)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid 10-digit Indian mobile number',
    });
  }

  if (email && typeof email === 'string' && email.trim()) {
    if (!EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }
  }

  // 3. Pickup Schedule
  if (!pickup || typeof pickup !== 'object' || Array.isArray(pickup)) {
    return res.status(400).json({
      success: false,
      message: 'Pickup details are required and must be an object',
    });
  }

  const { date, time } = pickup;
  if (!date || typeof date !== 'string' || !DATE_REGEX.test(date.trim())) {
    return res.status(400).json({
      success: false,
      message: 'Valid pickup date is required in YYYY-MM-DD format',
    });
  }

  if (!time || typeof time !== 'string' || !TIME_REGEX.test(time.trim())) {
    return res.status(400).json({
      success: false,
      message: 'Valid pickup time is required (e.g. 19:30 or 7:30 PM)',
    });
  }

  // 4. Items List
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Order must contain at least one item',
    });
  }

  if (items.length > 50) {
    return res.status(400).json({
      success: false,
      message: 'Order cannot exceed 50 distinct items',
    });
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item || typeof item !== 'object') {
      return res.status(400).json({
        success: false,
        message: `Item at index ${i} must be an object`,
      });
    }

    if (!item.itemId || typeof item.itemId !== 'string' || !item.itemId.trim()) {
      return res.status(400).json({
        success: false,
        message: `Item at index ${i} must have a valid itemId`,
      });
    }

    const qty = Number(item.quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 100) {
      return res.status(400).json({
        success: false,
        message: `Quantity for item at index ${i} must be an integer between 1 and 100`,
      });
    }
  }

  next();
}

/**
 * Validates image path to prevent directory traversal attacks
 */
export function isSafeImagePath(imagePath) {
  if (!imagePath || typeof imagePath !== 'string') return true; // Optional image
  const trimmed = imagePath.trim();

  // Deny directory traversal patterns
  if (trimmed.includes('..') || trimmed.includes('\\') || trimmed.includes('\0')) {
    return false;
  }

  // Deny dangerous URI schemes (XSS and local file inclusion)
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('file:') ||
    lower.startsWith('vbscript:')
  ) {
    return false;
  }

  // Allow standard relative paths starting with /images/ or valid http(s) URLs
  if (trimmed.startsWith('/images/')) return true;
  if (/^https?:\/\//i.test(trimmed)) return true;

  return false;
}
