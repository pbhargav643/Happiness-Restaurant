import NotificationLog from '../../src/models/NotificationLog.js';

console.log('====================================================');
console.log('PHASE 13: NOTIFICATION LOG SCHEMA & DATA MODEL SUITE');
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
    // 1. Valid Notification Log Validation
    console.log('--- 1. NotificationLog Schema Validation ---');
    const validLog = new NotificationLog({
      orderId: 'RF-20260925-555111',
      type: 'ORDER_READY',
      channel: 'WHATSAPP',
      recipient: '+919876543210',
      message: 'Your order is ready for pickup at HAPPINESS RESTAURANT.',
      status: 'PENDING',
    });

    const validErr = validLog.validateSync();
    assert(!validErr, 'Valid NotificationLog model passes schema validation');
    assert(validLog.status === 'PENDING', 'Default status is strictly PENDING');
    assert(validLog.orderId === 'RF-20260925-555111', 'orderId stored cleanly');

    // 2. Allowed Channels (WHATSAPP, SMS)
    console.log('\n--- 2. Channel Whitelist Validation ---');
    const validSmsLog = new NotificationLog({
      orderId: 'RF-20260925-555111',
      type: 'ORDER_READY',
      channel: 'SMS',
      recipient: '9876543210',
      message: 'Your order is ready for pickup.',
    });
    assert(!validSmsLog.validateSync(), 'SMS channel passes validation');

    const invalidChannelLog = new NotificationLog({
      orderId: 'RF-20260925-555111',
      type: 'ORDER_READY',
      channel: 'PUSH_NOTIFICATION',
      recipient: 'device_token',
      message: 'Your order is ready',
    });
    const chanErr = invalidChannelLog.validateSync();
    assert(Boolean(chanErr?.errors?.channel), 'Rejects invalid channel PUSH_NOTIFICATION');

    // 3. Allowed Notification Types
    console.log('\n--- 3. Event Types Whitelist Validation ---');
    const allowedTypes = ['ORDER_PLACED', 'ORDER_PREPARING', 'ORDER_READY', 'ORDER_PICKED_UP'];
    for (const t of allowedTypes) {
      const log = new NotificationLog({
        orderId: 'RF-20260925-555111',
        type: t,
        channel: 'WHATSAPP',
        recipient: '+919876543210',
        message: `Order event ${t}`,
      });
      assert(!log.validateSync(), `Allowed type ${t} passes validation`);
    }

    const invalidTypeLog = new NotificationLog({
      orderId: 'RF-20260925-555111',
      type: 'FLASH_SALE_DISCOUNT',
      channel: 'WHATSAPP',
      recipient: '+919876543210',
      message: 'Discount promo',
    });
    const typeErr = invalidTypeLog.validateSync();
    assert(Boolean(typeErr?.errors?.type), 'Rejects disallowed arbitrary event type FLASH_SALE_DISCOUNT');

    // 4. Allowed Statuses (PENDING, SENT, FAILED)
    console.log('\n--- 4. Status Whitelist Validation ---');
    for (const st of ['PENDING', 'SENT', 'FAILED']) {
      const log = new NotificationLog({
        orderId: 'RF-20260925-555111',
        type: 'ORDER_READY',
        channel: 'SMS',
        status: st,
        recipient: '9876543210',
        message: 'Order ready',
      });
      assert(!log.validateSync(), `Allowed status ${st} passes validation`);
    }

    const invalidStatusLog = new NotificationLog({
      orderId: 'RF-20260925-555111',
      type: 'ORDER_READY',
      channel: 'SMS',
      status: 'SEEN_AND_READ',
      recipient: '9876543210',
      message: 'Order ready',
    });
    const statusErr = invalidStatusLog.validateSync();
    assert(Boolean(statusErr?.errors?.status), 'Rejects disallowed status SEEN_AND_READ');

    // 5. Index Configuration
    console.log('\n--- 5. Index Verification ---');
    assert(NotificationLog.schema.paths['orderId']?.options?.index === true, 'orderId has indexed single lookup');
    assert(NotificationLog.schema.paths['channel']?.options?.index === true, 'channel has index');
    assert(NotificationLog.schema.paths['status']?.options?.index === true, 'status has index');

  } catch (err) {
    console.error('Notification log test error:', err);
    failCount++;
  }

  console.log('\n====================================================');
  console.log(`TOTAL PASSED: ${passCount}`);
  console.log(`TOTAL FAILED: ${failCount}`);
  console.log('====================================================\n');

  if (failCount > 0) process.exit(1);
}

runTests();
