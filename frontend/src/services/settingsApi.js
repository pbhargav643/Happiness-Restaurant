import api from './api.js';
import { RESTAURANT_CONFIG } from '../constants/restaurantConfig.js';
import { PICKUP_CONFIG } from '../config/pickupConfig.js';

/**
 * Fallback Default Settings
 */
export const DEFAULT_FRONTEND_SETTINGS = {
  restaurantName: RESTAURANT_CONFIG.name || 'VYANJAN RESTAURANT',
  tagline: RESTAURANT_CONFIG.tagline || 'Authentic Delicacies • Online Parcel Pickup',
  phone: RESTAURANT_CONFIG.contact?.phone || '+91 81558 16509',
  email: RESTAURANT_CONFIG.contact?.email || 'contact@vyanjanrestaurant.com',
  address: RESTAURANT_CONFIG.contact?.address || 'QX8M+J67, Navjivan Colony, Bilimora, Gujarat 396325, India',
  landmark: RESTAURANT_CONFIG.contact?.landmark || 'Rajhans Complex / Opposite L.M.P. School, College Road / Chikhli Road, Bilimora',
  operatingDays: RESTAURANT_CONFIG.operatingHours?.days || 'Monday – Sunday (All Days)',
  pickupEnabled: true,
  openingTime: PICKUP_CONFIG.openingTime || '11:00',
  closingTime: PICKUP_CONFIG.closingTime || '22:30',
  slotInterval: PICKUP_CONFIG.slotIntervalMinutes || 15,
  preparationBuffer: PICKUP_CONFIG.preparationBufferMinutes || 20,
  serviceMode: 'Restaurant Self-Pickup',
};

/**
 * Settings API Service
 * Handles operational restaurant settings retrieval with safe fallbacks.
 * STRICT RULE: Self-Pickup only (zero delivery parameters).
 */
export const settingsApi = {
  /**
   * Fetch active singleton restaurant configuration
   */
  async getSettings() {
    try {
      const response = await api.get('/settings');

      if (response && response.success && response.data) {
        const raw = response.data;
        return {
          restaurantName: raw.restaurantName || DEFAULT_FRONTEND_SETTINGS.restaurantName,
          tagline: raw.tagline || DEFAULT_FRONTEND_SETTINGS.tagline,
          phone: raw.phone || DEFAULT_FRONTEND_SETTINGS.phone,
          email: raw.email || DEFAULT_FRONTEND_SETTINGS.email,
          address: raw.address || DEFAULT_FRONTEND_SETTINGS.address,
          landmark: raw.landmark || DEFAULT_FRONTEND_SETTINGS.landmark,
          operatingDays: raw.operatingDays || DEFAULT_FRONTEND_SETTINGS.operatingDays,
          pickupEnabled: typeof raw.pickupEnabled === 'boolean' ? raw.pickupEnabled : true,
          openingTime: raw.openingTime || DEFAULT_FRONTEND_SETTINGS.openingTime,
          closingTime: raw.closingTime || DEFAULT_FRONTEND_SETTINGS.closingTime,
          slotInterval: Number(raw.slotInterval) || DEFAULT_FRONTEND_SETTINGS.slotInterval,
          preparationBuffer: Number(raw.preparationBuffer) || DEFAULT_FRONTEND_SETTINGS.preparationBuffer,
          serviceMode: 'Restaurant Self-Pickup',
          fromBackend: true,
        };
      }

      return {
        ...DEFAULT_FRONTEND_SETTINGS,
        fromBackend: false,
      };
    } catch (err) {
      console.warn('[settingsApi.getSettings] Backend unavailable, using default configuration:', err.message);
      return {
        ...DEFAULT_FRONTEND_SETTINGS,
        fromBackend: false,
        error: err.message,
      };
    }
  },

  /**
   * Update restaurant settings (Requires Admin Auth)
   */
  async updateSettings(updateData) {
    const response = await api.patch('/admin/settings', updateData);
    if (response && response.success && response.data) {
      return response.data;
    }
    return response;
  },
};

export default settingsApi;
