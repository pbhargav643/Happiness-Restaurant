import { customerAuthService } from '../services/customer.auth.service.js';

/**
 * Customer Authentication Controller
 * Handles Customer registration, login, current profile (/me), and logout.
 */
export const customerAuthController = {
  /**
   * POST /api/auth/customer/register
   * Register a new customer and issue customer JWT
   */
  async register(req, res, next) {
    try {
      const { name, email, mobile, password } = req.body || {};

      const result = await customerAuthService.registerCustomer({
        name,
        email,
        mobile,
        password,
      });

      return res.status(201).json({
        success: true,
        message: 'Registration successful',
        token: result.token,
        customer: result.customer,
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
   * POST /api/auth/customer/login
   * Authenticate customer and issue customer JWT
   */
  async login(req, res, next) {
    try {
      const { identifier, mobile, email, password } = req.body || {};

      const result = await customerAuthService.loginCustomer({
        identifier,
        mobile,
        email,
        password,
      });

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token: result.token,
        customer: result.customer,
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
   * POST /api/auth/customer/forgot-password
   * Request password reset instructions
   */
  async forgotPassword(req, res, next) {
    try {
      const { identifier, mobile, email } = req.body || {};

      const result = await customerAuthService.requestPasswordReset({
        identifier,
        mobile,
        email,
      });

      return res.status(200).json(result);
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
   * GET /api/auth/customer/me
   * Retrieve currently authenticated customer profile
   */
  async getMe(req, res, next) {
    try {
      if (!req.customer) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.',
        });
      }

      return res.status(200).json({
        success: true,
        customer: req.customer,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/auth/customer/logout
   * Stateless logout acknowledgement
   */
  async logout(req, res) {
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  },
};

export default customerAuthController;
