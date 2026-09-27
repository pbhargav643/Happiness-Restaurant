import { successResponse } from '../utils/apiResponse.js';

/**
 * Admin Controller (Foundation)
 */
export const adminController = {
  async getDashboardSummary(req, res, next) {
    try {
      return successResponse(res, 'Admin dashboard summary retrieved', {
        totalOrders: 0,
        activeOrders: 0,
        totalRevenue: 0,
      });
    } catch (error) {
      next(error);
    }
  },
};

export default adminController;
