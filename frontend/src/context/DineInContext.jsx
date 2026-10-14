import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  normalizeItemAtCartBoundary,
  findMockTable,
  getTableKey,
} from '../utils/tableUtils.js';

export { findMockTable, getTableKey };

const DINE_IN_TABLE_STORAGE_KEY = 'happiness_dine_in_table';
const DINE_IN_CARTS_BY_TABLE_KEY = 'happiness_dine_in_table_carts';
const DINE_IN_INSTRUCTIONS_BY_TABLE_KEY = 'happiness_dine_in_table_instructions';
const DINE_IN_ACTIVE_CART_MIRROR_KEY = 'happiness_dine_in_cart';

const DineInContext = createContext(null);


/**
 * DineInProvider
 * Manages customer dine-in ordering state independently from Parcel Pickup:
 * - Active dining table metadata (table number, name, capacity)
 * - Isolated per-table cart storage (switching tables cannot silently carry cart items)
 * - Strictly isolated from Parcel Pickup cart storage
 * - Real-time subtotal and item count calculations using authoritative menu pricing
 * - Per-table special cooking instructions
 */
export function DineInProvider({ children }) {
  // 1. Active Table State
  const [dineInTable, setDineInTableState] = useState(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(DINE_IN_TABLE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && (parsed.tableNumber || parsed.id)) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return null;
  });

  // 2. Per-Table Carts Dictionary: { [tableKey]: [items] }
  // Ensures switching between tables cannot silently carry an earlier table's cart into a different session
  const [tableCarts, setTableCarts] = useState(() => {
    if (typeof window === 'undefined') return {};
    try {
      const stored = localStorage.getItem(DINE_IN_CARTS_BY_TABLE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return {};
  });

  // 3. Per-Table Special Instructions: { [tableKey]: string }
  const [tableInstructions, setTableInstructions] = useState(() => {
    if (typeof window === 'undefined') return {};
    try {
      const stored = localStorage.getItem(DINE_IN_INSTRUCTIONS_BY_TABLE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return {};
  });

  // Active table key
  const activeTableKey = useMemo(() => getTableKey(dineInTable), [dineInTable]);

  // Active raw cart items for the currently selected table only: tableCarts[tableKey] / tableCarts[activeTableKey]
  const currentTableRawItems = useMemo(() => {
    if (!activeTableKey) return [];
    const items = tableCarts[activeTableKey];
    return Array.isArray(items) ? items : [];
  }, [tableCarts, activeTableKey]);

  // Active special instructions for the currently selected table
  const specialInstructions = useMemo(() => {
    if (!activeTableKey) return '';
    return tableInstructions[activeTableKey] || '';
  }, [tableInstructions, activeTableKey]);

  // Sync active table to localStorage
  useEffect(() => {
    try {
      if (dineInTable) {
        localStorage.setItem(DINE_IN_TABLE_STORAGE_KEY, JSON.stringify(dineInTable));
      } else {
        localStorage.removeItem(DINE_IN_TABLE_STORAGE_KEY);
      }
    } catch (e) {
      console.warn('Unable to persist dineInTable:', e);
    }
  }, [dineInTable]);

  // Sync per-table carts dictionary to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(DINE_IN_CARTS_BY_TABLE_KEY, JSON.stringify(tableCarts));
      // Mirror active cart to happiness_dine_in_cart for backward compatibility
      if (activeTableKey && tableCarts[activeTableKey]) {
        localStorage.setItem(
          DINE_IN_ACTIVE_CART_MIRROR_KEY,
          JSON.stringify(tableCarts[activeTableKey])
        );
      } else {
        localStorage.removeItem(DINE_IN_ACTIVE_CART_MIRROR_KEY);
      }
    } catch (e) {
      console.warn('Unable to persist tableCarts:', e);
    }
  }, [tableCarts, activeTableKey]);

  // Sync per-table instructions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        DINE_IN_INSTRUCTIONS_BY_TABLE_KEY,
        JSON.stringify(tableInstructions)
      );
    } catch (e) {
      console.warn('Unable to persist tableInstructions:', e);
    }
  }, [tableInstructions]);

  // Hydrated Cart Items for the currently selected table
  // Re-validates every item against centralized menu catalog
  const enrichedDineInItems = useMemo(() => {
    return currentTableRawItems
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const target = entry.itemId || entry.id || entry;
        const menuItem = normalizeItemAtCartBoundary(target);
        if (!menuItem) return null;

        const safeQty = Math.max(1, Math.floor(entry.quantity) || 1);
        const price = Number(menuItem.price) || 0;
        const itemTotal = price * safeQty;

        return {
          ...menuItem,
          id: menuItem.id || entry.id || entry.itemId,
          itemId: menuItem.id || entry.id || entry.itemId,
          _id: entry._id || menuItem._id || menuItem.id,
          quantity: safeQty,
          itemTotal,
        };
      })
      .filter(Boolean);
  }, [currentTableRawItems]);

  // Total quantity count for active dine-in table cart
  const dineInTotalCount = useMemo(() => {
    return enrichedDineInItems.reduce((acc, item) => acc + item.quantity, 0);
  }, [enrichedDineInItems]);

  // Subtotal for active dine-in table cart (strictly matches menu prices)
  const dineInSubtotal = useMemo(() => {
    return enrichedDineInItems.reduce((acc, item) => acc + item.itemTotal, 0);
  }, [enrichedDineInItems]);

  // Table Setter: sets table and switches active cart scope
  const setTable = useCallback((table) => {
    setDineInTableState(table);
  }, []);

  // Table Clear
  const clearTable = useCallback(() => {
    setDineInTableState(null);
  }, []);

  // Add item to active Dine-In Table Cart
  // Strictly rejects invalid or unavailable items
  const addToDineInCart = useCallback(
    (itemOrId, quantityToAdd = 1) => {
      if (!itemOrId || !dineInTable) {
        console.warn('[DineInContext] addToDineInCart rejected: missing item or active table.');
        return false;
      }
      if (dineInTable.status && dineInTable.status !== 'Active') {
        console.warn('[DineInContext] addToDineInCart rejected: table is inactive.');
        return false;
      }

      const menuItem = normalizeItemAtCartBoundary(itemOrId);
      if (!menuItem) {
        console.warn('[DineInContext] Rejected invalid item not found in menu catalog:', itemOrId);
        return false;
      }
      if (menuItem.available === false) {
        console.warn('[DineInContext] Cannot add unavailable item to table cart:', menuItem.name);
        return false;
      }

      const targetKey = menuItem.itemId || menuItem.id;
      const tableKey = getTableKey(dineInTable);
      if (!tableKey) return false;

      const qty = Math.max(1, Math.floor(Number(quantityToAdd)) || 1);

      setTableCarts((prev) => {
        const currentList = prev[tableKey] || [];
        const existingIndex = currentList.findIndex((entry) => {
          if (entry.itemId && entry.itemId === targetKey) return true;
          if (entry.id && entry.id === targetKey) return true;
          if (menuItem._id && entry._id && entry._id === menuItem._id) return true;
          if (entry.name && menuItem.name && entry.name.toLowerCase() === menuItem.name.toLowerCase()) return true;
          return false;
        });

        let updatedList;
        if (existingIndex > -1) {
          updatedList = [...currentList];
          updatedList[existingIndex] = {
            ...updatedList[existingIndex],
            quantity: updatedList[existingIndex].quantity + qty,
          };
        } else {
          updatedList = [
            ...currentList,
            {
              itemId: targetKey,
              id: targetKey,
              _id: menuItem._id || targetKey,
              name: menuItem.name,
              price: menuItem.price,
              image: menuItem.image,
              category: menuItem.category,
              categoryName: menuItem.categoryName,
              isVeg: menuItem.isVeg,
              quantity: qty,
            },
          ];
        }

        return { ...prev, [tableKey]: updatedList };
      });

      return true;
    },
    [dineInTable]
  );

  // Update quantity in active table cart
  const updateDineInQuantity = useCallback(
    (itemOrId, newQuantity) => {
      if (!dineInTable) return;
      const targetId = typeof itemOrId === 'object'
        ? (itemOrId.id || itemOrId._id || itemOrId.itemId)
        : String(itemOrId).trim();
      const normalized = normalizeItemAtCartBoundary(itemOrId);
      const canonicalId = normalized ? normalized.itemId : targetId;
      const tableKey = getTableKey(dineInTable);
      if (!tableKey) return;

      const qty = Math.floor(Number(newQuantity));

      setTableCarts((prev) => {
        const currentList = prev[tableKey] || [];
        let updatedList;
        if (isNaN(qty) || qty <= 0) {
          // Decreasing to 0 removes the item
          updatedList = currentList.filter(
            (item) => item.itemId !== canonicalId && item.id !== canonicalId && item._id !== targetId
          );
        } else {
          updatedList = currentList.map((item) =>
            item.itemId === canonicalId || item.id === canonicalId || item._id === targetId
              ? { ...item, quantity: qty }
              : item
          );
        }
        return { ...prev, [tableKey]: updatedList };
      });
    },
    [dineInTable]
  );

  // Remove item from active table cart
  const removeFromDineInCart = useCallback(
    (itemOrId) => {
      if (!dineInTable) return;
      const targetId = typeof itemOrId === 'object'
        ? (itemOrId.id || itemOrId._id || itemOrId.itemId)
        : String(itemOrId).trim();
      const normalized = normalizeItemAtCartBoundary(itemOrId);
      const canonicalId = normalized ? normalized.itemId : targetId;
      const tableKey = getTableKey(dineInTable);
      if (!tableKey) return;

      setTableCarts((prev) => {
        const currentList = prev[tableKey] || [];
        const updatedList = currentList.filter(
          (item) => item.itemId !== canonicalId && item.id !== canonicalId && item._id !== targetId
        );
        return { ...prev, [tableKey]: updatedList };
      });
    },
    [dineInTable]
  );

  // Clear active table cart
  const clearDineInCart = useCallback(() => {
    if (!dineInTable) return;
    const tableKey = getTableKey(dineInTable);
    if (!tableKey) return;

    setTableCarts((prev) => ({
      ...prev,
      [tableKey]: [],
    }));
  }, [dineInTable]);

  // Set special cooking instructions for active table
  const setSpecialInstructions = useCallback(
    (text) => {
      if (!dineInTable) return;
      const tableKey = getTableKey(dineInTable);
      if (!tableKey) return;

      setTableInstructions((prev) => ({
        ...prev,
        [tableKey]: text || '',
      }));
    },
    [dineInTable]
  );

  // Full Session Reset
  const clearDineInSession = useCallback(() => {
    setDineInTableState(null);
    setTableCarts({});
    setTableInstructions({});
    try {
      localStorage.removeItem(DINE_IN_TABLE_STORAGE_KEY);
      localStorage.removeItem(DINE_IN_CARTS_BY_TABLE_KEY);
      localStorage.removeItem(DINE_IN_INSTRUCTIONS_BY_TABLE_KEY);
      localStorage.removeItem(DINE_IN_ACTIVE_CART_MIRROR_KEY);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo(
    () => ({
      dineInTable,
      isDineInActive: Boolean(dineInTable),
      dineInCart: enrichedDineInItems,
      dineInTotalCount,
      dineInSubtotal,
      specialInstructions,
      setTable,
      clearTable,
      addToDineInCart,
      updateDineInQuantity,
      removeFromDineInCart,
      clearDineInCart,
      setSpecialInstructions,
      clearDineInSession,
      getTableKey,
    }),
    [
      dineInTable,
      enrichedDineInItems,
      dineInTotalCount,
      dineInSubtotal,
      specialInstructions,
      setTable,
      clearTable,
      addToDineInCart,
      updateDineInQuantity,
      removeFromDineInCart,
      clearDineInCart,
      setSpecialInstructions,
      clearDineInSession,
    ]
  );

  return <DineInContext.Provider value={value}>{children}</DineInContext.Provider>;
}

/**
 * Custom Hook for Dine-in Context
 */
export function useDineIn() {
  const context = useContext(DineInContext);
  if (!context) {
    throw new Error('useDineIn must be used within a DineInProvider');
  }
  return context;
}
