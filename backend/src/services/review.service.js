import mongoose from 'mongoose';
import Review from '../models/Review.js';

// In-memory fallback review store for offline or database-disconnected test environments
const inMemoryReviews = [];

/**
 * Checks if MongoDB is currently connected
 */
function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

export const reviewService = {
  /**
   * Retrieve all public reviews (newest first)
   */
  async getPublicReviews() {
    if (isDbConnected()) {
      return await Review.find()
        .sort({ createdAt: -1 })
        .select('_id customerId customerName rating comment createdAt updatedAt')
        .lean();
    }

    return [...inMemoryReviews].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  /**
   * Create a new review from an authenticated customer
   * Enforces 1 active review per customer (duplicate protection)
   */
  async createReview({ customerId, customerName, rating, comment }) {
    const numRating = Number(rating);
    if (!numRating || isNaN(numRating) || numRating < 1 || numRating > 5) {
      const err = new Error('Rating is required and must be between 1 and 5 stars.');
      err.statusCode = 400;
      throw err;
    }

    const trimmedComment = typeof comment === 'string' ? comment.trim() : '';
    if (!trimmedComment) {
      const err = new Error('Review text is required.');
      err.statusCode = 400;
      throw err;
    }

    if (trimmedComment.length > 1000) {
      const err = new Error('Review text cannot exceed 1000 characters.');
      err.statusCode = 400;
      throw err;
    }

    const safeCustomerName = (customerName || 'Customer').trim();

    if (isDbConnected()) {
      // Duplicate review check
      const existing = await Review.findOne({ customerId });
      if (existing) {
        const err = new Error('You have already submitted a review.');
        err.statusCode = 400;
        throw err;
      }

      const review = await Review.create({
        customerId,
        customerName: safeCustomerName,
        rating: numRating,
        comment: trimmedComment,
      });

      return review.toObject();
    }

    // In-memory fallback
    const stringCustomerId = String(customerId);
    const existingMemory = inMemoryReviews.find(
      (r) => String(r.customerId) === stringCustomerId
    );
    if (existingMemory) {
      const err = new Error('You have already submitted a review.');
      err.statusCode = 400;
      throw err;
    }

    const newMemoryReview = {
      _id: new mongoose.Types.ObjectId().toString(),
      customerId: stringCustomerId,
      customerName: safeCustomerName,
      rating: numRating,
      comment: trimmedComment,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    inMemoryReviews.push(newMemoryReview);
    return newMemoryReview;
  },

  /**
   * Retrieve all reviews for Admin management
   */
  async getAdminReviews() {
    if (isDbConnected()) {
      return await Review.find().sort({ createdAt: -1 }).lean();
    }

    return [...inMemoryReviews].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  /**
   * Delete a single review by ID (Admin only)
   * Strictly isolates deletion to ONLY this review document
   */
  async deleteReview(reviewId) {
    if (!reviewId) {
      const err = new Error('Review ID is required.');
      err.statusCode = 400;
      throw err;
    }

    if (isDbConnected()) {
      const deleted = await Review.findByIdAndDelete(reviewId);
      if (!deleted) {
        const err = new Error('Review not found.');
        err.statusCode = 404;
        throw err;
      }
      return { success: true, deletedId: reviewId };
    }

    // In-memory fallback
    const idx = inMemoryReviews.findIndex(
      (r) => String(r._id) === String(reviewId)
    );
    if (idx === -1) {
      const err = new Error('Review not found.');
      err.statusCode = 404;
      throw err;
    }

    inMemoryReviews.splice(idx, 1);
    return { success: true, deletedId: reviewId };
  },

  /**
   * Reset in-memory reviews (useful for automated testing)
   */
  _clearMemory() {
    inMemoryReviews.length = 0;
  },
};

export default reviewService;
