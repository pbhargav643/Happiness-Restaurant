import mongoose from 'mongoose';
import MenuItem, { generateSlug } from '../models/MenuItem.js';

// Allowed sort fields whitelist to prevent database injection
const ALLOWED_SORT_FIELDS = ['name', 'price', 'createdAt', 'category', 'isAvailable'];

// Whitelisted update fields to prevent arbitrary MongoDB field injection
const ALLOWED_UPDATE_FIELDS = ['name', 'slug', 'category', 'price', 'image', 'description', 'isAvailable'];

/**
 * Menu Service Layer
 * Centralizes all MenuItem database operations and query logic.
 */
export const menuService = {
  /**
   * Retrieve menu items with filtering, search, safe sorting, and pagination
   */
  async getAllMenuItems(options = {}) {
    const {
      category,
      search,
      sort = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 50,
      includeUnavailable = false,
    } = options;

    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(500, Math.max(1, parseInt(limit, 10) || 50));

    // If database is not connected, return safe empty list immediately
    if (mongoose.connection.readyState !== 1) {
      return {
        items: [],
        total: 0,
        page: safePage,
        limit: safeLimit,
        totalPages: 1,
      };
    }

    const query = {};

    // 1. Availability filter (Public only sees available items)
    if (!includeUnavailable) {
      query.isAvailable = true;
    }

    // 2. Category filter (Supports display name, slugified identifier, spaced, and underscore variations)
    if (category && typeof category === 'string' && category.trim()) {
      const trimmedCategory = category.trim();
      const slugifiedCategory = generateSlug(trimmedCategory);
      const spacedCategory = trimmedCategory.replace(/[-_]+/g, ' ');
      const underscoredCategory = trimmedCategory.replace(/[-\s]+/g, '_');

      const escapedRaw = trimmedCategory.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const escapedSlug = slugifiedCategory.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const escapedSpaced = spacedCategory.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const escapedUnderscore = underscoredCategory.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      query.category = {
        $regex: new RegExp(`^(${escapedRaw}|${escapedSlug}|${escapedSpaced}|${escapedUnderscore})$`, 'i'),
      };
    }

    // 3. Search filter across name, category, and description with safe regex escaping
    if (search && typeof search === 'string' && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');
      query.$or = [
        { name: searchRegex },
        { category: searchRegex },
        { description: searchRegex },
      ];
    }

    // 4. Safe Sorting with strict whitelist and shortcut support (e.g. price_asc, price_desc)
    let sortOption = { createdAt: -1 };

    if (typeof sort === 'string') {
      const lowerSort = sort.trim().toLowerCase();
      if (lowerSort === 'price_asc') {
        sortOption = { price: 1 };
      } else if (lowerSort === 'price_desc') {
        sortOption = { price: -1 };
      } else if (lowerSort === 'name_asc') {
        sortOption = { name: 1 };
      } else if (lowerSort === 'name_desc') {
        sortOption = { name: -1 };
      } else if (ALLOWED_SORT_FIELDS.includes(lowerSort)) {
        const sortDirection = String(order).toLowerCase() === 'asc' ? 1 : -1;
        sortOption = { [lowerSort]: sortDirection };
      }
    }

    // 5. Pagination
    const skip = (safePage - 1) * safeLimit;

    // 6. Execute count and query concurrently
    const [total, items] = await Promise.all([
      MenuItem.countDocuments(query),
      MenuItem.find(query)
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
   * Retrieve a single menu item by ID (or slug fallback)
   */
  async getMenuItemById(id) {
    if (!id || typeof id !== 'string') return null;
    if (mongoose.connection.readyState !== 1) return null;

    if (mongoose.isValidObjectId(id)) {
      const item = await MenuItem.findById(id).lean();
      if (item) return item;
    }

    // Fallback lookup by slug if not found by ObjectId or if arbitrary slug string
    return MenuItem.findOne({ slug: id.toLowerCase().trim() }).lean();
  },

  /**
   * Retrieve a single menu item by slug
   */
  async getMenuItemBySlug(slug) {
    if (!slug || typeof slug !== 'string') return null;
    if (mongoose.connection.readyState !== 1) return null;
    return MenuItem.findOne({ slug: slug.toLowerCase().trim() }).lean();
  },

  /**
   * Create a new menu item
   */
  async createMenuItem(data) {
    const { name, category, price, slug, image, description, isAvailable } = data;

    const finalSlug = (slug && typeof slug === 'string' && slug.trim())
      ? generateSlug(slug)
      : generateSlug(name);

    if (mongoose.connection.readyState !== 1) {
      const error = new Error('Database is not connected');
      error.statusCode = 503;
      throw error;
    }

    // Check for duplicate slug
    const existing = await MenuItem.findOne({ slug: finalSlug });
    if (existing) {
      const error = new Error(`Menu item with slug "${finalSlug}" already exists.`);
      error.statusCode = 409;
      error.code = 'DUPLICATE_SLUG';
      throw error;
    }

    const newItem = new MenuItem({
      name: name.trim(),
      category: category.trim().toLowerCase(),
      price: Number(price),
      slug: finalSlug,
      image: image || null,
      description: description || '',
      isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
    });

    return await newItem.save();
  },

  /**
   * Update an existing menu item by ID
   */
  async updateMenuItem(id, updateData) {
    if (!id || !mongoose.isValidObjectId(id)) {
      return null;
    }
    if (mongoose.connection.readyState !== 1) {
      return null;
    }

    // Filter update data to only permitted fields to prevent arbitrary field injection
    const filteredUpdates = {};
    for (const key of Object.keys(updateData)) {
      if (ALLOWED_UPDATE_FIELDS.includes(key)) {
        filteredUpdates[key] = updateData[key];
      }
    }

    // Validate price if supplied
    if (filteredUpdates.price !== undefined) {
      const numericPrice = Number(filteredUpdates.price);
      if (isNaN(numericPrice) || numericPrice < 0) {
        const err = new Error('Price must be a non-negative number');
        err.statusCode = 400;
        throw err;
      }
      filteredUpdates.price = numericPrice;
    }

    // Validate name if supplied
    if (filteredUpdates.name !== undefined) {
      if (!filteredUpdates.name || !String(filteredUpdates.name).trim()) {
        const err = new Error('Item name cannot be empty');
        err.statusCode = 400;
        throw err;
      }
      filteredUpdates.name = String(filteredUpdates.name).trim();
    }

    // Validate category if supplied
    if (filteredUpdates.category !== undefined) {
      if (!filteredUpdates.category || !String(filteredUpdates.category).trim()) {
        const err = new Error('Category cannot be empty');
        err.statusCode = 400;
        throw err;
      }
      filteredUpdates.category = String(filteredUpdates.category).trim().toLowerCase();
    }

    // Handle slug change and duplicate conflict
    if (filteredUpdates.slug) {
      const cleanSlug = generateSlug(filteredUpdates.slug);
      const conflict = await MenuItem.findOne({ slug: cleanSlug, _id: { $ne: id } });
      if (conflict) {
        const error = new Error(`Menu item with slug "${cleanSlug}" already exists.`);
        error.statusCode = 409;
        error.code = 'DUPLICATE_SLUG';
        throw error;
      }
      filteredUpdates.slug = cleanSlug;
    }

    const updated = await MenuItem.findByIdAndUpdate(
      id,
      { $set: filteredUpdates },
      { new: true, runValidators: true }
    );

    return updated;
  },

  /**
   * Update item availability status (Admin)
   * Strictly updates isAvailable only; does NOT modify any other fields
   */
  async updateAvailability(id, isAvailable) {
    if (!id || !mongoose.isValidObjectId(id)) {
      return null;
    }
    if (mongoose.connection.readyState !== 1) {
      return null;
    }

    const updated = await MenuItem.findByIdAndUpdate(
      id,
      { $set: { isAvailable: Boolean(isAvailable) } },
      { new: true, runValidators: true }
    );

    return updated;
  },

  /**
   * Delete a menu item safely
   * Does NOT modify or delete customer orders or historical order snapshots
   */
  async deleteMenuItem(id) {
    if (!id || !mongoose.isValidObjectId(id)) {
      return null;
    }
    if (mongoose.connection.readyState !== 1) {
      return null;
    }

    const existing = await MenuItem.findById(id);
    if (!existing) {
      return null;
    }

    await MenuItem.findByIdAndDelete(id);
    return existing;
  },
};

export default menuService;
