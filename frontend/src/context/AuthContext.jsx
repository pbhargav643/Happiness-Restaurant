import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authApi, authStorage } from '../services/authApi.js';

const AuthContext = createContext(null);

/**
 * AuthProvider Component
 *
 * Manages authenticated Admin state for Happiness Restaurant Admin Portal.
 *
 * Security & Reliability:
 * - Never stores plaintext passwords
 * - Centralizes login, logout, and token verification
 * - Listens for 401 session expiration events
 * - Prevents protected admin content flash during auth loading
 */
export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => authStorage.getToken());
  const [admin, setAdmin] = useState(() => authStorage.getAdmin());
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Validate existing token on mount
  useEffect(() => {
    let isMounted = true;

    async function verifyExistingSession() {
      const storedToken = authStorage.getToken();
      if (!storedToken) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      try {
        const res = await authApi.getCurrentAdmin();
        if (isMounted && res && res.admin) {
          setAdmin(res.admin);
          setToken(storedToken);
        }
      } catch (err) {
        if (isMounted) {
          // Token invalid or expired
          authStorage.clearAuth();
          setToken(null);
          setAdmin(null);
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

  // Listen for global session expiration events emitted by apiRequest
  useEffect(() => {
    function handleSessionExpired() {
      setToken(null);
      setAdmin(null);
      setSessionExpired(true);
    }

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('admin-session-expired', handleSessionExpired);
      return () => {
        window.removeEventListener('admin-session-expired', handleSessionExpired);
      };
    }
  }, []);

  const login = useCallback(async ({ email, password }) => {
    setSessionExpired(false);
    const res = await authApi.loginAdmin({ email, password });
    if (res && res.token && res.admin) {
      setToken(res.token);
      setAdmin(res.admin);
      return res;
    }
    throw new Error('Authentication response incomplete');
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logoutAdmin();
    } finally {
      setToken(null);
      setAdmin(null);
      setSessionExpired(false);
    }
  }, []);

  const clearExpiredNotice = useCallback(() => {
    setSessionExpired(false);
  }, []);

  const isAuthenticated = Boolean(token && admin && admin.role === 'ADMIN');

  const value = useMemo(
    () => ({
      admin,
      token,
      isAuthenticated,
      loading,
      sessionExpired,
      login,
      logout,
      clearExpiredNotice,
    }),
    [admin, token, isAuthenticated, loading, sessionExpired, login, logout, clearExpiredNotice]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
