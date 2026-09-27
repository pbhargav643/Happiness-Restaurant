import mongoose from 'mongoose';
import RestaurantSettings from '../models/RestaurantSettings.js';
import { validatePickupTime } from './orderService.js';

// Default Singleton Restaurant Settings Configuration
export const DEFAULT_SETTINGS = {
  restaurantName: 'HAPPINESS RESTAURANT',
  phone: '+91 98765 43210',
  address: 'QX8M+J67, Navjivan Colony, Bilimora, Gujarat 396325, India',
  pickupEnabled: true,
  serviceMode: 'Restaurant Self-Pickup',
  openingTime: '11:00',
  closingTime: '22:30',
  slotInterval: 15,
  preparationBuffer: 20,
};

let memorySettings = { ...DEFAULT_SETTINGS };

// Forbidden delivery keys to enforce strict Self-Pickup
const FORBIDDEN_DELIVERY_KEYS = [
  'deliveryEnabled',
  'deliveryFee',
  'deliveryAddress',
  'deliveryPartner',
  'deliveryRadius',
  'shipping',
  'homeDelivery',
];

/**
 * Restaurant Settings Service Layer
 * Manages singleton restaurant settings and pickup parameters.
 */
export const settingsService = {
  /**
   * Reset in-memory settings (useful for tests)
   */
  _resetMemorySettings() {
    memorySettings = { ...DEFAULT_SETTINGS };
  },

  /**
   * Retrieve the primary restaurant settings singleton
   */
  async getSettings() {
    if (mongoose.connection.readyState !== 1) {
      return {
        ...memorySettings,
        serviceMode: 'Restaurant Self-Pickup',
      };
    }

    let settings = await RestaurantSettings.findOne().select('-__v').lean();

    if (!settings) {
      const initial = new RestaurantSettings(DEFAULT_SETTINGS);
      const saved = await initial.save();
      settings = saved.toObject();
      delete settings.__v;
    }

    return {
      ...settings,
      serviceMode: 'Restaurant Self-Pickup',
    };
  },

  /**
   * Update the primary restaurant settings singleton
   */
  async updateSettings(updateData) {
    if (!updateData || typeof updateData !== 'object') {
      const err = new Error('Update payload must be a valid JSON object');
      err.statusCode = 400;
      throw err;
    }

    // 1. Enforce Strict Self-Pickup: Reject delivery settings
    for (const forbidden of FORBIDDEN_DELIVERY_KEYS) {
      if (updateData[forbidden] !== undefined) {
        const err = new Error(
          `Delivery settings are not permitted. Restaurant operates strictly on Restaurant Self-Pickup mode (Key "${forbidden}" rejected).`
        );
        err.statusCode = 400;
        throw err;
      }
    }

    const cleanUpdates = {};

    // 2. Validate restaurantName
    if (updateData.restaurantName !== undefined) {
      if (typeof updateData.restaurantName !== 'string' || !updateData.restaurantName.trim()) {
        const err = new Error('restaurantName cannot be empty');
        err.statusCode = 400;
        throw err;
      }
      cleanUpdates.restaurantName = updateData.restaurantName.trim();
    }

    // 3. Validate phone
    if (updateData.phone !== undefined) {
      if (typeof updateData.phone !== 'string' || !updateData.phone.trim()) {
        const err = new Error('phone must be a valid non-empty string');
        err.statusCode = 400;
        throw err;
      }
      cleanUpdates.phone = updateData.phone.trim();
    }

    // 4. Validate address
    if (updateData.address !== undefined) {
      if (typeof updateData.address !== 'string') {
        const err = new Error('address must be a string');
        err.statusCode = 400;
        throw err;
      }
      cleanUpdates.address = updateData.address.trim();
    }

    // 5. Validate pickupEnabled
    if (updateData.pickupEnabled !== undefined) {
      if (typeof updateData.pickupEnabled !== 'boolean') {
        const err = new Error('pickupEnabled must be a boolean');
        err.statusCode = 400;
        throw err;
      }
      cleanUpdates.pickupEnabled = updateData.pickupEnabled;
    }

    // 6. Validate openingTime and closingTime
    if (updateData.openingTime !== undefined) {
      if (!validatePickupTime(updateData.openingTime)) {
        const err = new Error('openingTime must be a valid time format (e.g. 11:00 or 11:00 AM)');
        err.statusCode = 400;
        throw err;
      }
      cleanUpdates.openingTime = updateData.openingTime.trim();
    }

    if (updateData.closingTime !== undefined) {
      if (!validatePickupTime(updateData.closingTime)) {
        const err = new Error('closingTime must be a valid time format (e.g. 22:30 or 10:30 PM)');
        err.statusCode = 400;
        throw err;
      }
      cleanUpdates.closingTime = updateData.closingTime.trim();
    }

    // 7. Validate slotInterval
    if (updateData.slotInterval !== undefined) {
      const numSlot = Number(updateData.slotInterval);
      if (isNaN(numSlot) || numSlot <= 0) {
        const err = new Error('slotInterval must be a positive number');
        err.statusCode = 400;
        throw err;
      }
      cleanUpdates.slotInterval = numSlot;
    }

    // 8. Validate preparationBuffer
    if (updateData.preparationBuffer !== undefined) {
      const numPrep = Number(updateData.preparationBuffer);
      if (isNaN(numPrep) || numPrep < 0) {
        const err = new Error('preparationBuffer must be a non-negative number');
        err.statusCode = 400;
        throw err;
      }
      cleanUpdates.preparationBuffer = numPrep;
    }

    // Offline / disconnected test fallback
    if (mongoose.connection.readyState !== 1) {
      memorySettings = {
        ...memorySettings,
        ...cleanUpdates,
      };
      return {
        ...memorySettings,
        serviceMode: 'Restaurant Self-Pickup',
      };
    }

    // Singleton upsert strategy: only 1 document maintained
    const updated = await RestaurantSettings.findOneAndUpdate(
      {},
      { $set: cleanUpdates },
      { new: true, upsert: true, runValidators: true }
    )
      .select('-__v')
      .lean();

    return {
      ...updated,
      serviceMode: 'Restaurant Self-Pickup',
    };
  },
};

export default settingsService;
