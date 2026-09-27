import mongoose from 'mongoose';

/**
 * RestaurantSettings Mongoose Schema
 *
 * Rules:
 * - Defaults are safe and sensible
 * - Does not invent restaurant identity
 * - Strict pickup parameters
 */
const restaurantSettingsSchema = new mongoose.Schema(
  {
    restaurantName: {
      type: String,
      trim: true,
      default: 'HAPPINESS RESTAURANT',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    pickupEnabled: {
      type: Boolean,
      default: true,
    },
    openingTime: {
      type: String,
      trim: true,
      default: '11:00',
    },
    closingTime: {
      type: String,
      trim: true,
      default: '22:30',
    },
    slotInterval: {
      type: Number,
      default: 15,
      min: 5,
    },
    preparationBuffer: {
      type: Number,
      default: 20,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

const RestaurantSettings =
  mongoose.models.RestaurantSettings ||
  mongoose.model('RestaurantSettings', restaurantSettingsSchema);

export default RestaurantSettings;
