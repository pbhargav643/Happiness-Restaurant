import 'dotenv/config';

/**
 * Centralized Environment Configuration
 *
 * Exposes environment variables with safe defaults for development.
 * Never exposes credentials or secrets.
 */
export const env = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  MONGODB_URI: process.env.MONGODB_URI || '',
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  JWT_SECRET: process.env.JWT_SECRET || 'dev_jwt_secret_fallback_key_do_not_use_in_prod_12345',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
  ADMIN_NAME: process.env.ADMIN_NAME || 'Admin Manager',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@happinessrestaurant.com',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'Admin@12345',
  // WhatsApp Notification Provider (Phase 13)
  WHATSAPP_PROVIDER: process.env.WHATSAPP_PROVIDER || '',
  WHATSAPP_API_URL: process.env.WHATSAPP_API_URL || '',
  WHATSAPP_API_KEY: process.env.WHATSAPP_API_KEY || '',
  WHATSAPP_SENDER: process.env.WHATSAPP_SENDER || '',
  WHATSAPP_READY_TEMPLATE: process.env.WHATSAPP_READY_TEMPLATE || '',
  // SMS Notification Provider (Phase 13)
  SMS_PROVIDER: process.env.SMS_PROVIDER || '',
  SMS_API_URL: process.env.SMS_API_URL || '',
  SMS_API_KEY: process.env.SMS_API_KEY || '',
  SMS_SENDER: process.env.SMS_SENDER || '',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production'
};

export const PORT = env.PORT;
export const MONGODB_URI = env.MONGODB_URI;
export const NODE_ENV = env.NODE_ENV;
export const CLIENT_URL = env.CLIENT_URL;
export const JWT_SECRET = env.JWT_SECRET;
export const JWT_EXPIRES_IN = env.JWT_EXPIRES_IN;
export const ADMIN_NAME = env.ADMIN_NAME;
export const ADMIN_EMAIL = env.ADMIN_EMAIL;
export const ADMIN_PASSWORD = env.ADMIN_PASSWORD;

// WhatsApp Exports
export const WHATSAPP_PROVIDER = env.WHATSAPP_PROVIDER;
export const WHATSAPP_API_URL = env.WHATSAPP_API_URL;
export const WHATSAPP_API_KEY = env.WHATSAPP_API_KEY;
export const WHATSAPP_SENDER = env.WHATSAPP_SENDER;
export const WHATSAPP_READY_TEMPLATE = env.WHATSAPP_READY_TEMPLATE;

// SMS Exports
export const SMS_PROVIDER = env.SMS_PROVIDER;
export const SMS_API_URL = env.SMS_API_URL;
export const SMS_API_KEY = env.SMS_API_KEY;
export const SMS_SENDER = env.SMS_SENDER;

export default env;

