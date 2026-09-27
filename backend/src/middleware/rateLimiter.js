/**
 * In-Memory Sliding Window Rate Limiter
 *
 * Provides granular rate limiting for:
 * - Admin and Customer authentication (prevents brute-force / credential stuffing)
 * - Order creation (prevents spam and automated order flooding)
 * - Notification retries (prevents provider API abuse)
 * - General API fallback protection
 * Zero external dependency overhead.
 */

const rateLimitStores = [];

/**
 * Creates an in-memory rate limiter middleware
 */
export function createRateLimiter({
  windowMs = 15 * 60 * 1000,
  maxAttempts = 10,
  message = 'Too many requests. Please try again later.',
  keyPrefix = 'general',
  skipInTests = false,
}) {
  const attemptsByIp = new Map();
  rateLimitStores.push(attemptsByIp);

  // Periodic cleanup
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of attemptsByIp.entries()) {
      if (now - data.firstAttempt > windowMs) {
        attemptsByIp.delete(ip);
      }
    }
  }, Math.max(60000, Math.floor(windowMs / 3)));

  if (interval.unref) {
    interval.unref();
  }

  return function rateLimiterMiddleware(req, res, next) {
    // Bypass in test environment if configured and request is not a rate-limit test
    if (skipInTests && (process.env.NODE_ENV === 'test' || req.headers['x-test-bypass-rate-limit'])) {
      return next();
    }

    const ip =
      req.headers['x-forwarded-for']?.split(',')[0].trim() ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown-ip';

    const now = Date.now();
    let record = attemptsByIp.get(ip);

    if (!record || now - record.firstAttempt > windowMs) {
      record = { count: 1, firstAttempt: now };
      attemptsByIp.set(ip, record);
      return next();
    }

    record.count += 1;

    if (record.count > maxAttempts) {
      const retryAfterSeconds = Math.ceil((record.firstAttempt + windowMs - now) / 1000);
      res.setHeader('Retry-After', Math.max(1, retryAfterSeconds));
      return res.status(429).json({
        success: false,
        message,
      });
    }

    next();
  };
}

// 1. Admin Login Rate Limiter (Max 10 attempts per 15 minutes)
export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxAttempts: 10,
  message: 'Too many login attempts. Please try again after 15 minutes.',
  keyPrefix: 'login',
  skipInTests: false,
});

// 2. Customer Auth Rate Limiter (Max 15 attempts per 15 minutes)
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxAttempts: 15,
  message: 'Too many authentication attempts. Please try again after 15 minutes.',
  keyPrefix: 'customer-auth',
  skipInTests: false,
});

// 3. Order Placement Rate Limiter (Max 30 orders per 10 minutes per IP)
export const orderRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxAttempts: 30,
  message: 'Order creation rate limit reached. Please wait a few minutes before placing more orders.',
  keyPrefix: 'order',
  skipInTests: false,
});

// 4. Notification Retry Rate Limiter (Max 15 retries per 15 minutes)
export const notificationRetryRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxAttempts: 15,
  message: 'Notification retry rate limit reached. Please try again later.',
  keyPrefix: 'notif-retry',
  skipInTests: false,
});

// 5. Global API Fallback Limiter (Generous 500 requests per 15 mins, skipped in tests)
export const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxAttempts: 500,
  message: 'Too many requests. Please slow down.',
  keyPrefix: 'api',
  skipInTests: true,
});

/**
 * Reset all memory stores (for automated test suites)
 */
export function _resetRateLimiter() {
  for (const store of rateLimitStores) {
    store.clear();
  }
}

export default loginRateLimiter;
