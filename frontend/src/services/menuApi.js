import api from './api.js';
import { MENU_ITEMS, MENU_CATEGORIES } from '../data/menuData.js';

/**
 * Category Name Lookup Map
 */
/**
 * Category Name & ID Lookup Map
 */
const CATEGORY_NAMES_MAP = new Map();
MENU_CATEGORIES.forEach((cat) => {
  CATEGORY_NAMES_MAP.set(cat.id.toLowerCase(), cat.name);
  CATEGORY_NAMES_MAP.set(cat.slug.toLowerCase(), cat.name);
  CATEGORY_NAMES_MAP.set(cat.name.toLowerCase(), cat.name);
  CATEGORY_NAMES_MAP.set(cat.id.replace(/[\s_-]+/g, ' ').toLowerCase(), cat.name);
});

/**
 * Format category identifier to display name
 */
export function getCategoryDisplayName(categorySlug) {
  if (!categorySlug) return 'All';
  const clean = String(categorySlug).toLowerCase().trim();
  const cleanSlug = clean.replace(/[\s_-]+/g, '-');
  if (CATEGORY_NAMES_MAP.has(clean)) {
    return CATEGORY_NAMES_MAP.get(clean);
  }
  if (CATEGORY_NAMES_MAP.has(cleanSlug)) {
    return CATEGORY_NAMES_MAP.get(cleanSlug);
  }
  // Title case fallback
  return clean
    .split(/[-_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Find canonical category object from any identifier (id, slug, display name, spaced)
 */
export function findCanonicalCategory(identifier) {
  if (!identifier || identifier === 'all') return null;
  const clean = String(identifier).toLowerCase().trim();
  const cleanSlug = clean.replace(/[\s_-]+/g, '-');
  const cleanSpaced = clean.replace(/[\s_-]+/g, ' ');

  return (
    MENU_CATEGORIES.find(
      (c) =>
        c.id.toLowerCase() === clean ||
        c.slug.toLowerCase() === clean ||
        c.id.toLowerCase() === cleanSlug ||
        c.name.toLowerCase() === clean ||
        c.name.toLowerCase() === cleanSpaced ||
        c.name.toLowerCase().replace(/[\s_-]+/g, '-') === cleanSlug
    ) || null
  );
}

/**
 * Category matching helper supporting slug, id, display name, and spaced variations
 */
export function isItemInCategory(item, categoryIdentifier) {
  if (!categoryIdentifier || categoryIdentifier === 'all') return true;
  const canonical = findCanonicalCategory(categoryIdentifier);
  const targetId = canonical ? canonical.id.toLowerCase() : String(categoryIdentifier).toLowerCase().trim();
  const targetSlug = targetId.replace(/[\s_-]+/g, '-');
  const targetName = canonical ? canonical.name.toLowerCase() : targetId.replace(/[-_]+/g, ' ');

  const itemCat = (item?.category || '').toLowerCase().trim();
  const itemCatSlug = itemCat.replace(/[\s_-]+/g, '-');
  const itemCatName = (item?.categoryName || '').toLowerCase().trim();
  const itemCatNameSlug = itemCatName.replace(/[\s_-]+/g, '-');

  return (
    itemCat === targetId ||
    itemCat === targetSlug ||
    itemCatSlug === targetSlug ||
    itemCatName === targetName ||
    itemCatNameSlug === targetSlug ||
    (canonical && itemCatName === canonical.name.toLowerCase())
  );
}

/**
 * Normalize Backend MenuItem to Frontend Component Contract
 *
 * Ensures 100% compatibility with MenuItemCard, FoodItemDetailPage, and CartContext:
 * - id: stable unique ID
 * - name: printed dish title
 * - price: numeric price in INR
 * - category: canonical category identifier (e.g. 'chinese-rice')
 * - categoryName: human-readable category title (e.g. 'Chinese Rice')
 * - image: image asset path or null
 * - isVeg: vegetarian badge boolean
 * - available: in-stock boolean
 * - prepTime: preparation time estimate
 */
export function normalizeMenuItem(item) {
  if (!item || typeof item !== 'object') return null;

  const rawCat = (item.category || '').toLowerCase().trim();
  const matchedCategory = findCanonicalCategory(rawCat);

  const categoryId = matchedCategory ? matchedCategory.id : (rawCat.replace(/[\s_]+/g, '-') || 'all');
  const categoryName = item.categoryName || (matchedCategory ? matchedCategory.name : getCategoryDisplayName(categoryId));

  return {
    id: item._id || item.id || item.slug,
    _id: item._id || item.id,
    slug: item.slug || '',
    name: item.name || '',
    category: categoryId,
    categoryName,
    price: Number(item.price) || 0,
    image: item.image || null,
    description: item.description || '',
    isVeg: item.isVeg !== undefined ? Boolean(item.isVeg) : true,
    available: item.isAvailable !== undefined ? Boolean(item.isAvailable) : item.available !== false,
    isAvailable: item.isAvailable !== undefined ? Boolean(item.isAvailable) : true,
    prepTime: item.prepTime || '15–20 Mins',
  };
}

/**
 * Menu API Service
 */
export const menuApi = {
  /**
   * Fetch menu catalog with optional server-side filtering
   * @param {Object} params
   * @param {string} [params.category] Category slug/filter
   * @param {string} [params.search] Search keywords
   * @param {string} [params.sort] Sort order
   * @param {number} [params.limit=150] Items per page
   * @param {number} [params.page=1] Page number
   * @param {boolean} [params.includeUnavailable=false] Whether to include out-of-stock items
   */
  async getMenu(params = {}) {
    const queryParams = new URLSearchParams();

    if (params.category && params.category !== 'all') {
      queryParams.set('category', params.category);
    }
    if (params.search && params.search.trim()) {
      queryParams.set('search', params.search.trim());
    }
    if (params.sort) {
      queryParams.set('sort', params.sort);
    }
    if (params.limit) {
      queryParams.set('limit', String(params.limit));
    } else {
      queryParams.set('limit', '200'); // Default fetch all items (153 total)
    }
    if (params.page) {
      queryParams.set('page', String(params.page));
    }
    if (params.includeUnavailable) {
      queryParams.set('includeUnavailable', 'true');
    }

    const endpoint = queryParams.toString() ? `/menu?${queryParams.toString()}` : '/menu?limit=200';

    try {
      const response = await api.get(endpoint);

      if (response && response.success && Array.isArray(response.data) && response.data.length > 0) {
        const normalized = response.data.map(normalizeMenuItem).filter(Boolean);
        return {
          success: true,
          items: normalized,
          total: response.meta?.total || response.pagination?.total || normalized.length,
          page: response.meta?.page || response.pagination?.page || 1,
          limit: response.meta?.limit || response.pagination?.limit || normalized.length,
          fromBackend: true,
        };
      }

      // If response.data is directly an array
      if (Array.isArray(response)) {
        const normalized = response.map(normalizeMenuItem).filter(Boolean);
        return {
          success: true,
          items: normalized,
          total: normalized.length,
          fromBackend: true,
        };
      }

      // Backend responded but returned 0 items (e.g. unseeded database): fallback to verified local menu
      let localItems = [...MENU_ITEMS];
      if (params.category && params.category !== 'all') {
        const matched = findCanonicalCategory(params.category);
        const targetId = matched ? matched.id.toLowerCase() : params.category.toLowerCase().trim();
        const targetSlug = targetId.replace(/[\s_-]+/g, '-');
        localItems = localItems.filter((i) => {
          const itemCat = (i.category || '').toLowerCase().trim();
          const itemCatSlug = itemCat.replace(/[\s_-]+/g, '-');
          const itemCatName = (i.categoryName || '').toLowerCase().trim();
          return (
            itemCat === targetId ||
            itemCatSlug === targetSlug ||
            itemCatName === targetId ||
            (matched && itemCatName === matched.name.toLowerCase())
          );
        });
      }
      if (params.search && params.search.trim()) {
        const q = params.search.trim().toLowerCase();
        localItems = localItems.filter(
          (i) => (i.name || '').toLowerCase().includes(q) || (i.category || '').toLowerCase().includes(q)
        );
      }
      return {
        success: true,
        items: localItems.map(normalizeMenuItem),
        total: localItems.length,
        fromBackend: false,
        note: 'Fallback to verified menu catalog',
      };
    } catch (err) {
      console.warn('[menuApi.getMenu] Backend fetch failed, falling back to local dataset:', err.message);
      // Safe fallback for offline testing or when backend is unavailable
      let localItems = [...MENU_ITEMS];
      if (params.category && params.category !== 'all') {
        const matched = findCanonicalCategory(params.category);
        const targetId = matched ? matched.id.toLowerCase() : params.category.toLowerCase().trim();
        const targetSlug = targetId.replace(/[\s_-]+/g, '-');
        localItems = localItems.filter((i) => {
          const itemCat = (i.category || '').toLowerCase().trim();
          const itemCatSlug = itemCat.replace(/[\s_-]+/g, '-');
          const itemCatName = (i.categoryName || '').toLowerCase().trim();
          return (
            itemCat === targetId ||
            itemCatSlug === targetSlug ||
            itemCatName === targetId ||
            (matched && itemCatName === matched.name.toLowerCase())
          );
        });
      }
      if (params.search && params.search.trim()) {
        const q = params.search.trim().toLowerCase();
        localItems = localItems.filter(
          (i) => (i.name || '').toLowerCase().includes(q) || (i.category || '').toLowerCase().includes(q)
        );
      }
      return {
        success: true,
        items: localItems.map(normalizeMenuItem),
        total: localItems.length,
        fromBackend: false,
        error: err.message,
      };
    }
  },

  /**
   * Fetch single menu item by ID
   * @param {string} itemId
   */
  async getMenuItemById(itemId) {
    if (!itemId) return null;

    try {
      const response = await api.get(`/menu/${encodeURIComponent(itemId)}`);
      if (response && response.success && response.data) {
        return normalizeMenuItem(response.data);
      }
    } catch (err) {
      // Try slug fallback if ID was not found
    }

    // Try slug lookup as secondary attempt
    try {
      const responseSlug = await api.get(`/menu/slug/${encodeURIComponent(itemId)}`);
      if (responseSlug && responseSlug.success && responseSlug.data) {
        return normalizeMenuItem(responseSlug.data);
      }
    } catch (err) {
      // Local fallback
    }

    // Local fallback check
    const local = MENU_ITEMS.find((i) => i.id === itemId || i.slug === itemId);
    return local ? normalizeMenuItem(local) : null;
  },

  /**
   * Alias for getMenuItemById
   */
  async getMenuItem(itemId) {
    return this.getMenuItemById(itemId);
  },

  /**
   * Fetch single menu item by SEO slug
   * @param {string} slug
   */
  async getMenuItemBySlug(slug) {
    if (!slug) return null;

    try {
      const response = await api.get(`/menu/slug/${encodeURIComponent(slug)}`);
      if (response && response.success && response.data) {
        return normalizeMenuItem(response.data);
      }
    } catch (err) {
      console.warn('[menuApi.getMenuItemBySlug] Backend lookup failed:', err.message);
    }

    const local = MENU_ITEMS.find((i) => i.slug === slug || i.id === slug);
    return local ? normalizeMenuItem(local) : null;
  },

  /**
   * Create a new menu item
   * POST /api/admin/menu
   * @param {Object} payload
   */
  async createMenuItem(payload) {
    if (!payload || typeof payload !== 'object') {
      return { success: false, item: null, error: 'Please provide valid dish details.' };
    }

    const { name, category, price, slug, image, description, isAvailable } = payload;

    if (!name || !String(name).trim()) {
      return { success: false, item: null, error: 'Item name is required and cannot be empty.' };
    }

    if (!category || !String(category).trim()) {
      return { success: false, item: null, error: 'Category is required and cannot be empty.' };
    }

    const numPrice = Number(price);
    if (price === undefined || price === null || isNaN(numPrice) || numPrice < 0) {
      return { success: false, item: null, error: 'Price must be a valid non-negative number.' };
    }

    const cleanPayload = {
      name: String(name).trim(),
      category: String(category).trim().toLowerCase(),
      price: numPrice,
      slug: slug ? String(slug).trim() : undefined,
      image: image ? String(image).trim() : null,
      description: description ? String(description).trim() : '',
      isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
    };

    try {
      const response = await api.post('/admin/menu', cleanPayload);
      if (response && response.success && response.data) {
        return {
          success: true,
          item: normalizeMenuItem(response.data),
          message: response.message || 'Menu item created successfully.',
        };
      }
      return {
        success: false,
        item: null,
        error: response?.message || 'Unable to save menu item.',
      };
    } catch (err) {
      console.warn('[menuApi.createMenuItem] Failed:', err.message);
      return {
        success: false,
        item: null,
        error: err.status === 409
          ? 'A menu item with this title or slug already exists.'
          : (err.message || 'Unable to save menu item.'),
      };
    }
  },

  /**
   * Update an existing menu item
   * PATCH /api/admin/menu/:itemId
   * @param {string} itemId
   * @param {Object} payload
   */
  async updateMenuItem(itemId, payload) {
    if (!itemId || typeof itemId !== 'string' || !itemId.trim()) {
      return { success: false, item: null, error: 'Item ID is required.' };
    }

    if (!payload || typeof payload !== 'object') {
      return { success: false, item: null, error: 'Please provide valid updates.' };
    }

    const cleanUpdates = {};

    if (payload.name !== undefined) {
      if (!payload.name || !String(payload.name).trim()) {
        return { success: false, item: null, error: 'Item name cannot be empty.' };
      }
      cleanUpdates.name = String(payload.name).trim();
    }

    if (payload.category !== undefined) {
      if (!payload.category || !String(payload.category).trim()) {
        return { success: false, item: null, error: 'Category cannot be empty.' };
      }
      cleanUpdates.category = String(payload.category).trim().toLowerCase();
    }

    if (payload.price !== undefined) {
      const numPrice = Number(payload.price);
      if (isNaN(numPrice) || numPrice < 0) {
        return { success: false, item: null, error: 'Price must be a valid non-negative number.' };
      }
      cleanUpdates.price = numPrice;
    }

    if (payload.slug !== undefined) {
      cleanUpdates.slug = String(payload.slug).trim();
    }
    if (payload.image !== undefined) {
      cleanUpdates.image = payload.image ? String(payload.image).trim() : null;
    }
    if (payload.description !== undefined) {
      cleanUpdates.description = String(payload.description).trim();
    }
    if (payload.isAvailable !== undefined) {
      cleanUpdates.isAvailable = Boolean(payload.isAvailable);
    }

    try {
      const response = await api.patch(`/admin/menu/${encodeURIComponent(itemId.trim())}`, cleanUpdates);
      if (response && response.success && response.data) {
        return {
          success: true,
          item: normalizeMenuItem(response.data),
          message: response.message || 'Menu item updated successfully.',
        };
      }
      return {
        success: false,
        item: null,
        error: response?.message || 'Unable to update menu item.',
      };
    } catch (err) {
      console.warn(`[menuApi.updateMenuItem] Failed for ${itemId}:`, err.message);
      return {
        success: false,
        item: null,
        error: err.status === 404
          ? 'Menu item not found.'
          : err.status === 409
          ? 'This dish name or slug conflicts with an existing item.'
          : (err.message || 'Unable to update menu item.'),
      };
    }
  },

  /**
   * Delete a menu item
   * DELETE /api/admin/menu/:itemId
   * @param {string} itemId
   */
  async deleteMenuItem(itemId) {
    if (!itemId || typeof itemId !== 'string' || !itemId.trim()) {
      return { success: false, error: 'Item ID is required.' };
    }

    try {
      const response = await api.delete(`/admin/menu/${encodeURIComponent(itemId.trim())}`);
      if (response && response.success) {
        return {
          success: true,
          message: response.message || 'Menu item deleted successfully.',
        };
      }
      return {
        success: false,
        error: response?.message || 'Unable to delete menu item.',
      };
    } catch (err) {
      console.warn(`[menuApi.deleteMenuItem] Failed for ${itemId}:`, err.message);
      return {
        success: false,
        error: err.status === 404 ? 'Menu item not found.' : (err.message || 'Unable to delete menu item.'),
      };
    }
  },

  /**
   * Update item availability status
   * PATCH /api/admin/menu/:itemId/availability
   * @param {string} itemId
   * @param {boolean} isAvailable
   */
  async updateMenuItemAvailability(itemId, isAvailable) {
    if (!itemId || typeof itemId !== 'string' || !itemId.trim()) {
      return { success: false, item: null, error: 'Item ID is required.' };
    }

    if (typeof isAvailable !== 'boolean') {
      return { success: false, item: null, error: 'isAvailable must be a boolean.' };
    }

    try {
      const response = await api.patch(`/admin/menu/${encodeURIComponent(itemId.trim())}/availability`, {
        isAvailable,
      });

      if (response && response.success && response.data) {
        return {
          success: true,
          item: normalizeMenuItem(response.data),
          message: response.message || `Menu item marked as ${isAvailable ? 'In Stock' : 'Out of Stock'}.`,
        };
      }

      return {
        success: false,
        item: null,
        error: response?.message || 'Unable to update availability.',
      };
    } catch (err) {
      console.warn(`[menuApi.updateMenuItemAvailability] Failed for ${itemId}:`, err.message);
      return {
        success: false,
        item: null,
        error: err.status === 404 ? 'Menu item not found.' : (err.message || 'Unable to update availability.'),
      };
    }
  },

  /**
   * Upload dish image directly to server
   * POST /api/admin/menu/upload-image
   * @param {File} file
   * @returns {Promise<{ success: boolean, imagePath?: string, filename?: string, error?: string }>}
   */
  async uploadMenuImage(file) {
    if (!file) {
      return { success: false, error: 'Please select an image file to upload.' };
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await api.upload('/admin/menu/upload-image', formData);
      if (response && response.success && response.imagePath) {
        return {
          success: true,
          imagePath: response.imagePath,
          filename: response.filename,
          message: response.message || 'Image uploaded successfully.',
        };
      }
      return {
        success: false,
        error: response?.message || 'Image upload failed.',
      };
    } catch (err) {
      console.warn('[menuApi.uploadMenuImage] Failed:', err.message);
      return {
        success: false,
        error: err.message || 'Failed to upload image. Please try again.',
      };
    }
  },
};

export default menuApi;
