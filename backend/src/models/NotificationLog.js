import mongoose from 'mongoose';

/**
 * NotificationLog Mongoose Schema
 *
 * Requirements:
 * - Allowed channels: WHATSAPP, SMS (indexed)
 * - Allowed statuses: PENDING, SENT, FAILED (default: PENDING, indexed)
 * - Supported types: ORDER_PLACED, ORDER_PREPARING, ORDER_READY, ORDER_PICKED_UP
 * - orderId: human-readable Order ID (indexed)
 * - Architecture foundation only (no external provider integration in Phase 8)
 */
const notificationLogSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: [true, 'Order ID is required'],
      trim: true,
      index: true,
    },
    type: {
      type: String,
      required: [true, 'Notification type is required'],
      enum: ['ORDER_PLACED', 'ORDER_PREPARING', 'ORDER_READY', 'ORDER_PICKED_UP'],
      trim: true,
    },
    channel: {
      type: String,
      required: true,
      enum: ['WHATSAPP', 'SMS'],
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['PENDING', 'SENT', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
    recipient: {
      type: String,
      required: [true, 'Recipient phone/contact is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Notification message body is required'],
      trim: true,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    providerMessageId: {
      type: String,
      default: null,
      trim: true,
    },
    error: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const NotificationLog =
  mongoose.models.NotificationLog ||
  mongoose.model('NotificationLog', notificationLogSchema);

export default NotificationLog;
