import api from './api.js';
import { normalizeTableDoc } from './adminTableApi.js';

/**
 * Public Customer Table API Client
 * Connects frontend customer dine-in flow to backend /api/tables/:id
 */
export const tableApi = {
  /**
   * Look up a dining table by ID or table number
   * GET /api/tables/:id
   *
   * @param {string} identifier - MongoDB _id, normalized number, or tableNumber
   * @returns {Promise<Object|null>} Normalized table object or null if not found
   */
  async getTable(identifier) {
    if (!identifier) return null;
    const clean = String(identifier).trim();
    if (!clean) return null;

    try {
      const res = await api.get(`/tables/${encodeURIComponent(clean)}`);
      if (res && res.success && res.data) {
        return normalizeTableDoc(res.data);
      }
      return null;
    } catch {
      // 404, network error, or invalid table identifier
      return null;
    }
  },
};

export default tableApi;
