import env from '../../config/env.js';

/**
 * WhatsApp Provider Service Abstraction (Phase 13)
 *
 * Location: backend/src/services/notifications/whatsappProvider.js
 *
 * Requirements:
 * - Isolated WhatsApp messaging adapter.
 * - Supports official WhatsApp Cloud API (Meta) & generic REST provider integrations.
 * - Handles events: ORDER_PLACED, ORDER_PREPARING, ORDER_READY.
 * - Strict pickup-only terminology (zero delivery, drivers, or tracking links).
 * - Safe error handling: never leaks API keys, tokens, or credentials in error messages or logs.
 * - Returns 'CONFIGURED' or 'NOT_CONFIGURED' safely.
 */
export const whatsappProvider = {
  name: 'WHATSAPP',

  /**
   * Check if WhatsApp provider credentials and endpoints are configured
   * @returns {boolean}
   */
  isConfigured() {
    const apiKey = env.WHATSAPP_API_KEY || process.env.WHATSAPP_API_KEY;
    const apiUrl = env.WHATSAPP_API_URL || process.env.WHATSAPP_API_URL;
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
   * Returns configured provider identifier (e.g. 'META', 'TWILIO', 'GENERIC_REST')
   * @returns {string}
   */
  getProviderName() {
    return env.WHATSAPP_PROVIDER || process.env.WHATSAPP_PROVIDER || (this.isConfigured() ? 'GENERIC_REST' : 'NONE');
  },

  /**
   * Normalizes mobile number to Indian WhatsApp format (+91XXXXXXXXXX)
   * @param {string|number} mobile
   * @returns {string|null}
   */
  normalizeRecipient(mobile) {
    if (!mobile) return null;
    const str = String(mobile).trim();
    const digits = str.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) {
      const local = digits.slice(2);
      return /^[6-9]\d{9}$/.test(local) ? `+91${local}` : null;
    }
    if (digits.length === 11 && digits.startsWith('0')) {
      const local = digits.slice(1);
      return /^[6-9]\d{9}$/.test(local) ? `+91${local}` : null;
    }
    if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
      return `+91${digits}`;
    }
    return null;
  },

  /**
   * Formats official pickup-only WhatsApp message for each supported event
   * @param {Object} order
   * @param {string} event
   * @returns {string}
   */
  formatMessage(order = {}, event = 'ORDER_READY') {
    const orderId = order?.orderId || '';
    const customerName = order?.customer?.name || 'Customer';
    const pickupDate = order?.pickup?.dateFormatted || order?.pickup?.date || 'Today';
    const pickupTime = order?.pickup?.timeFormatted || order?.pickup?.time || 'Scheduled Time';
    const readyTime = order?.readyTime || 'Ready Now';
    const subtotal = order?.subtotal != null ? `₹${order.subtotal}` : '';

    switch (event) {
      case 'ORDER_PLACED':
        return `HAPPINESS RESTAURANT\n\nHello ${customerName}, your pickup order ${orderId} has been placed successfully!\n\nPickup Date: ${pickupDate}\nPickup Time: ${pickupTime}${subtotal ? `\nTotal Amount: ${subtotal}` : ''}\n\nWe will notify you when your food is being prepared.\n\nSelf Pickup Only. Thank you!`;

      case 'ORDER_PREPARING':
        return `HAPPINESS RESTAURANT\n\nHello ${customerName}, your order ${orderId} is now being freshly prepared by our chefs!\n\nScheduled Pickup: ${pickupTime}\n\nWe will notify you as soon as your parcel is ready for collection.\n\nSelf Pickup Only.`;

      case 'ORDER_READY':
      default:
        return `HAPPINESS RESTAURANT\n\nYour order ${orderId} is ready for pickup.\n\nPickup Time:\n${readyTime}\n\nPlease collect your parcel from our restaurant counter.\n\nSelf Pickup Only.`;
    }
  },

  /**
   * Helper to build template parameters for WhatsApp Business API
   */
  buildTemplateData(order = {}, templateData = {}) {
    return {
      customerName: templateData.customerName || order?.customer?.name || 'Customer',
      orderId: templateData.orderId || order?.orderId || '',
      readyTime: templateData.readyTime || order?.readyTime || 'Ready Now',
      pickupAddress: templateData.pickupAddress || 'QX8M+J67, Navjivan Colony, Bilimora, Gujarat 396325, India',
      restaurantPhone: templateData.restaurantPhone || '7600854499',
    };
  },

  /**
   * Send WhatsApp notification (Production-Ready Provider Interface)
   *
   * @param {Object} params
   * @param {Object} [params.order] Order object/document
   * @param {string} [params.recipient] Customer mobile/phone
   * @param {string} [params.message] Custom message text override
   * @param {string} [params.type] Event type ('ORDER_PLACED' | 'ORDER_PREPARING' | 'ORDER_READY')
   * @param {string} [params.orderId] Order ID string
   * @param {Object} [params.templateData] Template substitution parameters
   * @param {Function} [params.customDispatcher] Mock dispatcher for testing
   * @returns {Promise<{success: boolean, providerMessageId: string|null, error: string|null}>}
   */
  async sendWhatsAppNotification({
    order = null,
    recipient = null,
    message = null,
    type = 'ORDER_READY',
    orderId = null,
    templateData = {},
    customDispatcher = null,
  } = {}) {
    try {
      const rawPhone = recipient || order?.customer?.phone || order?.customer?.mobile;
      const cleanPhone = this.normalizeRecipient(rawPhone);

      if (!cleanPhone) {
        return {
          success: false,
          providerMessageId: null,
          error: `Invalid recipient phone number for WhatsApp: "${rawPhone}"`,
        };
      }

      const resolvedOrderId = orderId || order?.orderId || 'UNKNOWN';

      // Custom Mock Dispatcher for Testing
      if (typeof customDispatcher === 'function') {
        try {
          const tData = this.buildTemplateData(order, templateData);
          const customRes = await customDispatcher({
            recipient: cleanPhone,
            message: message || this.formatMessage(order, type),
            orderId: resolvedOrderId,
            type,
            templateData: tData,
            order,
          });

          return {
            success: Boolean(customRes?.success !== false),
            providerMessageId: customRes?.providerMessageId || customRes?.messageId || customRes?.id || `wa_mock_${Date.now()}`,
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
          error: 'WhatsApp provider not configured (WHATSAPP_NOT_CONFIGURED)',
        };
      }

      const finalMessage = message || this.formatMessage(order, type);
      const apiUrl = env.WHATSAPP_API_URL || process.env.WHATSAPP_API_URL;
      const apiKey = env.WHATSAPP_API_KEY || process.env.WHATSAPP_API_KEY;
      const sender = env.WHATSAPP_SENDER || process.env.WHATSAPP_SENDER;
      const providerType = (env.WHATSAPP_PROVIDER || process.env.WHATSAPP_PROVIDER || '').toUpperCase();
      const templateNamespace = env.WHATSAPP_TEMPLATE_NAMESPACE || process.env.WHATSAPP_TEMPLATE_NAMESPACE || '';

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        let payload;
        let headers = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        };

        if (providerType === 'META' || apiUrl.includes('graph.facebook.com')) {
          // Meta WhatsApp Cloud API format
          payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanPhone.replace('+', ''),
            type: 'text',
            text: {
              preview_url: false,
              body: finalMessage.trim(),
            },
          };
        } else {
          // Standard / Generic REST WhatsApp Provider format
          payload = {
            sender,
            recipient: cleanPhone,
            message: finalMessage.trim(),
            orderId: resolvedOrderId,
            type,
            templateNamespace,
          };
        }

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers,
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
            error: `WhatsApp provider returned HTTP ${response.status}: ${cleanError || 'Request rejected'}`,
          };
        }

        const data = await response.json().catch(() => ({}));
        const providerMessageId =
          data?.messages?.[0]?.id ||
          data?.messageId ||
          data?.id ||
          data?.sid ||
          `wa_live_${Date.now()}`;

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
          error: isAbort ? 'WhatsApp request timed out (8s limit)' : `WhatsApp dispatch failed: ${reqErr.message}`,
        };
      }
    } catch (err) {
      return {
        success: false,
        providerMessageId: null,
        error: `Unexpected WhatsApp error: ${err.message}`,
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
      const unconfMsg = !this.isConfigured() ? ' (WhatsApp provider not configured)' : '';
      const err = new Error(`Invalid recipient phone number: "${rawPhone}"${unconfMsg}`);
      err.code = 'INVALID_RECIPIENT';
      throw err;
    }

    if (!this.isConfigured() && typeof params.customDispatcher !== 'function') {
      const err = new Error('WhatsApp provider not configured (WHATSAPP_NOT_CONFIGURED)');
      err.code = 'NOT_CONFIGURED';
      throw err;
    }

    const res = await this.sendWhatsAppNotification(params);

    if (!res.success) {
      const err = new Error(res.error || 'WhatsApp delivery failed');
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

export const sendWhatsApp = (params) => whatsappProvider.sendWhatsAppNotification(params);
export default whatsappProvider;
