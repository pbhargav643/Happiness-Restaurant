import whatsappProvider, { sendWhatsApp } from '../../src/services/notifications/whatsappProvider.js';

console.log('====================================================');
console.log('PHASE 13: WHATSAPP PROVIDER ADAPTER TEST SUITE');
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
    // 1. Service Identification & Methods
    console.log('--- 1. Provider Interface Inspection ---');
    assert(whatsappProvider.name === 'WHATSAPP', 'Provider name is WHATSAPP');
    assert(typeof whatsappProvider.isConfigured === 'function', 'isConfigured is a function');
    assert(typeof whatsappProvider.getStatus === 'function', 'getStatus is a function');
    assert(typeof whatsappProvider.getProviderName === 'function', 'getProviderName is a function');
    assert(typeof whatsappProvider.normalizeRecipient === 'function', 'normalizeRecipient is a function');
    assert(typeof whatsappProvider.formatMessage === 'function', 'formatMessage is a function');
    assert(typeof whatsappProvider.sendWhatsAppNotification === 'function', 'sendWhatsAppNotification is a function');
    assert(typeof sendWhatsApp === 'function', 'sendWhatsApp export is a function');

    // 2. Safe Configuration Status (Zero Secrets)
    console.log('\n--- 2. Safe Configuration Status ---');
    const status = whatsappProvider.getStatus();
    assert(status === 'CONFIGURED' || status === 'NOT_CONFIGURED', `Safe status: ${status}`);
    const providerName = whatsappProvider.getProviderName();
    assert(typeof providerName === 'string', `Provider name is string: ${providerName}`);

    // 3. Recipient Phone Normalization
    console.log('\n--- 3. Recipient Phone Normalization (+91) ---');
    assert(whatsappProvider.normalizeRecipient('9876543210') === '+919876543210', '10-digit number formatted to +919876543210');
    assert(whatsappProvider.normalizeRecipient('+919876543210') === '+919876543210', '+91 prefixed number preserved');
    assert(whatsappProvider.normalizeRecipient('919876543210') === '+919876543210', '91 prefixed number normalized');
    assert(whatsappProvider.normalizeRecipient('09876543210') === '+919876543210', 'Leading 0 stripped and normalized');
    assert(whatsappProvider.normalizeRecipient('12345') === null, 'Short invalid number returns null');
    assert(whatsappProvider.normalizeRecipient('abcdefghij') === null, 'Non-numeric string returns null');
    assert(whatsappProvider.normalizeRecipient('') === null, 'Empty string returns null');

    // 4. Message Formatting for Required Events
    console.log('\n--- 4. Event Message Formatting ---');
    const testOrder = {
      orderId: 'RF-20260925-111111',
      customer: { name: 'Vikram', mobile: '9876543210' },
      pickup: { dateFormatted: 'Friday, 25 Sep 2026', timeFormatted: '7:30 PM' },
      readyTime: '7:45 PM',
      subtotal: 450,
    };

    const msgPlaced = whatsappProvider.formatMessage(testOrder, 'ORDER_PLACED');
    assert(msgPlaced.includes('HAPPINESS RESTAURANT'), 'ORDER_PLACED has restaurant name');
    assert(msgPlaced.includes('RF-20260925-111111'), 'ORDER_PLACED has orderId');
    assert(msgPlaced.includes('placed successfully'), 'ORDER_PLACED has placed confirmation');
    assert(msgPlaced.includes('Self Pickup Only'), 'ORDER_PLACED enforces Self Pickup Only');

    const msgPreparing = whatsappProvider.formatMessage(testOrder, 'ORDER_PREPARING');
    assert(msgPreparing.includes('being freshly prepared'), 'ORDER_PREPARING has preparing text');
    assert(msgPreparing.includes('Self Pickup Only'), 'ORDER_PREPARING enforces Self Pickup Only');

    const msgReady = whatsappProvider.formatMessage(testOrder, 'ORDER_READY');
    assert(msgReady.includes('ready for pickup'), 'ORDER_READY has ready for pickup text');
    assert(msgReady.includes('7:45 PM'), 'ORDER_READY contains readyTime');
    assert(msgReady.includes('restaurant counter'), 'ORDER_READY specifies restaurant counter collection');

    // 5. Unconfigured Behavior (Zero fake success)
    console.log('\n--- 5. Unconfigured Safety ---');
    if (!whatsappProvider.isConfigured()) {
      const unconfRes = await whatsappProvider.sendWhatsAppNotification({
        order: testOrder,
        recipient: '9876543210',
        type: 'ORDER_READY',
      });
      assert(unconfRes.success === false, 'Returns success: false when unconfigured');
      assert(unconfRes.error.includes('WHATSAPP_NOT_CONFIGURED') || unconfRes.error.includes('not configured'), 'Clear unconfigured error message');
      assert(unconfRes.providerMessageId === null, 'providerMessageId is null when unconfigured');
    }

    // 6. Mock Dispatcher for Automated Testing
    console.log('\n--- 6. Mock Dispatcher Integration ---');
    let mockInvoked = false;
    const mockDispatcher = async (payload) => {
      mockInvoked = true;
      return { success: true, messageId: 'wa_mock_msg_999' };
    };

    const mockRes = await whatsappProvider.sendWhatsAppNotification({
      order: testOrder,
      recipient: '9876543210',
      type: 'ORDER_READY',
      customDispatcher: mockDispatcher,
    });

    assert(mockInvoked === true, 'Mock dispatcher called successfully');
    assert(mockRes.success === true, 'Mock dispatch returned success: true');
    assert(mockRes.providerMessageId === 'wa_mock_msg_999', 'Mock dispatch returned providerMessageId');

  } catch (err) {
    console.error('WhatsApp provider test error:', err);
    failCount++;
  }

  console.log('\n====================================================');
  console.log(`TOTAL PASSED: ${passCount}`);
  console.log(`TOTAL FAILED: ${failCount}`);
  console.log('====================================================\n');

  if (failCount > 0) process.exit(1);
}

runTests();
