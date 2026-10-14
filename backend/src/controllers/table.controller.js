import tableService from '../services/table.service.js';

export const tableController = {
  /**
   * GET /api/admin/tables
   * Retrieve all tables with metrics, search, and sorting
   */
  async getTables(req, res, next) {
    try {
      const { status, search, sort } = req.query;
      const result = await tableService.getAllTables({ status, search, sort });

      return res.status(200).json({
        success: true,
        message: 'Tables retrieved successfully',
        data: result.items,
        metrics: result.metrics,
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  },

  /**
   * GET /api/admin/tables/:id
   * Retrieve a single table by ID
   */
  async getTable(req, res, next) {
    try {
      const { id } = req.params;
      const table = await tableService.getTableById(id);

      if (!table) {
        return res.status(404).json({
          success: false,
          message: 'Table not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: table,
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  },

  /**
   * POST /api/admin/tables
   * Create a new table
   */
  async createTable(req, res, next) {
    try {
      const table = await tableService.createTable(req.body);

      return res.status(201).json({
        success: true,
        message: `Table "${table.tableNumber}" created successfully`,
        data: table,
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      // Handle Mongoose duplicate key error (code 11000)
      if (error.code === 11000) {
        const inputNum = req.body?.tableNumber || 'specified';
        return res.status(409).json({
          success: false,
          message: `Table number "${inputNum}" already exists. Please enter a unique table number.`,
        });
      }
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors || {}).map((e) => e.message);
        return res.status(400).json({
          success: false,
          message: errors.join(', ') || error.message,
        });
      }
      next(error);
    }
  },

  /**
   * PATCH /api/admin/tables/:id
   * Update table details (number, name, capacity, status)
   */
  async updateTable(req, res, next) {
    try {
      const { id } = req.params;
      const updated = await tableService.updateTable(id, req.body);

      return res.status(200).json({
        success: true,
        message: `Table "${updated.tableNumber}" updated successfully`,
        data: updated,
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      if (error.code === 11000) {
        const inputNum = req.body?.tableNumber || 'specified';
        return res.status(409).json({
          success: false,
          message: `Table number "${inputNum}" already exists. Please enter a unique table number.`,
        });
      }
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors || {}).map((e) => e.message);
        return res.status(400).json({
          success: false,
          message: errors.join(', ') || error.message,
        });
      }
      next(error);
    }
  },

  /**
   * PATCH /api/admin/tables/:id/status
   * Toggle or update table status ('Active' or 'Inactive')
   */
  async updateTableStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body || {};

      const updated = await tableService.updateTableStatus(id, status);

      return res.status(200).json({
        success: true,
        message: `Table "${updated.tableNumber}" is now ${updated.status}`,
        data: updated,
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors || {}).map((e) => e.message);
        return res.status(400).json({
          success: false,
          message: errors.join(', ') || error.message,
        });
      }
      next(error);
    }
  },

  /**
   * DELETE /api/admin/tables/:id
   * Delete a table record
   */
  async deleteTable(req, res, next) {
    try {
      const { id } = req.params;
      const result = await tableService.deleteTable(id);

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  },
};

export default tableController;
