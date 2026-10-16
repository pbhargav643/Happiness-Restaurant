import mongoose from 'mongoose';

/**
 * Order Item Sub-Schema
 * Stores historical snapshot of item details at time of order
 */
const orderItemSchema = new mongoose.Schema(
  {
    itemId: {
      type: String,
      required: [true, 'Item ID is required'],
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Item price is required'],
      min: [0, 'Item price must be non-negative'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be a positive integer (minimum 1)'],
    },
    image: {
      type: String,
      default: null,
    },
  },
  { _id: false }
);

/**
 * Customer Details Sub-Schema
 */
const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    mobile: {
      type: String,
      required: [true, 'Customer mobile number is required'],
      trim: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { _id: false }
);

/**
 * Pickup Schedule Sub-Schema (Strict Self-Pickup Model)
 */
const pickupSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: [true, 'Pickup date is required'],
      trim: true,
      index: true,
    },
    time: {
      type: String,
      required: [true, 'Pickup time is required'],
      trim: true,
    },
  },
  { _id: false }
);

/**
 * Payment Details Sub-Schema (Manual Cash & UPI Settlement)
 */
const paymentSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: ['CASH', 'UPI'],
      required: [true, 'Payment method must be CASH or UPI'],
      uppercase: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0, 'Payment amount must be non-negative'],
    },
    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED'],
      default: 'COMPLETED',
      uppercase: true,
      trim: true,
    },
    recordedAt: {
      type: Date,
      default: Date.now,
    },
    recordedBy: {
      type: String,
      trim: true,
      default: null,
    },
    transactionNote: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { _id: false }
);

/**
 * Order Mongoose Schema
 *
 * Rules:
 * - orderId: unique (strictly self-pickup orders)
 * - orderType: strictly 'PICKUP'
 * - status: 'PLACED' | 'PREPARING' | 'READY' | 'PICKED_UP' (default: 'PLACED')
 * - subtotal: numeric, non-negative
 * - readyTime: string or null
 * - zero delivery fields
 *
 * Indexes:
 * - orderId: unique index
 * - customer.mobile: index
 * - status: index
 * - pickup.date: index
 */
const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: [true, 'Order ID is required'],
      unique: true, // creates unique index without duplicate index: true
      trim: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
      index: true,
    },
    customer: {
      type: customerSchema,
      required: [true, 'Customer information is required'],
    },
    pickup: {
      type: pickupSchema,
      required: function () {
        return (this.orderType || 'PICKUP') === 'PICKUP';
      },
      default: null,
    },
    tableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Table',
      default: null,
      index: true,
    },
    tableNumber: {
      type: String,
      trim: true,
      default: null,
    },
    instructions: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Instructions cannot exceed 500 characters'],
    },
    items: {
      type: [orderItemSchema],
      required: [true, 'Order items are required'],
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: 'Order must contain at least one item',
      },
    },
    subtotal: {
      type: Number,
      required: [true, 'Subtotal is required'],
      min: [0, 'Subtotal must be non-negative'],
    },
    orderType: {
      type: String,
      required: true,
      enum: ['PICKUP', 'DINE_IN'],
      default: 'PICKUP',
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['PLACED', 'PREPARING', 'READY', 'SERVED', 'PICKED_UP'],
      default: 'PLACED',
      index: true,
    },
    readyTime: {
      type: String,
      default: null,
    },
    payment: {
      type: paymentSchema,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.index({ 'payment.status': 1 });
orderSchema.index({ 'payment.method': 1 });
orderSchema.index({ 'payment.recordedAt': 1 });

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

export default Order;
