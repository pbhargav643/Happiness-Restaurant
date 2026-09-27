import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import settingsApi, { DEFAULT_FRONTEND_SETTINGS } from '../services/settingsApi.js';

const SettingsContext = createContext(null);

/**
 * SettingsProvider Component
 * Manages live operational settings from the backend API.
 * Falls back to DEFAULT_FRONTEND_SETTINGS if backend is unavailable.
 */
export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_FRONTEND_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [isBackendLive, setIsBackendLive] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await settingsApi.getSettings();
      if (data) {
        setSettings(data);
        setIsBackendLive(Boolean(data.fromBackend));
      }
    } catch (err) {
      console.warn('[SettingsContext] Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const value = useMemo(
    () => ({
      settings,
      loading,
      isBackendLive,
      refetch: fetchSettings,
    }),
    [settings, loading, isBackendLive, fetchSettings]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

export default SettingsContext;
