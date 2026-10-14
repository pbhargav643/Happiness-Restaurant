import api from './api.js';

/**
 * Normalizes a table document from the API so that both `id` and `_id` are reliably accessible,
 * ensuring seamless compatibility with existing frontend components and test suites.
 */
export function normalizeTableDoc(t) {
  if (!t) return null;
  return {
    ...t,
    id: t._id || t.id,
    _id: t._id || t.id,
    tableNumber: t.tableNumber,
    name: t.name || '',
    capacity: Number(t.capacity) || 0,
    status: t.status || 'Active',
    isOccupied: Boolean(t.isOccupied),
    activeOrderId: t.activeOrderId || null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt || t.createdAt || new Date().toISOString(),
  };
}

/**
 * Admin Table Management API Client
 * Connects frontend UI to verified backend endpoints at /api/admin/tables
 */
export const adminTableApi = {
  /**
   * GET /api/admin/tables
   * Fetch all tables with metrics, search, status filtering, and sorting
   *
   * @param {Object} [params]
   * @param {string} [params.status] - 'ALL' | 'Active' | 'Inactive'
   * @param {string} [params.search] - Search string
   * @param {string} [params.sort] - 'default' | 'number-asc' | 'capacity-desc' | 'capacity-asc'
   */
  async getTables(params = {}) {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    if (params.search && params.search.trim()) query.append('search', params.search.trim());
    if (params.sort && params.sort !== 'default') query.append('sort', params.sort);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await api.get(`/admin/tables${queryString}`);
    const rawItems = Array.isArray(res?.data) ? res.data : [];
    const items = rawItems.map(normalizeTableDoc);

    const metrics = res?.metrics || {
      total: items.length,
      active: items.filter((t) => t.status === 'Active').length,
      inactive: items.filter((t) => t.status === 'Inactive').length,
      totalCapacity: items.reduce((sum, t) => sum + (Number(t.capacity) || 0), 0),
    };

    return {
      success: true,
      tables: items,
      metrics,
    };
  },

  /**
   * GET /api/admin/tables/:id
   * Fetch single table by ID
   */
  async getTable(id) {
    if (!id) throw new Error('Table ID is required');
    const res = await api.get(`/admin/tables/${id}`);
    return {
      success: true,
      table: normalizeTableDoc(res?.data),
    };
  },

  /**
   * POST /api/admin/tables
   * Create a new table
   */
  async createTable(payload) {
    const res = await api.post('/admin/tables', {
      tableNumber: payload.tableNumber?.trim(),
      name: payload.name ? payload.name.trim() : '',
      capacity: payload.capacity,
      status: payload.status || 'Active',
    });

    return {
      success: true,
      message: res?.message || `Table "${payload.tableNumber}" created successfully`,
      table: normalizeTableDoc(res?.data),
    };
  },

  /**
   * PATCH /api/admin/tables/:id
   * Update table details (tableNumber, name, capacity, status)
   */
  async updateTable(id, payload) {
    if (!id) throw new Error('Table ID is required');
    const body = {};
    if (payload.tableNumber !== undefined) body.tableNumber = payload.tableNumber.trim();
    if (payload.name !== undefined) body.name = payload.name.trim();
    if (payload.capacity !== undefined) body.capacity = payload.capacity;
    if (payload.status !== undefined) body.status = payload.status;

    const res = await api.patch(`/admin/tables/${id}`, body);

    return {
      success: true,
      message: res?.message || 'Table updated successfully',
      table: normalizeTableDoc(res?.data),
    };
  },

  /**
   * PATCH /api/admin/tables/:id/status
   * Toggle or update table status ('Active' or 'Inactive')
   */
  async updateTableStatus(id, status) {
    if (!id) throw new Error('Table ID is required');
    const res = await api.patch(`/admin/tables/${id}/status`, { status });

    return {
      success: true,
      message: res?.message || `Table status updated to ${status}`,
      table: normalizeTableDoc(res?.data),
    };
  },

  /**
   * DELETE /api/admin/tables/:id
   * Delete a table record
   */
  async deleteTable(id) {
    if (!id) throw new Error('Table ID is required');
    const res = await api.delete(`/admin/tables/${id}`);
    return {
      success: true,
      message: res?.message || 'Table deleted successfully',
    };
  },
};

export default adminTableApi;
