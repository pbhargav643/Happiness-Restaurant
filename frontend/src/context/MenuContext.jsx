import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import menuApi from '../services/menuApi.js';
import { MENU_ITEMS } from '../data/menuData.js';

const MenuContext = createContext(null);

/**
 * MenuProvider Component
 * Manages live menu items state from the backend API.
 * Provides fallback to verified menuData when offline or loading.
 */
export function MenuProvider({ children }) {
  const [items, setItems] = useState(() => MENU_ITEMS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isBackendLive, setIsBackendLive] = useState(false);

  const fetchMenu = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await menuApi.getMenu({ limit: 200, includeUnavailable: true });

      if (result && Array.isArray(result.items) && result.items.length > 0) {
        setItems(result.items);
        setIsBackendLive(Boolean(result.fromBackend));
      } else {
        // Safe fallback to verified MENU_ITEMS ensuring customer menu never displays 0 dishes
        setItems(MENU_ITEMS);
        setIsBackendLive(false);
        if (result?.error) {
          setError('Menu is temporarily unavailable. Please try again.');
        }
      }
    } catch (err) {
      console.warn('[MenuContext] Error fetching menu:', err);
      setError('Menu is temporarily unavailable. Please try again.');
      setIsBackendLive(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  // Fast item lookup map
  const itemsMap = useMemo(() => {
    const map = new Map();
    items.forEach((item) => {
      if (item.id) map.set(String(item.id).toLowerCase(), item);
      if (item._id) map.set(String(item._id).toLowerCase(), item);
      if (item.slug) map.set(String(item.slug).toLowerCase(), item);
    });
    return map;
  }, [items]);

  const getItem = useCallback(
    (idOrSlug) => {
      if (!idOrSlug) return null;
      const key = String(idOrSlug).toLowerCase();
      return itemsMap.get(key) || null;
    },
    [itemsMap]
  );

  const value = useMemo(
    () => ({
      items,
      loading,
      error,
      isBackendLive,
      refetch: fetchMenu,
      getItem,
    }),
    [items, loading, error, isBackendLive, fetchMenu, getItem]
  );

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
}

export function useMenu() {
  const context = useContext(MenuContext);
  if (!context) {
    throw new Error('useMenu must be used within a MenuProvider');
  }
  return context;
}

export default MenuContext;
