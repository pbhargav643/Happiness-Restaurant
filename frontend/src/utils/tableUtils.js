/**
 * Table Registry & Lookup Utilities
 *
 * Provides shared mock table registry, table key normalization, and cart item
 * boundary normalization for both Admin Table Management and Customer Dine-in flows.
 */

import { getMenuItemById, MENU_ITEMS } from '../data/menuData.js';

export const DEFAULT_MOCK_TABLES = [
  {
    id: 'tbl-1',
    tableNumber: 'Table 1',
    name: 'Window Bay',
    capacity: 4,
    status: 'Active',
    updatedAt: '2026-02-10T10:00:00Z',
  },
  {
    id: 'tbl-2',
    tableNumber: 'Table 2',
    name: 'Garden Alcove',
    capacity: 2,
    status: 'Active',
    updatedAt: '2026-02-12T11:30:00Z',
  },
  {
    id: 'tbl-3',
    tableNumber: 'Table 3',
    name: 'Family Central',
    capacity: 6,
    status: 'Active',
    updatedAt: '2026-02-15T09:15:00Z',
  },
  {
    id: 'tbl-4',
    tableNumber: 'Table 4',
    name: 'Terrace Corner',
    capacity: 4,
    status: 'Inactive',
    updatedAt: '2026-02-18T14:20:00Z',
  },
  {
    id: '507f1f77bcf86cd799439005',
    _id: '507f1f77bcf86cd799439005',
    tableNumber: 'Table 5',
    name: 'Corner Booth',
    capacity: 4,
    status: 'Active',
    updatedAt: '2026-02-20T10:00:00Z',
  },
];

export const SAMPLE_TABLES = DEFAULT_MOCK_TABLES;

/**
 * Normalizes a table number for robust comparisons:
 * - Trims leading and trailing whitespace
 * - Converts to lowercase
 * - Collapses multiple internal spaces into a single space
 */
export function normalizeTableNumber(num) {
  return (num || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Determines whether two table numbers are duplicates:
 * - Case-insensitive match ('Table 1' vs 'table 1')
 * - Whitespace-insensitive match ('  Table 1  ' vs 'Table   1')
 * - Equivalent numbering match ('Table 1' vs '1', 'T-1' vs 'Table 1')
 */
export function isDuplicateTable(existingNumber, targetNumber) {
  const normExisting = normalizeTableNumber(existingNumber);
  const normTarget = normalizeTableNumber(targetNumber);
  if (!normTarget || !normExisting) return false;
  if (normExisting === normTarget) return true;

  // Compare cleaned numeric representation if formatted with standard prefixes (Table, Tbl, T)
  const stripPrefix = (s) => s.replace(/^(table|tbl|t)[-\s]*/i, '').trim();
  const cleanExisting = stripPrefix(normExisting);
  const cleanTarget = stripPrefix(normTarget);
  return Boolean(cleanExisting && cleanTarget && cleanExisting === cleanTarget);
}

/**
 * Standardizes a table key for isolated dictionary lookups (e.g. 'tbl-1')
 */
export function getTableKey(table) {
  if (!table) return null;
  const raw = table.id || table.tableNumber || '';
  return String(raw).trim().toLowerCase();
}

/**
 * Searches the mock table registry (including browser localStorage overrides)
 * for a table matching the provided ID or table number.
 */
export function findMockTable(identifier) {
  if (!identifier) return null;
  const raw = String(identifier).trim().toLowerCase();
  if (!raw) return null;

  let tables = DEFAULT_MOCK_TABLES;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem('happiness_restaurant_tables');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          tables = parsed;
        }
      }
    } catch {
      // Fallback to DEFAULT_MOCK_TABLES
    }
  }

  // 1. Direct match on table.id, _id, or tableNumber
  const directMatch = tables.find(
    (t) =>
      (t.id && String(t.id).toLowerCase() === raw) ||
      (t._id && String(t._id).toLowerCase() === raw) ||
      (t.tableNumber && String(t.tableNumber).toLowerCase() === raw)
  );
  if (directMatch) return directMatch;

  // 2. Normalized numeric match (e.g. "Table 1" vs "1" or "tbl-1")
  const cleanRaw = raw.replace(/^(table|tbl|t)[-\s]*/i, '').trim();
  if (cleanRaw) {
    const numericMatch = tables.find((t) => {
      const cleanNum = (t.tableNumber || '').toLowerCase().replace(/^(table|tbl|t)[-\s]*/i, '').trim();
      const cleanId = (t.id || t._id || '').toLowerCase().replace(/^(table|tbl|t)[-\s]*/i, '').trim();
      return (cleanNum && cleanNum === cleanRaw) || (cleanId && cleanId === cleanRaw);
    });
    if (numericMatch) return numericMatch;
  }

  return null;
}

/**
 * Safely normalize an incoming item or identifier at the cart boundary.
 *
 * Ensures full compatibility between:
 * - Backend API items (containing MongoDB _id, slug, name, price, etc.)
 * - Static physical catalog items from menuData.js (containing canonical id)
 * - Raw ID strings (canonical ID, slug, or MongoDB ObjectId)
 *
 * Preserves the canonical id, name, price, image, and availability.
 */
export function normalizeItemAtCartBoundary(itemOrId) {
  if (!itemOrId) return null;

  // Case 1: itemOrId is an object
  if (typeof itemOrId === 'object') {
    const rawId = itemOrId.itemId || itemOrId.id || itemOrId._id;
    const rawName = (itemOrId.name || '').trim();

    // 1. Try direct catalog lookup by rawId
    let catalogItem = rawId ? getMenuItemById(rawId) : null;

    // 2. If not found by rawId, try matching by name in MENU_ITEMS
    if (!catalogItem && rawName) {
      catalogItem = MENU_ITEMS.find(
        (m) => m.name && m.name.toLowerCase() === rawName.toLowerCase()
      );
    }

    // 3. If not found by name, try matching by _id or slug
    if (!catalogItem && itemOrId._id) {
      const cleanMongoId = String(itemOrId._id).toLowerCase();
      catalogItem = MENU_ITEMS.find(
        (m) => m._id && String(m._id).toLowerCase() === cleanMongoId
      );
    }

    if (catalogItem) {
      return {
        ...catalogItem,
        id: catalogItem.id,
        itemId: catalogItem.id,
        _id: itemOrId._id || catalogItem._id || catalogItem.id,
        name: catalogItem.name,
        price: Number(catalogItem.price) || 0,
        image: itemOrId.image || catalogItem.image || null,
        category: catalogItem.category || itemOrId.category,
        categoryName: catalogItem.categoryName || itemOrId.categoryName || '',
        isVeg: catalogItem.isVeg !== undefined ? catalogItem.isVeg : itemOrId.isVeg !== false,
        available:
          itemOrId.available !== false &&
          itemOrId.isAvailable !== false &&
          catalogItem.available !== false &&
          catalogItem.isAvailable !== false,
      };
    }

    // Custom or database item not in physical catalog
    if (rawName && (itemOrId.price !== undefined || itemOrId.unitPrice !== undefined)) {
      const price = Number(itemOrId.price !== undefined ? itemOrId.price : itemOrId.unitPrice) || 0;
      const canonicalId = String(rawId || `item-${Date.now()}`);
      return {
        id: canonicalId,
        itemId: canonicalId,
        _id: itemOrId._id || canonicalId,
        name: rawName,
        price,
        image: itemOrId.image || null,
        category: itemOrId.category || 'all',
        categoryName: itemOrId.categoryName || '',
        isVeg: itemOrId.isVeg !== false,
        available: itemOrId.available !== false && itemOrId.isAvailable !== false,
      };
    }

    return null;
  }

  // Case 2: itemOrId is a string ID
  const rawId = String(itemOrId).trim();
  if (!rawId) return null;

  // 1. Direct lookup via getMenuItemById
  let catalogItem = getMenuItemById(rawId);

  // 2. Fallback search by ID or name
  if (!catalogItem) {
    const lower = rawId.toLowerCase();
    catalogItem = MENU_ITEMS.find(
      (m) =>
        (m.id && m.id.toLowerCase() === lower) ||
        (m.name && m.name.toLowerCase() === lower)
    );
  }

  if (catalogItem) {
    return {
      ...catalogItem,
      id: catalogItem.id,
      itemId: catalogItem.id,
      _id: catalogItem._id || catalogItem.id,
      price: Number(catalogItem.price) || 0,
      available: catalogItem.available !== false && catalogItem.isAvailable !== false,
    };
  }

  return null;
}
