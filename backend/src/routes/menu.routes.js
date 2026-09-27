import express from 'express';
import { menuController } from '../controllers/menuController.js';

const router = express.Router();

/**
 * Public Menu Routes
 * Mounted at /api/menu
 */




// GET /api/menu - Get all available menu items (supports ?category, ?search, ?sort, ?order, ?page, ?limit)
router.get('/', menuController.getMenu);


// GET /api/menu/slug/:slug - Get single item by slug
router.get('/slug/:slug', menuController.getMenuItemBySlug);

// GET /api/menu/:itemId - Get single item by ID or slug fallback
router.get('/:itemId', menuController.getMenuItem);

export default router;
