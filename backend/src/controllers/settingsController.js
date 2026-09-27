import settingsService from '../services/settingsService.js';

/**
 * Restaurant Settings Controller
 * Handles retrieval and updates for singleton restaurant settings.
 */
export const settingsController = {
  /**
   * GET /api/settings
   * Retrieve current restaurant settings and pickup parameters
   */
  async getSettings(req, res, next) {
    try {
      const data = await settingsService.getSettings();
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/settings
   * Update restaurant settings (AUTHENTICATION PENDING)
   */
  async updateSettings(req, res, next) {
    try {
      const updated = await settingsService.updateSettings(req.body);
      return res.status(200).json({
        success: true,
        message: 'Restaurant settings updated successfully',
        data: updated,
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

export default settingsController;
