/**
 * 404 Not Found Middleware
 * Intercepts requests to unmapped endpoints and returns standard JSON error.
 */
export function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
  });
}

export default notFoundHandler;
