import mongoose from 'mongoose';

/**
 * Contact Message Schema
 * Stores customer contact inquiries submitted via the website contact form.
 */
const contactMessageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    contactInfo: {
      type: String,
      required: [true, 'Mobile number or email is required'],
      trim: true,
      maxlength: [100, 'Contact info cannot exceed 100 characters'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      minlength: [5, 'Message must be at least 5 characters'],
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    status: {
      type: String,
      enum: ['NEW', 'READ', 'RESPONDED', 'ARCHIVED'],
      default: 'NEW',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const ContactMessage =
  mongoose.models.ContactMessage ||
  mongoose.model('ContactMessage', contactMessageSchema);

export default ContactMessage;
