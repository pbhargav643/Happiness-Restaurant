import mongoose from 'mongoose';

/**
 * Utility function to generate a clean URL-friendly slug from item name
 */
export function generateSlug(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // remove non-word chars (preserve whitespace and hyphens)
    .replace(/[\s_-]+/g, '-')  // replace spaces and underscores with single hyphen
    .replace(/^-+|-+$/g, '');  // remove leading/trailing hyphens
}

/**
 * MenuItem Mongoose Schema
 *
 * Fields:
 * - name: String, required, trimmed
 * - slug: String, required, unique, lookup-friendly
 * - category: String, required, indexed
 * - price: Number, required, non-negative
 * - image: String, default null
 * - description: String, default ''
 * - isAvailable: Boolean, default true, indexed
 * - createdAt, updatedAt: Timestamps enabled
 *
 * Indexes:
 * - slug: unique index
 * - category: index
 * - isAvailable: index
 * - compound index: { category: 1, isAvailable: 1 }
 */
const menuItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
      validate: {
        validator: (v) => typeof v === 'string' && v.trim().length > 0,
        message: 'Item name cannot be empty',
      },
    },
    slug: {
      type: String,
      required: [true, 'Item slug is required'],
      default: function () {
        return generateSlug(this.name);
      },
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    category: {
      type: String,
      required: [true, 'Category identifier is required'],
      trim: true,
      lowercase: true,
      index: true,
      validate: {
        validator: (v) => typeof v === 'string' && v.trim().length > 0,
        message: 'Category cannot be empty',
      },
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price must be a non-negative number'],
    },
    image: {
      type: String,
      default: null,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for frequent category + availability queries
menuItemSchema.index({ category: 1, isAvailable: 1 });

// Pre-validate hook: auto-generate slug if not explicitly provided
menuItemSchema.pre('validate', function (next) {
  if (!this.slug && this.name) {
    this.slug = generateSlug(this.name);
  }
  next();
});

const MenuItem = mongoose.models.MenuItem || mongoose.model('MenuItem', menuItemSchema);

export default MenuItem;
