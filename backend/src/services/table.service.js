import mongoose from 'mongoose';
import Table, { getNormalizedTableKey } from '../models/Table.js';
import Order from '../models/Order.js';

// Baseline tables for offline or test environments
const INITIAL_BASELINE_TABLES = [
  {
    _id: '507f1f77bcf86cd799439001',
    tableNumber: 'Table 1',
    normalizedNumber: '1',
    name: 'Window Bay',
    capacity: 4,
    status: 'Active',
    isOccupied: false,
    activeOrderId: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
  {
    _id: '507f1f77bcf86cd799439002',
    tableNumber: 'Table 2',
    normalizedNumber: '2',
    name: 'Garden Alcove',
    capacity: 2,
    status: 'Active',
    isOccupied: false,
    activeOrderId: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
  {
    _id: '507f1f77bcf86cd799439003',
    tableNumber: 'Table 3',
    normalizedNumber: '3',
    name: 'Family Central',
    capacity: 6,
    status: 'Active',
    isOccupied: false,
    activeOrderId: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
  {
    _id: '507f1f77bcf86cd799439004',
    tableNumber: 'Table 4',
    normalizedNumber: '4',
    name: 'Terrace Corner',
    capacity: 4,
    status: 'Inactive',
    isOccupied: false,
    activeOrderId: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
  {
    _id: '507f1f77bcf86cd799439005',
    tableNumber: 'Table 5',
    normalizedNumber: '5',
    name: 'Corner Booth',
    capacity: 4,
    status: 'Active',
    isOccupied: false,
    activeOrderId: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
];

let inMemoryTables = INITIAL_BASELINE_TABLES.map((t) => ({ ...t }));

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

export const tableService = {
  /**
   * List all restaurant tables with optional status filtering, search, and reactive summary metrics
   */
  async getAllTables(options = {}) {
    const { status, search, sort = 'default' } = options;

    if (isDbConnected()) {
      const query = {};

      // 1. Status Filter
      if (status && status !== 'ALL') {
        const cleanStatus = status.trim();
        if (['Active', 'Inactive'].includes(cleanStatus)) {
          query.status = cleanStatus;
        }
      }

      // 2. Search Query (tableNumber or name)
      if (search && typeof search === 'string' && search.trim()) {
        const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const searchRegex = new RegExp(escaped, 'i');
        query.$or = [{ tableNumber: searchRegex }, { name: searchRegex }];
      }

      // Determine Sorting
      let sortOptions = { createdAt: -1 };
      if (sort === 'number-asc') {
        sortOptions = { normalizedNumber: 1 };
      } else if (sort === 'capacity-desc') {
        sortOptions = { capacity: -1 };
      } else if (sort === 'capacity-asc') {
        sortOptions = { capacity: 1 };
      }

      const [items, allTables] = await Promise.all([
        Table.find(query).sort(sortOptions).select('-__v').lean(),
        Table.find({}).select('status capacity').lean(),
      ]);

      const total = allTables.length;
      const active = allTables.filter((t) => t.status === 'Active').length;
      const inactive = total - active;
      const totalCapacity = allTables.reduce((sum, t) => sum + (Number(t.capacity) || 0), 0);

      return {
        items,
        metrics: {
          total,
          active,
          inactive,
          totalCapacity,
        },
      };
    }

    // --- In-Memory Fallback (Offline / Test Mode) ---
    let filtered = [...inMemoryTables];

    if (status && status !== 'ALL') {
      const cleanStatus = status.trim();
      if (['Active', 'Inactive'].includes(cleanStatus)) {
        filtered = filtered.filter((t) => t.status === cleanStatus);
      }
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.tableNumber.toLowerCase().includes(q) ||
          (t.name && t.name.toLowerCase().includes(q))
      );
    }

    if (sort === 'number-asc') {
      filtered.sort((a, b) => a.normalizedNumber.localeCompare(b.normalizedNumber, undefined, { numeric: true }));
    } else if (sort === 'capacity-desc') {
      filtered.sort((a, b) => b.capacity - a.capacity);
    } else if (sort === 'capacity-asc') {
      filtered.sort((a, b) => a.capacity - b.capacity);
    } else {
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const total = inMemoryTables.length;
    const active = inMemoryTables.filter((t) => t.status === 'Active').length;
    const inactive = total - active;
    const totalCapacity = inMemoryTables.reduce((sum, t) => sum + (Number(t.capacity) || 0), 0);

    return {
      items: filtered,
      metrics: {
        total,
        active,
        inactive,
        totalCapacity,
      },
    };
  },

  /**
   * Retrieve a single table by MongoDB _id or normalized table number
   */
  async getTableById(identifier) {
    if (!identifier || typeof identifier !== 'string') return null;
    const clean = identifier.trim();

    if (isDbConnected()) {
      if (mongoose.isValidObjectId(clean)) {
        const byId = await Table.findById(clean).select('-__v').lean();
        if (byId) return byId;
      }

      const normalized = getNormalizedTableKey(clean);
      if (normalized) {
        const byNormalized = await Table.findOne({ normalizedNumber: normalized })
          .select('-__v')
          .lean();
        if (byNormalized) return byNormalized;
      }

      return Table.findOne({ tableNumber: clean }).select('-__v').lean();
    }

    // In-memory lookup
    if (mongoose.isValidObjectId(clean)) {
      const byId = inMemoryTables.find((t) => String(t._id) === clean);
      if (byId) return { ...byId };
    }

    const normalized = getNormalizedTableKey(clean);
    if (normalized) {
      const byNormalized = inMemoryTables.find((t) => t.normalizedNumber === normalized);
      if (byNormalized) return { ...byNormalized };
    }

    const byNumber = inMemoryTables.find((t) => t.tableNumber.toLowerCase() === clean.toLowerCase());
    return byNumber ? { ...byNumber } : null;
  },

  /**
   * Create a new dining table with duplicate validation
   */
  async createTable(payload) {
    const { tableNumber, name = '', capacity, status = 'Active' } = payload || {};

    // 1. Table Number Validation
    if (!tableNumber || typeof tableNumber !== 'string' || !tableNumber.trim()) {
      const err = new Error('Table number is required and cannot be empty');
      err.statusCode = 400;
      throw err;
    }

    const trimmedNumber = tableNumber.trim();
    if (trimmedNumber.length > 30) {
      const err = new Error('Table number cannot exceed 30 characters');
      err.statusCode = 400;
      throw err;
    }

    // 2. Capacity Validation
    const parsedCapacity = Number(capacity);
    if (!capacity || isNaN(parsedCapacity) || !Number.isInteger(parsedCapacity) || parsedCapacity < 1) {
      const err = new Error('Seating capacity must be a positive whole integer (minimum 1)');
      err.statusCode = 400;
      throw err;
    }
    if (parsedCapacity > 50) {
      const err = new Error('Maximum seating capacity per table is 50 seats');
      err.statusCode = 400;
      throw err;
    }

    // 3. Status Validation
    const cleanStatus = status ? status.trim() : 'Active';
    if (!['Active', 'Inactive'].includes(cleanStatus)) {
      const err = new Error('Status must be either "Active" or "Inactive"');
      err.statusCode = 400;
      throw err;
    }

    const normalized = getNormalizedTableKey(trimmedNumber);

    if (isDbConnected()) {
      const existing = await Table.findOne({ normalizedNumber: normalized });
      if (existing) {
        const err = new Error(
          `Table number "${trimmedNumber}" already exists. Please enter a unique table number.`
        );
        err.statusCode = 409;
        throw err;
      }

      const newTable = new Table({
        tableNumber: trimmedNumber,
        normalizedNumber: normalized,
        name: typeof name === 'string' ? name.trim() : '',
        capacity: parsedCapacity,
        status: cleanStatus,
        isOccupied: false,
        activeOrderId: null,
      });

      return await newTable.save();
    }

    // In-Memory Fallback
    const existing = inMemoryTables.find((t) => t.normalizedNumber === normalized);
    if (existing) {
      const err = new Error(
        `Table number "${trimmedNumber}" already exists. Please enter a unique table number.`
      );
      err.statusCode = 409;
      throw err;
    }

    const newTableDoc = {
      _id: new mongoose.Types.ObjectId().toString(),
      tableNumber: trimmedNumber,
      normalizedNumber: normalized,
      name: typeof name === 'string' ? name.trim() : '',
      capacity: parsedCapacity,
      status: cleanStatus,
      isOccupied: false,
      activeOrderId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    inMemoryTables.push(newTableDoc);
    return newTableDoc;
  },

  /**
   * Update table details (Affects only selected table)
   */
  async updateTable(id, payload) {
    if (!id || !mongoose.isValidObjectId(id)) {
      const err = new Error('Invalid table ID format');
      err.statusCode = 400;
      throw err;
    }

    const { tableNumber, name, capacity, status } = payload || {};

    if (isDbConnected()) {
      const table = await Table.findById(id);
      if (!table) {
        const err = new Error('Table not found');
        err.statusCode = 404;
        throw err;
      }

      if (tableNumber !== undefined) {
        if (typeof tableNumber !== 'string' || !tableNumber.trim()) {
          const err = new Error('Table number cannot be empty');
          err.statusCode = 400;
          throw err;
        }
        const trimmedNumber = tableNumber.trim();
        const normalized = getNormalizedTableKey(trimmedNumber);

        const duplicate = await Table.findOne({
          normalizedNumber: normalized,
          _id: { $ne: table._id },
        });
        if (duplicate) {
          const err = new Error(
            `Table number "${trimmedNumber}" already exists. Please enter a unique table number.`
          );
          err.statusCode = 409;
          throw err;
        }

        table.tableNumber = trimmedNumber;
        table.normalizedNumber = normalized;
      }

      if (capacity !== undefined) {
        const parsedCapacity = Number(capacity);
        if (isNaN(parsedCapacity) || !Number.isInteger(parsedCapacity) || parsedCapacity < 1) {
          const err = new Error('Seating capacity must be a positive whole integer (minimum 1)');
          err.statusCode = 400;
          throw err;
        }
        if (parsedCapacity > 50) {
          const err = new Error('Maximum seating capacity per table is 50 seats');
          err.statusCode = 400;
          throw err;
        }
        table.capacity = parsedCapacity;
      }

      if (name !== undefined) {
        table.name = typeof name === 'string' ? name.trim() : '';
      }

      if (status !== undefined) {
        const cleanStatus = String(status).trim();
        if (!['Active', 'Inactive'].includes(cleanStatus)) {
          const err = new Error('Status must be either "Active" or "Inactive"');
          err.statusCode = 400;
          throw err;
        }
        table.status = cleanStatus;
      }

      return await table.save();
    }

    // In-Memory Fallback
    const tableIndex = inMemoryTables.findIndex((t) => String(t._id) === String(id));
    if (tableIndex === -1) {
      const err = new Error('Table not found');
      err.statusCode = 404;
      throw err;
    }

    const table = inMemoryTables[tableIndex];

    if (tableNumber !== undefined) {
      if (typeof tableNumber !== 'string' || !tableNumber.trim()) {
        const err = new Error('Table number cannot be empty');
        err.statusCode = 400;
        throw err;
      }
      const trimmedNumber = tableNumber.trim();
      const normalized = getNormalizedTableKey(trimmedNumber);

      const duplicate = inMemoryTables.find(
        (t) => t.normalizedNumber === normalized && String(t._id) !== String(id)
      );
      if (duplicate) {
        const err = new Error(
          `Table number "${trimmedNumber}" already exists. Please enter a unique table number.`
        );
        err.statusCode = 409;
        throw err;
      }

      table.tableNumber = trimmedNumber;
      table.normalizedNumber = normalized;
    }

    if (capacity !== undefined) {
      const parsedCapacity = Number(capacity);
      if (isNaN(parsedCapacity) || !Number.isInteger(parsedCapacity) || parsedCapacity < 1) {
        const err = new Error('Seating capacity must be a positive whole integer (minimum 1)');
        err.statusCode = 400;
        throw err;
      }
      if (parsedCapacity > 50) {
        const err = new Error('Maximum seating capacity per table is 50 seats');
        err.statusCode = 400;
        throw err;
      }
      table.capacity = parsedCapacity;
    }

    if (name !== undefined) {
      table.name = typeof name === 'string' ? name.trim() : '';
    }

    if (status !== undefined) {
      const cleanStatus = String(status).trim();
      if (!['Active', 'Inactive'].includes(cleanStatus)) {
        const err = new Error('Status must be either "Active" or "Inactive"');
        err.statusCode = 400;
        throw err;
      }
      table.status = cleanStatus;
    }

    table.updatedAt = new Date().toISOString();
    return { ...table };
  },

  /**
   * Toggle or update table status (Deactivation strictly preserves record)
   */
  async updateTableStatus(id, newStatus) {
    if (!id || !mongoose.isValidObjectId(id)) {
      const err = new Error('Invalid table ID format');
      err.statusCode = 400;
      throw err;
    }

    if (!newStatus || !['Active', 'Inactive'].includes(String(newStatus).trim())) {
      const err = new Error('Status must be either "Active" or "Inactive"');
      err.statusCode = 400;
      throw err;
    }

    const cleanStatus = String(newStatus).trim();

    if (isDbConnected()) {
      const table = await Table.findById(id);
      if (!table) {
        const err = new Error('Table not found');
        err.statusCode = 404;
        throw err;
      }

      table.status = cleanStatus;
      return await table.save();
    }

    const table = inMemoryTables.find((t) => String(t._id) === String(id));
    if (!table) {
      const err = new Error('Table not found');
      err.statusCode = 404;
      throw err;
    }

    table.status = cleanStatus;
    table.updatedAt = new Date().toISOString();
    return { ...table };
  },

  /**
   * Delete a table record
   */
  async deleteTable(id) {
    if (!id || !mongoose.isValidObjectId(id)) {
      const err = new Error('Invalid table ID format');
      err.statusCode = 400;
      throw err;
    }

    if (isDbConnected()) {
      const table = await Table.findById(id);
      if (!table) {
        const err = new Error('Table not found');
        err.statusCode = 404;
        throw err;
      }

      // 1. Check table occupancy and active order reference
      if (table.isOccupied || table.activeOrderId) {
        const err = new Error(`Cannot delete "${table.tableNumber}" because it currently has an active in-progress order.`);
        err.statusCode = 400;
        throw err;
      }

      // 2. Query Order collection directly for any active dine-in orders associated with this table
      const activeOrder = await Order.findOne({
        $or: [
          { tableId: table._id },
          { tableNumber: table.tableNumber },
        ],
        status: { $in: ['PLACED', 'PREPARING', 'READY'] },
      }).select('orderId status').lean();

      if (activeOrder) {
        const err = new Error(
          `Cannot delete "${table.tableNumber}" because active order #${activeOrder.orderId} (${activeOrder.status}) is currently in progress. Complete or cancel all active orders before deleting.`
        );
        err.statusCode = 400;
        throw err;
      }

      // 3. Delete the table record from MongoDB (Historical completed orders and payment records are preserved in Order collection)
      await Table.findByIdAndDelete(id);
      return { success: true, message: `Table "${table.tableNumber}" deleted successfully.` };
    }

    const tableIndex = inMemoryTables.findIndex((t) => String(t._id) === String(id));
    if (tableIndex === -1) {
      const err = new Error('Table not found');
      err.statusCode = 404;
      throw err;
    }

    const table = inMemoryTables[tableIndex];
    if (table.isOccupied || table.activeOrderId) {
      const err = new Error(`Cannot delete "${table.tableNumber}" because it currently has an active in-progress order.`);
      err.statusCode = 400;
      throw err;
    }

    inMemoryTables.splice(tableIndex, 1);
    return { success: true, message: `Table "${table.tableNumber}" deleted successfully.` };
  },

  /**
   * Reset in-memory tables (for testing)
   */
  _resetMemory() {
    inMemoryTables = INITIAL_BASELINE_TABLES.map((t) => ({ ...t }));
  },
};

export default tableService;
