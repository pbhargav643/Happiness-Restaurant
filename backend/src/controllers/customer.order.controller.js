import orderService from '../services/order.service.js';

/**
 * Customer Order Controller
 * Handles authenticated customer order operations with strict ownership verification.
 */
export const customerOrderController = {
  /**
   * GET /api/customer/orders
   * Retrieve authenticated customer's own order history.
   * Authority: req.customer.id from verified JWT token.
   */
  async getMyOrders(req, res, next) {
    try {
      const customerId = req.customer?.id;

      if (!customerId) {
        return res.status(401).json({
          success: false,
          message: 'Please sign in to view your orders.',
        });
      }

      const { page, limit } = req.query;
      const result = await orderService.getCustomerOrders(customerId, { page, limit });

      return res.status(200).json({
        success: true,
        data: result.items,
        meta: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
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

  /**
   * GET /api/customer/orders/:orderId
   * Retrieve single customer order with strict ownership validation.
   * Returns safe 404 if order does not exist or belongs to another customer.
   */
  async getMyOrderById(req, res, next) {
    try {
      const customerId = req.customer?.id;
      const { orderId } = req.params;

      if (!customerId) {
        return res.status(401).json({
          success: false,
          message: 'Please sign in to view your order.',
        });
      }

      if (!orderId || !orderId.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Order ID is required.',
        });
      }

      const order = await orderService.getCustomerOrderById(orderId, customerId);

      if (!order) {
        // Safe 404 response that does not disclose whether another customer's order exists
        return res.status(404).json({
          success: false,
          message: 'Order not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: order,
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

export default customerOrderController;
