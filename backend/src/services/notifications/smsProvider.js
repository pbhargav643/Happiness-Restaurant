import env from '../../config/env.js';

/**
 * SMS Provider Service Abstraction (Phase 13)
 *
 * Location: backend/src/services/notifications/smsProvider.js
 *
 * Requirements:
 * - Isolated SMS messaging adapter.
 * - Supports official SMS gateways (Twilio, Fast2SMS, MSG91, generic REST).
 * - Handles events: ORDER_PLACED, ORDER_PREPARING, ORDER_READY.
 * - Strict pickup-only terminology (zero delivery, drivers, or tracking links).
 * - Safe error handling: never leaks API keys, tokens, or credentials in error messages or logs.
 * - Returns 'CONFIGURED' or 'NOT_CONFIGURED' safely.
 */
export const smsProvider = {
  name: 'SMS',

  /**
   * Check if SMS provider credentials and endpoints are configured
   * @returns {boolean}
   */
  isConfigured() {
    const apiKey = env.SMS_API_KEY || process.env.SMS_API_KEY;
    const apiUrl = env.SMS_API_URL || process.env.SMS_API_URL;
    return Boolean(apiKey && apiKey.trim() && apiUrl && apiUrl.trim());
  },

  /**
   * Safe status string for UI and inspection
   * @returns {'CONFIGURED' | 'NOT_CONFIGURED'}
   */
  getStatus() {
    return this.isConfigured() ? 'CONFIGURED' : 'NOT_CONFIGURED';
  },

  /**
   * Returns configured provider identifier (e.g. 'TWILIO', 'FAST2SMS', 'GENERIC_REST')
   * @returns {string}
   */
  getProviderName() {
    return env.SMS_PROVIDER || process.env.SMS_PROVIDER || (this.isConfigured() ? 'GENERIC_REST' : 'NONE');
  },

  /**
   * Normalizes mobile number to Indian 10-digit format for standard SMS gateways
   * @param {string|number} mobile
   * @returns {string|null}
   */
  normalizeRecipient(mobile) {
    if (!mobile) return null;
    const str = String(mobile).trim();
    const digits = str.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) {
      const local = digits.slice(2);
      return /^[6-9]\d{9}$/.test(local) ? local : null;
    }
    if (digits.length === 11 && digits.startsWith('0')) {
      const local = digits.slice(1);
      return /^[6-9]\d{9}$/.test(local) ? local : null;
    }
    if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
      return digits;
    }
    return null;
  },

  /**
   * Formats official pickup-only SMS text for each supported event
   * @param {Object} order
   * @param {string} event
   * @returns {string}
   */
  formatMessage(order = {}, event = 'ORDER_READY') {
    const orderId = order?.orderId || '';
    const pickupTime = order?.pickup?.timeFormatted || order?.pickup?.time || 'Scheduled Time';
    const readyTime = order?.readyTime || 'Ready Now';

    switch (event) {
      case 'ORDER_PLACED':
        return `HAPPINESS RESTAURANT: Order ${orderId} placed successfully. Scheduled Pickup: ${pickupTime}. Self-pickup only.`;

      case 'ORDER_PREPARING':
        return `HAPPINESS RESTAURANT: Order ${orderId} is now being prepared. We will notify you when it's ready. Self-pickup only.`;

      case 'ORDER_READY':
      default:
        return `HAPPINESS RESTAURANT: Order ${orderId} is ready for pickup! Ready Time: ${readyTime}. Collect parcel from Navjivan Colony, Bilimora. Self-pickup only.`;
    }
  },

  /**
   * Alias for backwards compatibility
   */
  formatSmsMessage(order = {}, defaultMessage = null) {
    if (defaultMessage && typeof defaultMessage === 'string' && defaultMessage.trim()) {
      return defaultMessage.trim();
    }
    return this.formatMessage(order, 'ORDER_READY');
  },

  /**
   * Send SMS notification (Production-Ready Provider Interface)
   *
   * @param {Object} params
   * @param {Object} [params.order] Order object/document
   * @param {string} [params.recipient] Customer mobile/phone
   * @param {string} [params.message] Custom message text override
   * @param {string} [params.type] Event type ('ORDER_PLACED' | 'ORDER_PREPARING' | 'ORDER_READY')
   * @param {string} [params.orderId] Order ID string
   * @param {Function} [params.customDispatcher] Mock dispatcher for testing
   * @returns {Promise<{success: boolean, providerMessageId: string|null, error: string|null}>}
   */
  async sendSmsNotification({
    order = null,
    recipient = null,
    message = null,
    type = 'ORDER_READY',
    orderId = null,
    customDispatcher = null,
  } = {}) {
    try {
      const rawPhone = recipient || order?.customer?.phone || order?.customer?.mobile;
      const cleanPhone = this.normalizeRecipient(rawPhone);

      if (!cleanPhone) {
        return {
          success: false,
          providerMessageId: null,
          error: `Invalid recipient phone number for SMS: "${rawPhone}"`,
        };
      }

      const resolvedOrderId = orderId || order?.orderId || 'UNKNOWN';

      // Custom Mock Dispatcher for Testing
      if (typeof customDispatcher === 'function') {
        try {
          const customRes = await customDispatcher({
            recipient: cleanPhone,
            message: message || this.formatMessage(order, type),
            orderId: resolvedOrderId,
            type,
            order,
          });

          return {
            success: Boolean(customRes?.success !== false),
            providerMessageId: customRes?.providerMessageId || customRes?.messageId || customRes?.id || `sms_mock_${Date.now()}`,
            error: customRes?.error ? String(customRes.error).replace(/Bearer\s+[^\s]+/gi, '[REDACTED_TOKEN]') : null,
          };
        } catch (dispatcherErr) {
          const sanitizedErr = String(dispatcherErr.message || 'Custom dispatch failed')
            .replace(/Bearer\s+[^\s]+/gi, '[REDACTED_TOKEN]');
          return {
            success: false,
            providerMessageId: null,
            error: sanitizedErr,
          };
        }
      }

      // Check configuration
      if (!this.isConfigured()) {
        return {
          success: false,
          providerMessageId: null,
          error: 'SMS provider not configured (SMS_NOT_CONFIGURED)',
        };
      }

      const finalMessage = message || this.formatMessage(order, type);
      const apiUrl = env.SMS_API_URL || process.env.SMS_API_URL;
      const apiKey = env.SMS_API_KEY || process.env.SMS_API_KEY;
      const senderId = env.SMS_SENDER_ID || env.SMS_SENDER || process.env.SMS_SENDER_ID || process.env.SMS_SENDER || 'HAPINE';

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        const payload = {
          sender: senderId,
          recipient: cleanPhone,
          message: finalMessage.trim(),
          orderId: resolvedOrderId,
          type,
        };

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'X-API-KEY': apiKey,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const rawError = await response.text().catch(() => '');
          const cleanError = String(rawError || '')
            .replace(/Bearer\s+[^\s]+/gi, '[REDACTED_TOKEN]')
            .slice(0, 150);
          return {
            success: false,
            providerMessageId: null,
            error: `SMS provider returned HTTP ${response.status}: ${cleanError || 'Request rejected'}`,
          };
        }

        const data = await response.json().catch(() => ({}));
        const providerMessageId =
          data?.messageId ||
          data?.id ||
          data?.sid ||
          data?.data?.[0]?.message_id ||
          `sms_live_${Date.now()}`;

        return {
          success: true,
          providerMessageId: String(providerMessageId),
          error: null,
        };
      } catch (reqErr) {
        clearTimeout(timeoutId);
        const isAbort = reqErr.name === 'AbortError';
        return {
          success: false,
          providerMessageId: null,
          error: isAbort ? 'SMS request timed out (8s limit)' : `SMS dispatch failed: ${reqErr.message}`,
        };
      }
    } catch (err) {
      return {
        success: false,
        providerMessageId: null,
        error: `Unexpected SMS error: ${err.message}`,
      };
    }
  },

  /**
   * send(...) wrapper for compatibility with tests expecting throw semantics
   * @param {Object} params
   */
  async send(params = {}) {
    const rawPhone = params.recipient || params.order?.customer?.phone || params.order?.customer?.mobile;
    const cleanPhone = this.normalizeRecipient(rawPhone);

    if (!cleanPhone) {
      const unconfMsg = !this.isConfigured() ? ' (SMS provider not configured)' : '';
      const err = new Error(`Invalid recipient phone number: "${rawPhone}"${unconfMsg}`);
      err.code = 'INVALID_RECIPIENT';
      throw err;
    }

    if (!this.isConfigured() && typeof params.customDispatcher !== 'function') {
      const err = new Error('SMS provider not configured (SMS_NOT_CONFIGURED)');
      err.code = 'NOT_CONFIGURED';
      throw err;
    }

    const res = await this.sendSmsNotification(params);

    if (!res.success) {
      const err = new Error(res.error || 'SMS delivery failed');
      err.code = 'DISPATCH_FAILED';
      throw err;
    }

    return {
      success: true,
      messageId: res.providerMessageId,
      providerMessageId: res.providerMessageId,
    };
  },
};

export const sendSms = (params) => smsProvider.sendSmsNotification(params);
export default smsProvider;
