import whatsappProvider, { sendWhatsApp } from './whatsappProvider.js';
import smsProvider, { sendSms } from './smsProvider.js';

/**
 * Notification Provider Abstraction Layer (Phase 13)
 *
 * Location: backend/src/services/notifications/index.js
 *
 * Exposes:
 * - sendWhatsApp(params)
 * - sendSms(params)
 * - whatsappProvider
 * - smsProvider
 * - getProvidersStatus()
 */
export function getProvidersStatus() {
  return {
    whatsapp: {
      configured: whatsappProvider.isConfigured(),
      provider: whatsappProvider.getProviderName(),
      status: whatsappProvider.getStatus(),
    },
    sms: {
      configured: false,
      provider: 'DEACTIVATED',
      status: 'DEACTIVATED',
    },
  };
}

export const notificationProviders = {
  WHATSAPP: whatsappProvider,
  SMS: smsProvider,
};

export {
  whatsappProvider,
  smsProvider,
  sendWhatsApp,
  sendSms,
};

export default {
  whatsappProvider,
  smsProvider,
  sendWhatsApp,
  sendSms,
  getProvidersStatus,
  notificationProviders,
};
