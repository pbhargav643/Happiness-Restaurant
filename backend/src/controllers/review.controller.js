import reviewService from '../services/review.service.js';

/**
 * Review Controller
 * Handles Public, Customer, and Admin review endpoints.
 */
export const reviewController = {
  /**
   * GET /api/reviews
   * Public endpoint: retrieve all submitted customer reviews (newest first).
   */
  async getReviews(req, res, next) {
    try {
      const reviews = await reviewService.getPublicReviews();
      return res.status(200).json({
        success: true,
        reviews,
        count: reviews.length,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/reviews
   * Authenticated customer endpoint: submit a review & rating.
   * Authority: req.customer from verified Customer JWT.
   */
  async createReview(req, res, next) {
    try {
      const customerId = req.customer?.id;
      const customerName = req.customer?.name;

      if (!customerId) {
        return res.status(401).json({
          success: false,
          message: 'Please sign in to submit a review.',
        });
      }

      const { rating, comment } = req.body;

      if (rating === undefined || rating === null || rating === '') {
        return res.status(400).json({
          success: false,
          message: 'Rating is required (1 to 5 stars).',
        });
      }

      if (!comment || typeof comment !== 'string' || !comment.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Review text is required.',
        });
      }

      const review = await reviewService.createReview({
        customerId,
        customerName,
        rating,
        comment,
      });

      return res.status(201).json({
        success: true,
        message: 'Review submitted successfully.',
        review,
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
   * GET /api/admin/reviews
   * Admin endpoint: retrieve all reviews for management.
   * Authority: authenticateAdmin middleware.
   */
  async getAdminReviews(req, res, next) {
    try {
      const reviews = await reviewService.getAdminReviews();
      return res.status(200).json({
        success: true,
        reviews,
        count: reviews.length,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/admin/reviews/:reviewId
   * Admin endpoint: permanently delete a review.
   * Authority: authenticateAdmin middleware.
   */
  async deleteReview(req, res, next) {
    try {
      const { reviewId } = req.params;
      const result = await reviewService.deleteReview(reviewId);

      return res.status(200).json({
        success: true,
        message: 'Review deleted successfully.',
        deletedId: result.deletedId,
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

export default reviewController;
