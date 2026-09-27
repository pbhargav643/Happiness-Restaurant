/**
 * NoSQL / MongoDB Operator Sanitization Middleware
 *
 * Recursively inspects request query, body, and params to neutralize
 * MongoDB operator injection attacks ($gt, $gte, $ne, $regex, $where, $or, etc.).
 */

function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    // Drop keys that start with $ (MongoDB query operators) or contain dots (property traversal)
    if (key.startsWith('$') || key.includes('.')) {
      continue;
    }
    clean[key] = sanitizeObject(value);
  }

  return clean;
}

export function mongoSanitizer(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }

  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }

  next();
}

export default mongoSanitizer;
