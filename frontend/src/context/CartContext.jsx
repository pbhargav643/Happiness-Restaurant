import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { getMenuItemById, MENU_ITEMS } from '../data/menuData.js';

const CART_STORAGE_KEY = 'restaurant_cart';

const CartContext = createContext(null);

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

/**
 * CartProvider Component
 * Centralized cart state management adhering to strict scope:
 * - Minimal stored state: [{ itemId, quantity, ... }]
 * - menuData.js is the authoritative source for pricing and item information
 * - LocalStorage persistence under 'restaurant_cart'
 * - Graceful handling of invalid or outdated IDs
 * - Zero delivery terminology; purely restaurant parcel pickup
 */
export function CartProvider({ children }) {
  // Initialize cart from localStorage, purging invalid/stale item IDs
  const [cartItems, setCartItems] = useState(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (!stored) return [];

      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [];

      // Validate against centralized menuData
      return parsed
        .map((entry) => {
          if (!entry || typeof entry !== 'object') return null;
          const target = entry.itemId || entry.id || entry;
          const resolved = normalizeItemAtCartBoundary(target);
          if (!resolved) return null;

          return {
            itemId: resolved.itemId,
            id: resolved.id,
            _id: resolved._id || entry._id || resolved.id,
            name: resolved.name,
            price: resolved.price,
            image: resolved.image,
            quantity: Math.max(1, Math.floor(Number(entry.quantity)) || 1),
          };
        })
        .filter(Boolean);
    } catch (e) {
      console.warn('Unable to load cart from localStorage, initializing empty:', e);
      return [];
    }
  });

  // Optional cart drawer visibility state
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  // Sync cart state to localStorage under 'restaurant_cart'
  useEffect(() => {
    try {
      const minimal = cartItems.map((entry) => ({
        itemId: entry.itemId || entry.id,
        id: entry.id || entry.itemId,
        _id: entry._id || entry.itemId || entry.id,
        name: entry.name,
        price: entry.price,
        image: entry.image,
        quantity: Math.max(1, Math.floor(entry.quantity) || 1),
      }));
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(minimal));
    } catch (e) {
      console.warn('Unable to save cart to localStorage:', e);
    }
  }, [cartItems]);

  /**
   * Enriched Cart Items
   * Hydrates cart items with fresh data directly from menuData.js (prices, names, categories).
   * Calculates individual line item totals.
   */
  const enrichedCartItems = useMemo(() => {
    return cartItems
      .map((entry) => {
        const menuItem = normalizeItemAtCartBoundary(entry.itemId || entry.id || entry);
        if (!menuItem) return null;

        const safeQty = Math.max(1, Math.floor(entry.quantity) || 1);
        const price = Number(menuItem.price) || 0;
        const itemTotal = price * safeQty;

        return {
          ...menuItem,
          id: menuItem.id || entry.id || entry.itemId,
          _id: entry._id || menuItem._id || menuItem.id,
          quantity: safeQty,
          itemTotal,
        };
      })
      .filter(Boolean);
  }, [cartItems]);

  /**
   * Total Quantity Count across all cart items (Step 7: pizza x 2 + soup x 1 = 3)
   */
  const cartTotalCount = useMemo(() => {
    return enrichedCartItems.reduce((acc, item) => acc + item.quantity, 0);
  }, [enrichedCartItems]);

  /**
   * Cart Subtotal (Step 8: sum of all item totals using menuData prices)
   */
  const subtotal = useMemo(() => {
    return enrichedCartItems.reduce((acc, item) => acc + item.itemTotal, 0);
  }, [enrichedCartItems]);

  /**
   * Add item to cart
   * Accepts either an item object (e.g. from MenuItemCard) or an itemId string.
   * Increases quantity if already present; appends if new.
   */
  const addToCart = useCallback((itemOrId, quantityToAdd = 1) => {
    if (!itemOrId) {
      console.warn('[CartContext] addToCart called without item or ID');
      return;
    }

    const menuItem = normalizeItemAtCartBoundary(itemOrId);
    if (!menuItem) {
      console.warn('[CartContext] Failed to normalize menu item at cart boundary:', itemOrId);
      return;
    }

    if (menuItem.available === false) {
      console.warn('[CartContext] Cannot add unavailable item to cart:', menuItem.name);
      return;
    }

    const qty = Math.max(1, Math.floor(Number(quantityToAdd)) || 1);
    const targetKey = menuItem.itemId || menuItem.id;

    setCartItems((prev) => {
      const existingIndex = prev.findIndex((entry) => {
        if (entry.itemId && entry.itemId === targetKey) return true;
        if (entry.id && entry.id === targetKey) return true;
        if (menuItem._id && entry._id && entry._id === menuItem._id) return true;
        if (entry.name && menuItem.name && entry.name.toLowerCase() === menuItem.name.toLowerCase()) return true;
        return false;
      });

      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + qty,
        };
        return updated;
      }

      return [
        ...prev,
        {
          itemId: targetKey,
          id: targetKey,
          _id: menuItem._id || targetKey,
          name: menuItem.name,
          price: menuItem.price,
          image: menuItem.image,
          quantity: qty,
        },
      ];
    });
  }, []);

  /**
   * Update quantity directly
   */
  const updateQuantity = useCallback((itemOrId, newQuantity) => {
    const targetId = typeof itemOrId === 'object'
      ? (itemOrId.id || itemOrId._id || itemOrId.itemId)
      : String(itemOrId).trim();
    const normalized = normalizeItemAtCartBoundary(itemOrId);
    const canonicalId = normalized ? normalized.itemId : targetId;

    const qty = Math.floor(Number(newQuantity));
    if (isNaN(qty) || qty <= 0) {
      // Decreasing to 0 or below removes the item
      setCartItems((prev) =>
        prev.filter(
          (item) => item.itemId !== canonicalId && item.id !== canonicalId && item._id !== targetId
        )
      );
    } else {
      setCartItems((prev) =>
        prev.map((item) =>
          item.itemId === canonicalId || item.id === canonicalId || item._id === targetId
            ? { ...item, quantity: qty }
            : item
        )
      );
    }
  }, []);

  /**
   * Increase quantity by 1
   */
  const increaseQuantity = useCallback((itemOrId) => {
    const targetId = typeof itemOrId === 'object'
      ? (itemOrId.id || itemOrId._id || itemOrId.itemId)
      : String(itemOrId).trim();
    const normalized = normalizeItemAtCartBoundary(itemOrId);
    const canonicalId = normalized ? normalized.itemId : targetId;

    setCartItems((prev) =>
      prev.map((item) =>
        item.itemId === canonicalId || item.id === canonicalId || item._id === targetId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  }, []);

  /**
   * Decrease quantity by 1 (removes item if quantity reaches 0 from 1)
   */
  const decreaseQuantity = useCallback((itemOrId) => {
    const targetId = typeof itemOrId === 'object'
      ? (itemOrId.id || itemOrId._id || itemOrId.itemId)
      : String(itemOrId).trim();
    const normalized = normalizeItemAtCartBoundary(itemOrId);
    const canonicalId = normalized ? normalized.itemId : targetId;

    setCartItems((prev) => {
      const target = prev.find(
        (item) => item.itemId === canonicalId || item.id === canonicalId || item._id === targetId
      );
      if (!target) return prev;
      if (target.quantity <= 1) {
        return prev.filter(
          (item) => item.itemId !== canonicalId && item.id !== canonicalId && item._id !== targetId
        );
      }
      return prev.map((item) =>
        item.itemId === canonicalId || item.id === canonicalId || item._id === targetId
          ? { ...item, quantity: item.quantity - 1 }
          : item
      );
    });
  }, []);

  /**
   * Remove item from cart
   */
  const removeFromCart = useCallback((itemOrId) => {
    const targetId = typeof itemOrId === 'object'
      ? (itemOrId.id || itemOrId._id || itemOrId.itemId)
      : String(itemOrId).trim();
    const normalized = normalizeItemAtCartBoundary(itemOrId);
    const canonicalId = normalized ? normalized.itemId : targetId;

    setCartItems((prev) =>
      prev.filter(
        (item) => item.itemId !== canonicalId && item.id !== canonicalId && item._id !== targetId
      )
    );
  }, []);

  /**
   * Clear all items from cart
   */
  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  /**
   * Retrieve current quantity of an item in cart
   */
  const getItemQuantity = useCallback(
    (itemOrId) => {
      if (!itemOrId) return 0;
      const targetId = typeof itemOrId === 'object'
        ? (itemOrId.id || itemOrId._id || itemOrId.itemId)
        : String(itemOrId).trim();
      const targetName = typeof itemOrId === 'object' ? itemOrId.name : null;

      const normalized = normalizeItemAtCartBoundary(itemOrId);
      const canonicalId = normalized ? normalized.itemId : null;

      const found = cartItems.find((entry) => {
        if (canonicalId && (entry.itemId === canonicalId || entry.id === canonicalId)) return true;
        if (targetId && (entry.itemId === targetId || entry.id === targetId || entry._id === targetId)) return true;
        if (targetName && entry.name && entry.name.toLowerCase() === targetName.toLowerCase()) return true;
        return false;
      });

      return found ? found.quantity : 0;
    },
    [cartItems]
  );

  const openCartDrawer = useCallback(() => setIsCartDrawerOpen(true), []);
  const closeCartDrawer = useCallback(() => setIsCartDrawerOpen(false), []);

  const value = useMemo(
    () => ({
      cartItems,
      enrichedCartItems,
      cartTotalCount,
      subtotal,
      addToCart,
      addItem: addToCart,
      updateQuantity,
      increaseQuantity,
      decreaseQuantity,
      removeFromCart,
      clearCart,
      getItemQuantity,
      isCartDrawerOpen,
      setIsCartDrawerOpen,
      openCartDrawer,
      closeCartDrawer,
    }),
    [
      cartItems,
      enrichedCartItems,
      cartTotalCount,
      subtotal,
      addToCart,
      updateQuantity,
      increaseQuantity,
      decreaseQuantity,
      removeFromCart,
      clearCart,
      getItemQuantity,
      isCartDrawerOpen,
      openCartDrawer,
      closeCartDrawer,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/**
 * useCart Custom Hook
 */
export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
