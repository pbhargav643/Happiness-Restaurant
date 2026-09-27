import { NODE_ENV } from '../config/env.js';

/**
 * Centralized Application Error Handling Middleware
 *
 * Requirements:
 * - Consistent JSON error response
 * - No stack traces exposed in production
 * - Useful development logging
 * - Friendly handling of Mongoose validation, cast, and duplicate key errors
 */
export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode) || 500;
  let message = err.message || 'Internal Server Error';

  // Handle Mongoose Validation Errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const errors = Object.values(err.errors || {}).map((e) => e.message);
    message = `Validation Error: ${errors.join(', ')}`;
  }

  // Handle Mongoose Cast Errors (Invalid ObjectId / field type)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // Handle Mongoose Duplicate Key Errors
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = `Duplicate field value entered for '${field}'. Please use another value.`;
  }

  // Sanitize message against connection strings, internal filesystem paths, tokens, or credentials
  if (typeof message === 'string') {
    message = message
      .replace(/mongodb(\+srv)?:\/\/[^\s]+/gi, '[REDACTED_URI]')
      .replace(/[A-Z]:\\[^\s:;,]+/gi, '[PATH]')
      .replace(/\/[\w.-]+(\/[\w.-]+)+/g, '[PATH]')
      .replace(/Bearer\s+[A-Za-z0-9-_=.]+/gi, 'Bearer [REDACTED_TOKEN]')
      .replace(/(?:password|secret|key|token)["':\s]+["']?([^\s"',]+)["']?/gi, '***:[REDACTED]');
  }

  // In production, mask unexpected 500 errors to prevent information disclosure
  if (NODE_ENV === 'production' && statusCode === 500) {
    message = 'An internal server error occurred. Please try again later.';
  }

  // Server-side logging only
  if (NODE_ENV !== 'production') {
    console.error(`[Error Handler] ${req.method} ${req.originalUrl}:`, err.message);
  }

  // Safe and professional user-facing response with zero internal leakages
  res.status(statusCode).json({
    success: false,
    message,
  });
}

export default errorHandler;
