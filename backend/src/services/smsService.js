import smsProvider, { sendSms } from './notifications/smsProvider.js';

export const smsService = smsProvider;
export const sendSmsNotification = (params) => smsProvider.sendSmsNotification(params);
export { smsProvider, sendSms };
export default smsService;
