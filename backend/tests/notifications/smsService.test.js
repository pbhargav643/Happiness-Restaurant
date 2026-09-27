import smsService from '../../src/services/smsService.js';

console.log('====================================================');
console.log('PHASE 13: SMS SERVICE TEST SUITE');
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
    // 1. Service Identification
    console.log('--- 1. Service Identification ---');
    assert(smsService.name === 'SMS', 'Provider name is SMS');
    assert(typeof smsService.isConfigured === 'function', 'isConfigured is a function');
    assert(typeof smsService.getStatus === 'function', 'getStatus is a function');
    assert(typeof smsService.send === 'function', 'send is a function');

    // 2. Safe Configuration Status
    console.log('\n--- 2. Safe Configuration Status ---');
    const status = smsService.getStatus();
    assert(status === 'CONFIGURED' || status === 'NOT_CONFIGURED', `Safe status returned: ${status}`);

    // 3. Recipient Normalization
    console.log('\n--- 3. Recipient Phone Normalization ---');
    assert(smsService.normalizeRecipient('9876543210') === '9876543210', '10-digit number normalized');
    assert(smsService.normalizeRecipient('+919876543210') === '9876543210', '+91 prefix stripped to local 10-digit');
    assert(smsService.normalizeRecipient('919876543210') === '9876543210', '91 prefix stripped to local 10-digit');
    assert(smsService.normalizeRecipient('09876543210') === '9876543210', 'Leading 0 stripped to local 10-digit');
    assert(smsService.normalizeRecipient('12345') === null, 'Short invalid number rejected (returns null)');
    assert(smsService.normalizeRecipient('abcdefghij') === null, 'Non-numeric string rejected (returns null)');
    assert(smsService.normalizeRecipient('') === null, 'Empty string rejected (returns null)');

    // 4. Send Behavior when Unconfigured
    console.log('\n--- 4. Unconfigured Safety & Error Isolation ---');
    if (!smsService.isConfigured()) {
      try {
        await smsService.send({
          recipient: '9876543210',
          message: 'Test pickup SMS notification',
          orderId: 'RF-20260925-000002',
          type: 'ORDER_READY',
        });
        assert(false, 'Should throw when unconfigured');
      } catch (err) {
        assert(err.code === 'NOT_CONFIGURED', 'Throws NOT_CONFIGURED code when credentials are not set');
        assert(err.message.includes('SMS_NOT_CONFIGURED') || err.message.includes('not configured'), 'Clear non-configured error message');
      }
    }

    // 5. Invalid Recipient Handling
    console.log('\n--- 5. Invalid Recipient Validation ---');
    try {
      await smsService.send({
        recipient: 'invalid_number',
        message: 'Test message',
        orderId: 'RF-20260925-000002',
        type: 'ORDER_READY',
      });
      assert(false, 'Should throw on invalid recipient');
    } catch (err) {
      assert(err.code === 'INVALID_RECIPIENT', 'Rejects invalid recipient with INVALID_RECIPIENT');
    }

    // 6. Custom Mock Dispatcher for Testing
    console.log('\n--- 6. Mock Dispatcher for Test Mode ---');
    let mockCalled = false;
    const mockDispatcher = async (payload) => {
      mockCalled = true;
      return { success: true, messageId: 'sms_test_456', provider: 'MOCK_SMS' };
    };

    const res = await smsService.send({
      recipient: '9876543210',
      message: 'Hello pickup ready',
      orderId: 'RF-20260925-000002',
      type: 'ORDER_READY',
      customDispatcher: mockDispatcher,
    });

    assert(mockCalled === true, 'Custom dispatcher invoked');
    assert(res.success === true, 'Mock dispatch succeeds');
    assert(res.messageId === 'sms_test_456', 'Mock dispatch returns messageId');

  } catch (err) {
    console.error('SMS service test error:', err);
    failCount++;
  }

  console.log('\n====================================================');
  console.log(`TOTAL PASSED: ${passCount}`);
  console.log(`TOTAL FAILED: ${failCount}`);
  console.log('====================================================\n');

  if (failCount > 0) process.exit(1);
}

runTests();
