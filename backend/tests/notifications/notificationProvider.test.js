import { whatsappProvider } from '../../src/services/notifications/whatsappProvider.js';
import { smsProvider } from '../../src/services/notifications/smsProvider.js';
import { getProvidersStatus } from '../../src/services/notifications/index.js';

console.log('====================================================');
console.log('PHASE 13 PROMPT 3: NOTIFICATION PROVIDER AUDIT TEST');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${message}`);
    failCount++;
  }
}

async function runTests() {
  try {
    // 1. WhatsApp Provider Interface Audit
    console.log('--- 1. WhatsApp Provider Interface Audit ---');
    assert(typeof whatsappProvider.isConfigured === 'function', 'whatsappProvider.isConfigured is function');
    assert(typeof whatsappProvider.getStatus === 'function', 'whatsappProvider.getStatus is function');
    assert(typeof whatsappProvider.normalizeRecipient === 'function', 'whatsappProvider.normalizeRecipient is function');
    assert(typeof whatsappProvider.formatMessage === 'function', 'whatsappProvider.formatMessage is function');
    assert(typeof whatsappProvider.sendWhatsAppNotification === 'function', 'whatsappProvider.sendWhatsAppNotification is function');

    // 2. SMS Provider Interface Audit
    console.log('\n--- 2. SMS Provider Interface Audit ---');
    assert(typeof smsProvider.isConfigured === 'function', 'smsProvider.isConfigured is function');
    assert(typeof smsProvider.getStatus === 'function', 'smsProvider.getStatus is function');
    assert(typeof smsProvider.normalizeRecipient === 'function', 'smsProvider.normalizeRecipient is function');
    assert(typeof smsProvider.formatMessage === 'function', 'smsProvider.formatMessage is function');
    assert(typeof smsProvider.sendSmsNotification === 'function', 'smsProvider.sendSmsNotification is function');

    // 3. Pickup-Only Messaging & Zero Delivery Words
    console.log('\n--- 3. Pickup-Only Terminology Enforcement ---');
    const mockOrder = {
      orderId: 'RF-TEST-0001',
      customer: { name: 'Rahul Sharma', mobile: '9876543210' },
      pickup: { date: '2026-09-24', time: '19:30', timeFormatted: '7:30 PM' },
      readyTime: '7:45 PM',
      subtotal: 520,
    };

    const waReady = whatsappProvider.formatMessage(mockOrder, 'ORDER_READY');
    assert(waReady.includes('HAPPINESS RESTAURANT'), 'WhatsApp message contains restaurant brand');
    assert(waReady.includes('RF-TEST-0001'), 'WhatsApp message contains Order ID');
    assert(waReady.includes('ready for pickup'), 'WhatsApp message specifies pickup readiness');
    assert(waReady.includes('Self Pickup Only'), 'WhatsApp message enforces Self Pickup Only');
    assert(!waReady.toLowerCase().includes('delivery'), 'WhatsApp message has zero delivery references');
    assert(!waReady.toLowerCase().includes('driver'), 'WhatsApp message has zero driver references');

    const smsReady = smsProvider.formatMessage(mockOrder, 'ORDER_READY');
    assert(smsReady.includes('HAPPINESS RESTAURANT'), 'SMS message contains restaurant brand');
    assert(smsReady.includes('RF-TEST-0001'), 'SMS message contains Order ID');
    assert(smsReady.includes('Self-pickup only'), 'SMS message enforces Self-pickup only');
    assert(!smsReady.toLowerCase().includes('delivery'), 'SMS message has zero delivery references');

    // 4. Phone Number Normalization
    console.log('\n--- 4. Mobile Number Sanitization ---');
    assert(whatsappProvider.normalizeRecipient('9876543210') === '+919876543210', 'WhatsApp formats 10-digit to +91');
    assert(whatsappProvider.normalizeRecipient('+919876543210') === '+919876543210', 'WhatsApp preserves +91');
    assert(whatsappProvider.normalizeRecipient('1234') === null, 'WhatsApp rejects invalid short number');
    assert(smsProvider.normalizeRecipient('9876543210') === '9876543210', 'SMS normalizes to 10 digits');
    assert(smsProvider.normalizeRecipient('+919876543210') === '9876543210', 'SMS strips +91 to 10 digits');
    assert(smsProvider.normalizeRecipient('invalid') === null, 'SMS rejects non-numeric input');

    // 5. Providers Status Inspection
    console.log('\n--- 5. Providers Configuration Status ---');
    const providersStatus = getProvidersStatus();
    assert(typeof providersStatus === 'object', 'getProvidersStatus returns object');
    assert(typeof providersStatus.whatsapp.configured === 'boolean', 'whatsapp.configured is boolean');
    assert(typeof providersStatus.sms.configured === 'boolean', 'sms.configured is boolean');

  } catch (err) {
    console.error('Test execution error:', err);
    failCount++;
  }

  console.log('\n====================================================');
  console.log(`TOTAL PASSED: ${passCount}`);
  console.log(`TOTAL FAILED: ${failCount}`);
  console.log('====================================================\n');

  if (failCount > 0) process.exit(1);
}

runTests();
