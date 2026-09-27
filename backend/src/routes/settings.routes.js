import express from 'express';
import { settingsController } from '../controllers/settingsController.js';

const router = express.Router();

/**
 * Restaurant Settings Routes
 * Mounted at /api/settings and /api/admin/settings
 *
 * NOTE: Admin update operations are in "AUTHENTICATION PENDING" status for local development.
 */

import { authenticateAdmin } from '../middleware/authMiddleware.js';

// GET /api/settings - Retrieve restaurant operational settings and pickup parameters
router.get('/', settingsController.getSettings);

// PATCH /api/settings - Update restaurant settings (Requires Admin Auth)
router.patch('/', authenticateAdmin, settingsController.updateSettings);


export default router;
