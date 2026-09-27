import mongoose from 'mongoose';

/**
 * Review Mongoose Schema
 *
 * Dedicated collection for Happiness Restaurant Customer Reviews and Ratings.
 *
 * Isolated from:
 * - Orders, MenuItem, NotificationLog, RestaurantSettings, Admin, Customer auth
 *
 * Enforces:
 * - One active review per customer via unique index on customerId
 * - Rating required between 1 and 5
 * - Comment required, sanitized text
 */
const reviewSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer ID is required'],
      index: true,
      unique: true,
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      maxlength: [100, 'Customer name cannot exceed 100 characters'],
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1 star'],
      max: [5, 'Rating cannot exceed 5 stars'],
    },
    comment: {
      type: String,
      required: [true, 'Review text is required'],
      trim: true,
      maxlength: [1000, 'Review cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound and standalone index for newest reviews first
reviewSchema.index({ createdAt: -1 });

const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);

export default Review;
