import whatsappProvider, { sendWhatsApp } from './notifications/whatsappProvider.js';

export const whatsappService = whatsappProvider;
export const sendWhatsAppNotification = (params) => whatsappProvider.sendWhatsAppNotification(params);
export { whatsappProvider, sendWhatsApp };
export default whatsappService;
