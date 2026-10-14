import mongoose from 'mongoose';
import ContactMessage from '../models/ContactMessage.js';

const inMemoryContactMessages = [];

const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;
const EMAIL_REGEX = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/;

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

export function isValidContactInfo(info) {
  if (!info || typeof info !== 'string') return false;
  const trimmed = info.trim();
  if (EMAIL_REGEX.test(trimmed)) return true;

  // Normalize phone digits
  const cleanDigits = trimmed.replace(/\D/g, '');
  const tenDigits =
    cleanDigits.length === 12 && cleanDigits.startsWith('91')
      ? cleanDigits.slice(2)
      : cleanDigits.length === 11 && cleanDigits.startsWith('0')
      ? cleanDigits.slice(1)
      : cleanDigits;

  return INDIAN_MOBILE_REGEX.test(tenDigits);
}

export const contactService = {
  /**
   * Reset in-memory messages for testing
   */
  _resetMemory() {
    inMemoryContactMessages.length = 0;
  },

  /**
   * Validate and persist a customer contact inquiry
   */
  async createMessage(payload) {
    const { name, contactInfo, message } = payload || {};

    const trimmedName = typeof name === 'string' ? name.trim() : '';
    if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 100) {
      const err = new Error('Name must be between 2 and 100 characters');
      err.statusCode = 400;
      throw err;
    }

    const trimmedInfo = typeof contactInfo === 'string' ? contactInfo.trim() : '';
    if (!trimmedInfo || !isValidContactInfo(trimmedInfo)) {
      const err = new Error('Please provide a valid 10-digit mobile number or email address');
      err.statusCode = 400;
      throw err;
    }

    const trimmedMessage = typeof message === 'string' ? message.trim() : '';
    if (!trimmedMessage || trimmedMessage.length < 5 || trimmedMessage.length > 2000) {
      const err = new Error('Message must be between 5 and 2000 characters');
      err.statusCode = 400;
      throw err;
    }

    if (isDbConnected()) {
      const doc = new ContactMessage({
        name: trimmedName,
        contactInfo: trimmedInfo,
        message: trimmedMessage,
        status: 'NEW',
      });
      return await doc.save();
    }

    // In-memory fallback for isolated test environments
    const mockDoc = {
      _id: new mongoose.Types.ObjectId().toString(),
      name: trimmedName,
      contactInfo: trimmedInfo,
      message: trimmedMessage,
      status: 'NEW',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    inMemoryContactMessages.push(mockDoc);
    return mockDoc;
  },

  /**
   * Retrieve messages (for internal/admin verification)
   */
  async getMessages() {
    if (isDbConnected()) {
      return await ContactMessage.find().sort({ createdAt: -1 }).lean();
    }
    return [...inMemoryContactMessages];
  },
};

export default contactService;
