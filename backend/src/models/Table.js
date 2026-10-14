import mongoose from 'mongoose';

/**
 * Normalizes table number for duplicate prevention:
 * - Trims leading and trailing whitespace
 * - Converts to lowercase
 * - Collapses internal whitespace
 * - Strips common prefixes ("table", "tbl", "t") so that:
 *   "Table 1", "table 1", "  Table 1  ", "1", "T-1" all produce "1"
 */
export function getNormalizedTableKey(tableNumber) {
  if (!tableNumber || (typeof tableNumber !== 'string' && typeof tableNumber !== 'number')) {
    return '';
  }
  const trimmed = String(tableNumber).trim().toLowerCase().replace(/\s+/g, ' ');
  const stripped = trimmed.replace(/^(table|tbl)(?:[-\s]+|(?=\d))|^t(?:[-\s]+|(?=\d))/i, '').trim();
  return stripped || trimmed;
}

/**
 * Table Mongoose Schema
 *
 * Requirements:
 * - Stable table identifier (_id)
 * - Unique normalized table number within the restaurant
 * - Optional display name
 * - Positive integer seating capacity (1 to 50)
 * - Status: 'Active' | 'Inactive' (default: 'Active')
 * - Preserves record on deactivation (never deleted by status change)
 * - Zero customer information stored
 * - Timestamps: createdAt, updatedAt
 *
 * Indexes:
 * - normalizedNumber: unique index
 * - status: index
 */
const tableSchema = new mongoose.Schema(
  {
    tableNumber: {
      type: String,
      required: [true, 'Table number is required'],
      trim: true,
      validate: {
        validator: (v) => typeof v === 'string' && v.trim().length > 0 && v.trim().length <= 30,
        message: 'Table number must be between 1 and 30 characters',
      },
    },
    normalizedNumber: {
      type: String,
      default: function () {
        return getNormalizedTableKey(this.tableNumber);
      },
      required: true,
      unique: true, // Unique index at database level
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      trim: true,
      default: '',
      maxlength: [100, 'Table name cannot exceed 100 characters'],
    },
    capacity: {
      type: Number,
      required: [true, 'Seating capacity is required'],
      min: [1, 'Seating capacity must be at least 1 guest'],
      max: [50, 'Seating capacity cannot exceed 50 guests'],
      validate: {
        validator: (v) => Number.isInteger(v) && v >= 1 && v <= 50,
        message: 'Seating capacity must be a positive whole integer between 1 and 50',
      },
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['Active', 'Inactive'],
        message: 'Status must be either "Active" or "Inactive"',
      },
      default: 'Active',
      index: true,
    },
    isOccupied: {
      type: Boolean,
      default: false,
    },
    activeOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-validate hook: auto-compute normalizedNumber from tableNumber
tableSchema.pre('validate', function () {
  if (this.tableNumber) {
    this.normalizedNumber = getNormalizedTableKey(this.tableNumber);
  }
});

const Table = mongoose.models.Table || mongoose.model('Table', tableSchema);

export default Table;
