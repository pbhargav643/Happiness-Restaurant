import { api } from './api.js';

const TOKEN_KEY = 'happiness_admin_token';
const ADMIN_USER_KEY = 'happiness_admin_user';

/**
 * Frontend Admin Authentication API & Storage Layer
 *
 * Rules:
 * - Centralized API calls for authentication
 * - Never store plaintext password or passwordHash
 * - Safe browser storage wrapper (handles SSR / Node test environments safely)
 */

export const authStorage = {
  getToken() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(TOKEN_KEY) || null;
      }
    } catch {
      // Storage access blocked or unavailable
    }
    return null;
  },

  setToken(token) {
    try {
      if (typeof window !== 'undefined' && window.localStorage && token) {
        window.localStorage.setItem(TOKEN_KEY, token);
      }
    } catch {
      // Storage access blocked
    }
  },

  removeToken() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(TOKEN_KEY);
      }
    } catch {
      // Storage access blocked
    }
  },

  getAdmin() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(ADMIN_USER_KEY);
        return raw ? JSON.parse(raw) : null;
      }
    } catch {
      // Parse error or storage error
    }
    return null;
  },

  setAdmin(admin) {
    try {
      if (typeof window !== 'undefined' && window.localStorage && admin) {
        // Guarantee no sensitive fields are stored
        const safeAdmin = {
          id: admin.id || admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          isActive: admin.isActive,
        };
        window.localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(safeAdmin));
      }
    } catch {
      // Storage access blocked
    }
  },

  removeAdmin() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(ADMIN_USER_KEY);
      }
    } catch {
      // Storage access blocked
    }
  },

  clearAuth() {
    this.removeToken();
    this.removeAdmin();
  },
};

export const authApi = {
  /**
   * Log in admin with credentials
   *
   * @param {Object} credentials
   * @param {string} credentials.email
   * @param {string} credentials.password
   * @returns {Promise<{ token: string, admin: Object }>}
   */
  async loginAdmin(credentials) {
    const res = await api.post('/auth/login', credentials);
    if (res && res.token && res.admin) {
      authStorage.setToken(res.token);
      authStorage.setAdmin(res.admin);
    }
    return res;
  },

  /**
   * Fetch currently authenticated admin profile
   *
   * @returns {Promise<{ admin: Object }>}
   */
  async getCurrentAdmin() {
    const res = await api.get('/auth/me');
    if (res && res.admin) {
      authStorage.setAdmin(res.admin);
    }
    return res;
  },

  /**
   * Log out admin
   */
  async logoutAdmin() {
    try {
      await api.post('/auth/logout', {});
    } catch {
      // Even if network call fails, proceed with local cleanup
    } finally {
      authStorage.clearAuth();
    }
    return { success: true };
  },
};

export default authApi;
