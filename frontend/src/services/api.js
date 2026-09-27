/**
 * Centralized API Client Module
 *
 * Requirements:
 * - Uses environment variable VITE_API_BASE_URL (default: http://localhost:5000/api)
 * - Native fetch implementation (no unnecessary external dependencies)
 * - Standardized request handler for GET, POST, PATCH
 * - Safe error handling: never exposes backend stack traces or internal DB errors to UI
 * - Handles timeouts, network failures, non-2xx responses, and malformed JSON
 */

export const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_API_BASE_URL) ||
  'http://localhost:5000/api';

const DEFAULT_TIMEOUT_MS = 25000;

/**
 * Standard Customer-Facing Error Normalizer
 */
export function normalizeApiError(error, response = null) {
  // If already a normalized API error, return as is
  if (error && error.isApiError) {
    return error;
  }

  const normalized = new Error();
  normalized.isApiError = true;

  // Network / Abort / Timeout errors
  if (error?.name === 'AbortError') {
    normalized.message = 'Connection timed out. Please check your internet connection and try again.';
    normalized.status = 408;
    return normalized;
  }

  if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError') || error?.name === 'TypeError') {
    normalized.message = 'Unable to reach the restaurant server. Please try again in a moment.';
    normalized.status = 0;
    return normalized;
  }

  // Response status-specific messages
  if (response) {
    normalized.status = response.status;
    if (response.status === 401) {
      normalized.isAuthError = true;
      normalized.message = error?.message || 'Your session has expired. Please log in again.';
      // Clear relevant credentials on 401 based on endpoint domain
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const respUrl = response?.url || '';
          const isCustomer = respUrl.includes('/customer') || respUrl.includes('/auth/customer');
          const isAuthSubmission = respUrl.includes('/auth/login') || respUrl.includes('/auth/register');

          // Do not treat failed login/registration attempts as expired sessions
          if (!isAuthSubmission) {
            if (isCustomer) {
              window.localStorage.removeItem('happiness_customer_token');
              window.localStorage.removeItem('happiness_customer_user');
              window.dispatchEvent(new CustomEvent('customer-session-expired'));
            } else {
              window.localStorage.removeItem('happiness_admin_token');
              window.localStorage.removeItem('happiness_admin_user');
              window.dispatchEvent(new CustomEvent('admin-session-expired'));
            }
          }
        }
      } catch {
        // Storage access blocked
      }
    } else if (response.status === 403) {
      normalized.isForbidden = true;
      normalized.message = error?.message || 'Access forbidden: Admin authorization required.';
    } else if (response.status === 404) {
      normalized.message = error?.message || 'Requested resource was not found.';
    } else if (response.status === 400) {
      normalized.message = error?.message || 'Invalid request. Please check your details and try again.';
    } else if (response.status === 409) {
      normalized.message = error?.message || 'Conflict detected. Please refresh and try again.';
    } else if (response.status >= 500) {
      normalized.message = 'Server is currently experiencing technical difficulties. Please try again shortly.';
    } else {
      normalized.message = error?.message || 'An unexpected error occurred. Please try again.';
    }
    return normalized;
  }


  normalized.message = error?.message || 'A network error occurred. Please try again.';
  normalized.status = 0;
  return normalized;
}

/**
 * Core Request Wrapper
 */
export async function apiRequest(endpoint, options = {}) {
  const { timeout = DEFAULT_TIMEOUT_MS, headers = {}, ...customOptions } = options;

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeout) : null;

  try {
    // Automatically attach role-appropriate JWT token if not explicitly provided
    let authHeader = headers.Authorization || headers.authorization;
    if (!authHeader && typeof window !== 'undefined' && window.localStorage) {
      const isCustomerTarget =
        endpoint.startsWith('/customer') ||
        endpoint.startsWith('customer') ||
        endpoint.startsWith('/auth/customer') ||
        endpoint.startsWith('auth/customer') ||
        endpoint.startsWith('/orders') ||
        endpoint.startsWith('orders');

      if (isCustomerTarget) {
        const customerToken = window.localStorage.getItem('happiness_customer_token');
        if (customerToken) {
          authHeader = `Bearer ${customerToken}`;
        }
      } else {
        // Admin endpoints: attach admin token if available
        const isAdminTarget =
          endpoint.startsWith('/admin') ||
          endpoint.startsWith('admin') ||
          endpoint.startsWith('/notifications') ||
          endpoint.startsWith('notifications') ||
          endpoint === '/auth/me' ||
          endpoint === 'auth/me' ||
          endpoint === '/auth/logout' ||
          endpoint === 'auth/logout';

        if (isAdminTarget) {
          const adminToken = window.localStorage.getItem('happiness_admin_token');
          if (adminToken) {
            authHeader = `Bearer ${adminToken}`;
          }
        }
      }
    }

    const isFormData = typeof FormData !== 'undefined' && customOptions.body instanceof FormData;

    const fetchOptions = {
      ...customOptions,
      headers: {
        'Accept': 'application/json',
        ...(customOptions.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...(authHeader ? { 'Authorization': authHeader } : {}),
        ...headers,
      },
      signal: controller ? controller.signal : undefined,
    };


    const response = await fetch(url, fetchOptions);

    if (timeoutId) clearTimeout(timeoutId);

    // Parse response body safely
    let data;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch (parseErr) {
        throw normalizeApiError(new Error('Malformed response received from server'), response);
      }
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const serverMessage = (typeof data === 'object' && data !== null && data.message) ? data.message : null;
      const errorToThrow = new Error(serverMessage || `Request failed with status ${response.status}`);
      errorToThrow.statusCode = response.status;
      errorToThrow.data = data;
      throw normalizeApiError(errorToThrow, response);
    }

    return data;
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    throw normalizeApiError(err);
  }
}

/**
 * Public HTTP Client Methods
 */
export const api = {
  get(endpoint, options = {}) {
    return apiRequest(endpoint, { ...options, method: 'GET' });
  },

  post(endpoint, body, options = {}) {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    return apiRequest(endpoint, {
      ...options,
      method: 'POST',
      body: isFormData ? body : (typeof body === 'string' ? body : JSON.stringify(body)),
    });
  },

  patch(endpoint, body, options = {}) {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    return apiRequest(endpoint, {
      ...options,
      method: 'PATCH',
      body: isFormData ? body : (typeof body === 'string' ? body : JSON.stringify(body)),
    });
  },

  upload(endpoint, formData, options = {}) {
    return apiRequest(endpoint, {
      ...options,
      method: 'POST',
      body: formData,
    });
  },

  delete(endpoint, options = {}) {
    return apiRequest(endpoint, { ...options, method: 'DELETE' });
  },

  /**
   * Safe Health Check

   * GET /api/health
   */
  async checkHealth() {
    try {
      const res = await api.get('/health', { timeout: 5000 });
      return {
        healthy: res?.success === true,
        message: res?.message || 'Restaurant API is running',
        data: res,
      };
    } catch (err) {
      return {
        healthy: false,
        message: err.message || 'API is currently unreachable',
        error: err,
      };
    }
  },
};

export default api;
