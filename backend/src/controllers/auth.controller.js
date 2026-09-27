import { authService } from '../services/auth.service.js';

/**
 * Authentication Controller
 * Handles Admin login, current identity verification (/me), and logout.
 */
export const authController = {
  /**
   * POST /api/auth/login
   * Authenticate admin and issue JWT
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body || {};

      const result = await authService.loginAdmin({ email, password });

      return res.status(200).json({
        success: true,
        message: 'Authentication successful',
        token: result.token,
        admin: result.admin,
      });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({
          success: false,
          message: err.message,
        });
      }
      next(err);
    }
  },

  /**
   * GET /api/auth/me
   * Retrieve currently authenticated admin's profile
   */
  async getMe(req, res, next) {
    try {
      if (!req.admin) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.',
        });
      }

      return res.status(200).json({
        success: true,
        admin: req.admin,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/auth/logout
   * Client-side stateless logout acknowledgement
   */
  async logout(req, res) {
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  },
};

export default authController;
