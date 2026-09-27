import smsProvider, { sendSms } from '../../src/services/notifications/smsProvider.js';

console.log('====================================================');
console.log('PHASE 13: SMS PROVIDER ADAPTER TEST SUITE');
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
    assert(smsProvider.name === 'SMS', 'Provider name is SMS');
    assert(typeof smsProvider.isConfigured === 'function', 'isConfigured is a function');
    assert(typeof smsProvider.getStatus === 'function', 'getStatus is a function');
    assert(typeof smsProvider.getProviderName === 'function', 'getProviderName is a function');
    assert(typeof smsProvider.normalizeRecipient === 'function', 'normalizeRecipient is a function');
    assert(typeof smsProvider.formatMessage === 'function', 'formatMessage is a function');
    assert(typeof smsProvider.sendSmsNotification === 'function', 'sendSmsNotification is a function');
    assert(typeof sendSms === 'function', 'sendSms export is a function');

    // 2. Safe Configuration Status (Zero Secrets)
    console.log('\n--- 2. Safe Configuration Status ---');
    const status = smsProvider.getStatus();
    assert(status === 'CONFIGURED' || status === 'NOT_CONFIGURED', `Safe status: ${status}`);
    const providerName = smsProvider.getProviderName();
    assert(typeof providerName === 'string', `Provider name is string: ${providerName}`);

    // 3. Recipient Phone Normalization
    console.log('\n--- 3. Recipient Phone Normalization (10 digits) ---');
    assert(smsProvider.normalizeRecipient('9876543210') === '9876543210', '10-digit number normalized');
    assert(smsProvider.normalizeRecipient('+919876543210') === '9876543210', '+91 prefix stripped to local 10-digit');
    assert(smsProvider.normalizeRecipient('919876543210') === '9876543210', '91 prefix stripped to local 10-digit');
    assert(smsProvider.normalizeRecipient('09876543210') === '9876543210', 'Leading 0 stripped to local 10-digit');
    assert(smsProvider.normalizeRecipient('12345') === null, 'Short invalid number returns null');
    assert(smsProvider.normalizeRecipient('abcdefghij') === null, 'Non-numeric string returns null');
    assert(smsProvider.normalizeRecipient('') === null, 'Empty string returns null');

    // 4. Message Formatting for Required Events
    console.log('\n--- 4. Event Message Formatting ---');
    const testOrder = {
      orderId: 'RF-20260925-222222',
      customer: { name: 'Pooja', mobile: '9876543210' },
      pickup: { timeFormatted: '8:00 PM', time: '20:00' },
      readyTime: '8:15 PM',
    };

    const msgPlaced = smsProvider.formatMessage(testOrder, 'ORDER_PLACED');
    assert(msgPlaced.includes('HAPPINESS RESTAURANT'), 'ORDER_PLACED has restaurant name');
    assert(msgPlaced.includes('RF-20260925-222222'), 'ORDER_PLACED has orderId');
    assert(msgPlaced.includes('Self-pickup only'), 'ORDER_PLACED has self-pickup instruction');

    const msgPreparing = smsProvider.formatMessage(testOrder, 'ORDER_PREPARING');
    assert(msgPreparing.includes('now being prepared'), 'ORDER_PREPARING has preparing text');
    assert(msgPreparing.includes('Self-pickup only'), 'ORDER_PREPARING has self-pickup instruction');

    const msgReady = smsProvider.formatMessage(testOrder, 'ORDER_READY');
    assert(msgReady.includes('ready for pickup'), 'ORDER_READY has ready for pickup text');
    assert(msgReady.includes('8:15 PM'), 'ORDER_READY contains readyTime');
    assert(msgReady.includes('restaurant counter'), 'ORDER_READY mentions restaurant counter');

    // 5. Unconfigured Behavior (Zero fake success)
    console.log('\n--- 5. Unconfigured Safety ---');
    if (!smsProvider.isConfigured()) {
      const unconfRes = await smsProvider.sendSmsNotification({
        order: testOrder,
        recipient: '9876543210',
        type: 'ORDER_READY',
      });
      assert(unconfRes.success === false, 'Returns success: false when unconfigured');
      assert(unconfRes.error.includes('SMS_NOT_CONFIGURED') || unconfRes.error.includes('not configured'), 'Clear unconfigured error message');
      assert(unconfRes.providerMessageId === null, 'providerMessageId is null when unconfigured');
    }

    // 6. Mock Dispatcher for Automated Testing
    console.log('\n--- 6. Mock Dispatcher Integration ---');
    let mockInvoked = false;
    const mockDispatcher = async (payload) => {
      mockInvoked = true;
      return { success: true, messageId: 'sms_mock_msg_888' };
    };

    const mockRes = await smsProvider.sendSmsNotification({
      order: testOrder,
      recipient: '9876543210',
      type: 'ORDER_READY',
      customDispatcher: mockDispatcher,
    });

    assert(mockInvoked === true, 'Mock dispatcher called successfully');
    assert(mockRes.success === true, 'Mock dispatch returned success: true');
    assert(mockRes.providerMessageId === 'sms_mock_msg_888', 'Mock dispatch returned providerMessageId');

  } catch (err) {
    console.error('SMS provider test error:', err);
    failCount++;
  }

  console.log('\n====================================================');
  console.log(`TOTAL PASSED: ${passCount}`);
  console.log(`TOTAL FAILED: ${failCount}`);
  console.log('====================================================\n');

  if (failCount > 0) process.exit(1);
}

runTests();
