import api from './api.js';
import { customerStorage } from './customerAuthApi.js';

/**
 * Review API Service
 * Centralized client for Customer Reviews & Ratings and Admin Review Management.
 */
export const reviewApi = {
  /**
   * GET /api/reviews
   * Retrieve all public reviews (newest first)
   */
  async getReviews() {
    try {
      const res = await api.get('/reviews');
      return {
        success: true,
        reviews: Array.isArray(res?.reviews) ? res.reviews : [],
        count: res?.count || (Array.isArray(res?.reviews) ? res.reviews.length : 0),
      };
    } catch (err) {
      console.warn('[reviewApi] Failed to load reviews:', err.message);
      return {
        success: false,
        reviews: [],
        count: 0,
        error: err.message || 'Unable to load reviews.',
      };
    }
  },

  /**
   * POST /api/reviews
   * Submit a new customer review (authenticated customer only)
   *
   * @param {Object} data
   * @param {number} data.rating - 1 to 5
   * @param {string} data.comment - review text
   */
  async createReview({ rating, comment }) {
    const token = customerStorage.getToken();
    if (!token) {
      const err = new Error('Please sign in to submit a review.');
      err.statusCode = 401;
      throw err;
    }

    try {
      const res = await api.post(
        '/reviews',
        { rating: Number(rating), comment: String(comment).trim() },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return {
        success: true,
        message: res?.message || 'Review submitted successfully.',
        review: res?.review,
      };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Failed to submit review.',
      };
    }
  },

  /**
   * GET /api/admin/reviews
   * Retrieve all reviews for Admin management (protected)
   */
  async getAdminReviews() {
    try {
      const res = await api.get('/admin/reviews');
      return {
        success: true,
        reviews: Array.isArray(res?.reviews) ? res.reviews : [],
        count: res?.count || (Array.isArray(res?.reviews) ? res.reviews.length : 0),
      };
    } catch (err) {
      console.warn('[reviewApi] Failed to load admin reviews:', err.message);
      return {
        success: false,
        reviews: [],
        count: 0,
        error: err.message || 'Failed to load reviews.',
      };
    }
  },

  /**
   * DELETE /api/admin/reviews/:reviewId
   * Permanently delete a single review (protected)
   *
   * @param {string} reviewId
   */
  async deleteReview(reviewId) {
    if (!reviewId) {
      throw new Error('Review ID is required.');
    }

    try {
      const res = await api.delete(`/admin/reviews/${reviewId}`);
      return {
        success: true,
        message: res?.message || 'Review deleted successfully.',
        deletedId: res?.deletedId || reviewId,
      };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Failed to delete review.',
      };
    }
  },
};

export default reviewApi;
