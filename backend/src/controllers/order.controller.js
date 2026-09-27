import orderService from '../services/order.service.js';

/**
 * Order Controller
 * Handles customer and admin order operations with input validation and standardized JSON responses.
 *
 * NOTE: Admin authentication is intentionally omitted in Phase 8 (AUTHENTICATION PENDING).
 */
export const orderController = {
  /**
   * POST /api/orders
   * Customer: Place a new order with server-side price calculation and subtotal verification
   */
  async createOrder(req, res, next) {
    try {
      // Secure Customer Order Ownership:
      // Read customer ID strictly from authenticated request (req.customer) - never from req.body
      const authenticatedCustomerId = req.customer?.id || null;
      const order = await orderService.createOrder(req.body, authenticatedCustomerId);

      return res.status(201).json({
        success: true,
        message: 'Order placed successfully',
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

  /**
   * GET /api/orders/:orderId
   * Customer: Retrieve a single order by orderId with ownership protection
   */
  async getOrder(req, res, next) {
    try {
      const { orderId } = req.params;
      const order = await orderService.getOrderById(orderId);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found',
        });
      }

      // Customer order ownership protection:
      // If the order was created by an authenticated customer, only that customer can access it.
      // If the requester is unauthenticated or has a different customer ID, return safe 404.
      if (order.customerId) {
        const callerCustomerId = req.customer?.id;
        if (!callerCustomerId || callerCustomerId.toString() !== order.customerId.toString()) {
          return res.status(404).json({
            success: false,
            message: 'Order not found',
          });
        }
      }

      return res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/orders
   * Customer: Retrieve customer order history with authenticated ownership & guest protection
   */
  async getCustomerOrders(req, res, next) {
    try {
      const { mobile, page, limit } = req.query;

      // 1. Authenticated customer: strictly fetch customer's own verified orders
      if (req.customer?.id) {
        const result = await orderService.getCustomerOrders(req.customer.id, { page, limit });
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
      }

      // 2. Unauthenticated / Guest request: require mobile query parameter
      if (!mobile || !String(mobile).trim()) {
        return res.status(200).json({
          success: true,
          message: 'Orders API endpoint ready (Restaurant Self-Pickup Only)',
          data: [],
          meta: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 1,
          },
        });
      }

      // Query by mobile, but strictly filter out orders belonging to registered/authenticated customers
      // to ensure guest queries never expose another customer's orders
      const result = await orderService.getOrdersByMobile(mobile, { page, limit });
      const guestOnlyItems = (result.items || []).filter((item) => !item.customerId);

      return res.status(200).json({
        success: true,
        data: guestOnlyItems,
        meta: {
          page: result.page,
          limit: result.limit,
          total: guestOnlyItems.length,
          totalPages: Math.ceil(guestOnlyItems.length / (result.limit || 20)) || 1,
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
   * GET /api/admin/orders
   * Admin: List orders with filtering, search, sorting, and pagination (AUTHENTICATION PENDING)
   */
  async getAdminOrders(req, res, next) {
    try {
      const { status, pickupDate, date, search, sort, order, page, limit } = req.query;

      const result = await orderService.getAdminOrders({
        status,
        pickupDate,
        date,
        search,
        sort,
        order,
        page,
        limit,
      });

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
      next(error);
    }
  },

  /**
   * GET /api/admin/orders/:orderId
   * Admin: Retrieve complete order details (AUTHENTICATION PENDING)
   */
  async getAdminOrder(req, res, next) {
    try {
      const { orderId } = req.params;
      const order = await orderService.getOrderById(orderId);

      if (!order) {
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
      next(error);
    }
  },

  /**
   * PATCH /api/admin/orders/:orderId/status
   * Admin: Update order status with strict sequential progression (AUTHENTICATION PENDING)
   */
  async updateOrderStatus(req, res, next) {
    try {
      const { orderId } = req.params;
      const { status } = req.body || {};

      if (!status || typeof status !== 'string' || !status.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Status is required',
        });
      }

      const updated = await orderService.updateOrderStatus(orderId, status);

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Order not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: `Order status updated to ${updated.status}`,
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

  /**
   * PATCH /api/admin/orders/:orderId/ready-time
   * Admin: Update order estimated/actual ready time (AUTHENTICATION PENDING)
   */
  async updateReadyTime(req, res, next) {
    try {
      const { orderId } = req.params;
      const { readyTime } = req.body || {};

      const updated = await orderService.updateReadyTime(orderId, readyTime);

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Order not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Order ready time updated',
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

  /**
   * DELETE /api/admin/orders/:orderId
   * Admin: Permanently delete a single order (PROTECTED)
   */
  async deleteAdminOrder(req, res, next) {
    try {
      const { orderId } = req.params;
      if (!orderId || typeof orderId !== 'string' || !orderId.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Order ID is required',
        });
      }

      const deleted = await orderService.deleteOrder(orderId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Order not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: `Order ${deleted.orderId} deleted successfully`,
        data: {
          orderId: deleted.orderId,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/admin/orders/by-month
   * Admin: Permanently delete orders for a specific year and month (PROTECTED)
   */
  async deleteOrdersByMonth(req, res, next) {
    try {
      const year = req.query.year || req.body?.year;
      const month = req.query.month || req.body?.month;

      if (!year || !month) {
        return res.status(400).json({
          success: false,
          message: 'Year and month parameters are required',
        });
      }

      const result = await orderService.deleteOrdersByMonth(year, month);

      return res.status(200).json(result);
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

export default orderController;
