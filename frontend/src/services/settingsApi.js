import api from './api.js';
import { RESTAURANT_CONFIG } from '../constants/restaurantConfig.js';
import { PICKUP_CONFIG } from '../config/pickupConfig.js';

/**
 * Fallback Default Settings
 */
export const DEFAULT_FRONTEND_SETTINGS = {
  restaurantName: RESTAURANT_CONFIG.name || 'HAPPINESS RESTAURANT',
  phone: RESTAURANT_CONFIG.contact?.phone || '+91 98765 43210',
  address: RESTAURANT_CONFIG.contact?.address || 'QX8M+J67, Navjivan Colony, Bilimora, Gujarat 396325, India',
  landmark: RESTAURANT_CONFIG.contact?.landmark || 'Rajhans Complex / Opposite L.M.P. School, College Road / Chikhli Road, Bilimora',
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
          phone: raw.phone || DEFAULT_FRONTEND_SETTINGS.phone,
          address: raw.address || DEFAULT_FRONTEND_SETTINGS.address,
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
};

export default settingsApi;
