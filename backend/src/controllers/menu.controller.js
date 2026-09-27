import mongoose from 'mongoose';
import menuService from '../services/menu.service.js';
import { isSafeImagePath } from '../middleware/inputValidation.js';

/**
 * Menu Controller
 * Handles HTTP requests, parameter validation, and formatting standardized JSON responses.
 *
 * NOTE: Authentication for admin endpoints is intentionally omitted in Phase 8 (AUTHENTICATION PENDING).
 */
export const menuController = {
  /**
   * GET /api/menu
   * Public list of available menu items with category filtering, search, sorting, and pagination
   */
  async getMenu(req, res, next) {
    try {
      const { category, search, sort, order, page, limit, includeUnavailable } = req.query;

      const result = await menuService.getAllMenuItems({
        category,
        search,
        sort,
        order,
        page,
        limit,
        includeUnavailable: includeUnavailable === 'true' || includeUnavailable === true || req.query.all === 'true',
      });

      return res.status(200).json({
        success: true,
        data: result.items,
        meta: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/menu/:itemId
   * Retrieve a single menu item by ID (or slug fallback)
   */
  async getMenuItem(req, res, next) {
    try {
      const { itemId } = req.params;
      const item = await menuService.getMenuItemById(itemId);

      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Menu item not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: item,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/menu/slug/:slug
   * Retrieve a single menu item specifically by URL slug
   */
  async getMenuItemBySlug(req, res, next) {
    try {
      const { slug } = req.params;
      const item = await menuService.getMenuItemBySlug(slug);

      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Menu item not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: item,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/admin/menu
   * Admin: Create a new menu item (AUTHENTICATION PENDING)
   */
  async createMenuItem(req, res, next) {
    try {
      const { name, category, price, slug, image, description, isAvailable } = req.body;

      // Required fields validation
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Item name is required and cannot be empty',
        });
      }

      if (!category || typeof category !== 'string' || !category.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Category is required and cannot be empty',
        });
      }

      if (price === undefined || price === null || isNaN(Number(price))) {
        return res.status(400).json({
          success: false,
          message: 'Price is required and must be a valid number',
        });
      }

      if (Number(price) < 0) {
        return res.status(400).json({
          success: false,
          message: 'Price must be a non-negative number',
        });
      }

      if (image && !isSafeImagePath(image)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid image path. Directory traversal is prohibited.',
        });
      }

      const newItem = await menuService.createMenuItem({
        name: name.trim(),
        category: category.trim().toLowerCase(),
        price: Number(price),
        slug,
        image: image || null,
        description: description || '',
        isAvailable,
      });

      return res.status(201).json({
        success: true,
        message: 'Menu item created successfully',
        data: newItem,
      });
    } catch (error) {
      if (error.code === 'DUPLICATE_SLUG' || error.statusCode === 409) {
        return res.status(409).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  },

  /**
   * PATCH /api/admin/menu/:itemId
   * Admin: Update menu item (AUTHENTICATION PENDING)
   */
  async updateMenuItem(req, res, next) {
    try {
      const { itemId } = req.params;
      const updates = { ...req.body };

      if (updates.name !== undefined && (!updates.name || !String(updates.name).trim())) {
        return res.status(400).json({
          success: false,
          message: 'Item name cannot be empty',
        });
      }

      if (updates.category !== undefined && (!updates.category || !String(updates.category).trim())) {
        return res.status(400).json({
          success: false,
          message: 'Category cannot be empty',
        });
      }

      if (updates.price !== undefined) {
        const numPrice = Number(updates.price);
        if (isNaN(numPrice) || numPrice < 0) {
          return res.status(400).json({
            success: false,
            message: 'Price must be a non-negative number',
          });
        }
        updates.price = numPrice;
      }

      if (updates.image !== undefined && updates.image !== null && !isSafeImagePath(updates.image)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid image path. Directory traversal is prohibited.',
        });
      }

      const updatedItem = await menuService.updateMenuItem(itemId, updates);

      if (!updatedItem) {
        return res.status(404).json({
          success: false,
          message: 'Menu item not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Menu item updated successfully',
        data: updatedItem,
      });
    } catch (error) {
      if (error.code === 'DUPLICATE_SLUG' || error.statusCode === 409) {
        return res.status(409).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  },

  /**
   * PATCH /api/admin/menu/:itemId/availability
   * Admin: Update item availability status (AUTHENTICATION PENDING)
   */
  async updateAvailability(req, res, next) {
    try {
      const { itemId } = req.params;
      const { isAvailable } = req.body;

      if (isAvailable === undefined || typeof isAvailable !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'isAvailable boolean field is required',
        });
      }

      const updated = await menuService.updateAvailability(itemId, isAvailable);

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Menu item not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: `Menu item availability updated to ${isAvailable ? 'available' : 'unavailable'}`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/admin/menu/:itemId
   * Admin: Safe deletion of a menu item (AUTHENTICATION PENDING)
   */
  async deleteMenuItem(req, res, next) {
    try {
      const { itemId } = req.params;
      const deleted = await menuService.deleteMenuItem(itemId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Menu item not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Menu item deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/admin/menu/upload-image
   * Admin: Secure direct image upload for menu items
   */
  async uploadImage(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file uploaded.',
        });
      }

      // Safe relative public path
      const imagePath = `/images/menu/${req.file.filename}`;

      return res.status(200).json({
        success: true,
        message: 'Image uploaded successfully.',
        imagePath,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      });
    } catch (err) {
      next(err);
    }
  },
};

export default menuController;
