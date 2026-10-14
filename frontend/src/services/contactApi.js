import api from './api.js';

/**
 * Customer Contact API Service
 * Handles customer contact inquiries and message submission
 */
export const contactApi = {
  /**
   * Submit a new contact message
   * POST /api/contact
   */
  async submitContactMessage(payload) {
    return await api.post('/contact', payload);
  },
};

export default contactApi;
