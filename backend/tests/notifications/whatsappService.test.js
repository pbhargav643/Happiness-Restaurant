import whatsappService from '../../src/services/whatsappService.js';

console.log('====================================================');
console.log('PHASE 13: WHATSAPP SERVICE TEST SUITE');
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
    assert(whatsappService.name === 'WHATSAPP', 'Provider name is WHATSAPP');
    assert(typeof whatsappService.isConfigured === 'function', 'isConfigured is a function');
    assert(typeof whatsappService.getStatus === 'function', 'getStatus is a function');
    assert(typeof whatsappService.send === 'function', 'send is a function');

    // 2. Safe Configuration Status
    console.log('\n--- 2. Safe Configuration Status ---');
    const status = whatsappService.getStatus();
    assert(status === 'CONFIGURED' || status === 'NOT_CONFIGURED', `Safe status returned: ${status}`);

    // 3. Recipient Normalization
    console.log('\n--- 3. Recipient Phone Normalization ---');
    assert(whatsappService.normalizeRecipient('9876543210') === '+919876543210', '10-digit number formatted to +919876543210');
    assert(whatsappService.normalizeRecipient('+919876543210') === '+919876543210', '+91 prefixed number preserved');
    assert(whatsappService.normalizeRecipient('919876543210') === '+919876543210', '91 prefixed number normalized');
    assert(whatsappService.normalizeRecipient('09876543210') === '+919876543210', 'Leading 0 stripped and normalized');
    assert(whatsappService.normalizeRecipient('12345') === null, 'Short invalid number rejected (returns null)');
    assert(whatsappService.normalizeRecipient('abcdefghij') === null, 'Non-numeric string rejected (returns null)');
    assert(whatsappService.normalizeRecipient('') === null, 'Empty string rejected (returns null)');

    // 4. Send Behavior when Unconfigured
    console.log('\n--- 4. Unconfigured Safety & Error Isolation ---');
    if (!whatsappService.isConfigured()) {
      try {
        await whatsappService.send({
          recipient: '9876543210',
          message: 'Test pickup notification',
          orderId: 'RF-20260925-000001',
          type: 'ORDER_READY',
        });
        assert(false, 'Should throw when unconfigured');
      } catch (err) {
        assert(err.code === 'NOT_CONFIGURED', 'Throws NOT_CONFIGURED code when credentials are not set');
        assert(err.message.includes('WHATSAPP_NOT_CONFIGURED') || err.message.includes('not configured'), 'Clear non-configured error message');
      }
    }

    // 5. Invalid Recipient Handling
    console.log('\n--- 5. Invalid Recipient Validation ---');
    try {
      await whatsappService.send({
        recipient: 'invalid_number',
        message: 'Test message',
        orderId: 'RF-20260925-000001',
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
      return { success: true, messageId: 'wa_test_123', provider: 'MOCK_WHATSAPP' };
    };

    const res = await whatsappService.send({
      recipient: '9876543210',
      message: 'Hello pickup ready',
      orderId: 'RF-20260925-000001',
      type: 'ORDER_READY',
      customDispatcher: mockDispatcher,
    });

    assert(mockCalled === true, 'Custom dispatcher invoked');
    assert(res.success === true, 'Mock dispatch succeeds');
    assert(res.messageId === 'wa_test_123', 'Mock dispatch returns messageId');

  } catch (err) {
    console.error('WhatsApp service test error:', err);
    failCount++;
  }

  console.log('\n====================================================');
  console.log(`TOTAL PASSED: ${passCount}`);
  console.log(`TOTAL FAILED: ${failCount}`);
  console.log('====================================================\n');

  if (failCount > 0) process.exit(1);
}

runTests();
