import express from 'express';

const router = express.Router();

/**
 * Health Check Endpoint
 * GET /api/health
 *
 * Exact Expected Response:
 * {
 *   "success": true,
 *   "message": "Restaurant API is running"
 * }
 */
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Restaurant API is running',
  });
});

export default router;
