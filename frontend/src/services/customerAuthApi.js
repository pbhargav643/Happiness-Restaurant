import { api } from './api.js';

const CUSTOMER_TOKEN_KEY = 'happiness_customer_token';
const CUSTOMER_USER_KEY = 'happiness_customer_user';

/**
 * Frontend Customer Authentication API & Storage Layer
 *
 * Rules:
 * - Completely isolated from Admin authentication and storage keys
 * - Never stores plaintext password or passwordHash
 * - Safe browser storage wrapper (handles SSR / Node test environments safely)
 */

export const customerStorage = {
  getToken() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(CUSTOMER_TOKEN_KEY) || null;
      }
    } catch {
      // Storage access blocked or unavailable
    }
    return null;
  },

  setToken(token) {
    try {
      if (typeof window !== 'undefined' && window.localStorage && token) {
        window.localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
      }
    } catch {
      // Storage access blocked
    }
  },

  removeToken() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(CUSTOMER_TOKEN_KEY);
      }
    } catch {
      // Storage access blocked
    }
  },

  getCustomer() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(CUSTOMER_USER_KEY);
        return raw ? JSON.parse(raw) : null;
      }
    } catch {
      // Parse error or storage error
    }
    return null;
  },

  setCustomer(customer) {
    try {
      if (typeof window !== 'undefined' && window.localStorage && customer) {
        // Guarantee no sensitive fields are stored
        const safeCustomer = {
          id: customer.id || customer._id,
          name: customer.name,
          mobile: customer.mobile,
          email: customer.email,
          role: customer.role || 'CUSTOMER',
          isActive: customer.isActive !== false,
        };
        window.localStorage.setItem(CUSTOMER_USER_KEY, JSON.stringify(safeCustomer));
      }
    } catch {
      // Storage access blocked
    }
  },

  removeCustomer() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(CUSTOMER_USER_KEY);
      }
    } catch {
      // Storage access blocked
    }
  },

  clearAuth() {
    this.removeToken();
    this.removeCustomer();
  },
};

export const customerAuthApi = {
  /**
   * Register a new customer
   *
   * @param {Object} data
   * @param {string} data.name
   * @param {string} data.mobile
   * @param {string} [data.email]
   * @param {string} data.password
   * @returns {Promise<{ token: string, customer: Object }>}
   */
  async register(data) {
    const res = await api.post('/auth/customer/register', data);
    if (res && res.token && res.customer) {
      customerStorage.setToken(res.token);
      customerStorage.setCustomer(res.customer);
    }
    return res;
  },

  /**
   * Log in an existing customer
   *
   * @param {Object} credentials
   * @param {string} credentials.identifier
   * @param {string} credentials.password
   * @returns {Promise<{ token: string, customer: Object }>}
   */
  async login(credentials) {
    const res = await api.post('/auth/customer/login', credentials);
    if (res && res.token && res.customer) {
      customerStorage.setToken(res.token);
      customerStorage.setCustomer(res.customer);
    }
    return res;
  },

  /**
   * Fetch currently authenticated customer profile
   *
   * @param {string} [tokenOverride]
   * @returns {Promise<{ customer: Object }>}
   */
  async getCurrentCustomer(tokenOverride) {
    const token = tokenOverride || customerStorage.getToken();
    if (!token) {
      throw new Error('No customer authentication token found');
    }

    const res = await api.get('/auth/customer/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res && res.customer) {
      customerStorage.setCustomer(res.customer);
    }
    return res;
  },

  /**
   * Log out customer
   */
  async logout() {
    try {
      const token = customerStorage.getToken();
      if (token) {
        await api.post('/auth/customer/logout', {}, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch {
      // Even if network call fails, proceed with local cleanup
    } finally {
      customerStorage.clearAuth();
    }
    return { success: true };
  },

  /**
   * Request password reset instructions
   *
   * @param {Object} data
   * @param {string} data.identifier - Mobile or email
   * @returns {Promise<{ success: boolean, message: string, providerConfigured?: boolean }>}
   */
  async forgotPassword(data) {
    return api.post('/auth/customer/forgot-password', data);
  },
};

export default customerAuthApi;
