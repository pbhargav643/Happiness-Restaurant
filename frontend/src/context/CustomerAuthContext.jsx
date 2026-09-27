import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { customerAuthApi, customerStorage } from '../services/customerAuthApi.js';

const CustomerAuthContext = createContext(null);

/**
 * CustomerAuthProvider Component
 *
 * Manages authenticated Customer state for Happiness Restaurant.
 *
 * Security & Reliability:
 * - Completely isolated from Admin authentication state
 * - Never stores plaintext passwords
 * - Centralizes registration, login, logout, and token verification
 * - Listens for 401 session expiration
 * - Prevents protected customer content flash during auth loading
 */
export function CustomerAuthProvider({ children }) {
  const [token, setToken] = useState(() => customerStorage.getToken());
  const [customer, setCustomer] = useState(() => customerStorage.getCustomer());
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Validate existing token on mount
  useEffect(() => {
    let isMounted = true;

    async function verifyExistingSession() {
      const storedToken = customerStorage.getToken();
      if (!storedToken) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      try {
        const res = await customerAuthApi.getCurrentCustomer(storedToken);
        if (isMounted && res && res.customer) {
          setCustomer(res.customer);
          setToken(storedToken);
        }
      } catch (err) {
        if (isMounted) {
          // Token invalid or expired
          customerStorage.clearAuth();
          setToken(null);
          setCustomer(null);
          if (err?.status === 401 || err?.isAuthError) {
            setSessionExpired(true);
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    verifyExistingSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // Listen for customer session expiration events
  useEffect(() => {
    function handleSessionExpired() {
      setToken(null);
      setCustomer(null);
      setSessionExpired(true);
    }

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('customer-session-expired', handleSessionExpired);
      return () => {
        window.removeEventListener('customer-session-expired', handleSessionExpired);
      };
    }
  }, []);

  const login = useCallback(async ({ identifier, mobile, email, password }) => {
    setSessionExpired(false);
    const res = await customerAuthApi.login({ identifier, mobile, email, password });
    if (res && res.token && res.customer) {
      setToken(res.token);
      setCustomer(res.customer);
      return res;
    }
    throw new Error('Authentication response incomplete');
  }, []);

  const register = useCallback(async ({ name, mobile, email, password }) => {
    setSessionExpired(false);
    const res = await customerAuthApi.register({ name, mobile, email, password });
    if (res && res.token && res.customer) {
      setToken(res.token);
      setCustomer(res.customer);
      return res;
    }
    throw new Error('Registration response incomplete');
  }, []);

  const logout = useCallback(async () => {
    try {
      await customerAuthApi.logout();
    } finally {
      setToken(null);
      setCustomer(null);
      setSessionExpired(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const res = await customerAuthApi.getCurrentCustomer();
      if (res && res.customer) {
        setCustomer(res.customer);
      }
      return res;
    } catch (err) {
      if (err?.status === 401) {
        logout();
      }
      throw err;
    }
  }, [logout]);

  const clearExpiredNotice = useCallback(() => {
    setSessionExpired(false);
  }, []);

  const isAuthenticated = Boolean(token && customer && customer.role === 'CUSTOMER');

  const value = useMemo(
    () => ({
      customer,
      token,
      isAuthenticated,
      loading,
      sessionExpired,
      login,
      register,
      logout,
      refreshProfile,
      clearExpiredNotice,
    }),
    [customer, token, isAuthenticated, loading, sessionExpired, login, register, logout, refreshProfile, clearExpiredNotice]
  );

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
}

export default CustomerAuthContext;
