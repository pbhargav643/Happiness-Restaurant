import whatsappProvider from './whatsappProvider.js';
import smsProvider from './smsProvider.js';

/**
 * Notification Providers Registry
 * Provides a unified map of notification dispatch adapters.
 */
export const notificationProviders = {
  WHATSAPP: whatsappProvider,
  SMS: smsProvider,
};

export { whatsappProvider, smsProvider };
export default notificationProviders;
