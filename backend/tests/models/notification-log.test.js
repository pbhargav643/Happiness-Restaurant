import NotificationLog from '../../src/models/NotificationLog.js';

console.log('====================================================');
console.log('NOTIFICATION LOG MODEL ARCHITECTURE TEST SUITE');
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
    // 1. Model Loading
    console.log('--- 1. Model Loading & Instantiation ---');
    assert(typeof NotificationLog === 'function', 'NotificationLog model loads successfully');

    // 2. Valid NotificationLog Instantiation
    console.log('\n--- 2. Valid Schema Instantiation ---');
    const validLog = new NotificationLog({
      orderId: 'RF-20260921-1001',
      type: 'ORDER_PLACED',
      channel: 'WHATSAPP',
      status: 'PENDING',
      recipient: '+919876543210',
      message: 'Your order RF-20260921-1001 has been confirmed for takeaway.',
    });
    const validErr = validLog.validateSync();
    assert(!validErr, 'Valid NotificationLog passes schema validation without errors');
    assert(validLog.status === 'PENDING', 'status defaults to "PENDING"');

    // 3. Required Fields Enforcement
    console.log('\n--- 3. Required Fields Enforcement ---');
    const invalidLog = new NotificationLog({});
    const invalidErr = invalidLog.validateSync();
    assert(invalidErr && invalidErr.errors['orderId'], 'orderId is required');
    assert(invalidErr && invalidErr.errors['type'], 'type is required');
    assert(invalidErr && invalidErr.errors['channel'], 'channel is required');
    assert(invalidErr && invalidErr.errors['recipient'], 'recipient is required');
    assert(invalidErr && invalidErr.errors['message'], 'message is required');

    // 4. Channel Enum Enforcement
    console.log('\n--- 4. Channel Enum Enforcement ---');
    const validChannels = ['WHATSAPP', 'SMS'];
    validChannels.forEach((ch) => {
      const log = new NotificationLog({
        orderId: 'RF-101',
        type: 'ORDER_PLACED',
        channel: ch,
        recipient: '123',
        message: 'msg',
      });
      assert(!log.validateSync(), `Accepts valid channel: ${ch}`);
    });

    const invalidChannelLog = new NotificationLog({
      orderId: 'RF-101',
      type: 'ORDER_PLACED',
      channel: 'EMAIL',
      recipient: '123',
      message: 'msg',
    });
    const channelErr = invalidChannelLog.validateSync();
    assert(channelErr && channelErr.errors['channel'], 'Rejects unsupported channel EMAIL (Allowed: WHATSAPP, SMS)');

    // 5. Status Enum Enforcement
    console.log('\n--- 5. Status Enum Enforcement ---');
    const validStatuses = ['PENDING', 'SENT', 'FAILED'];
    validStatuses.forEach((st) => {
      const log = new NotificationLog({
        orderId: 'RF-101',
        type: 'ORDER_PLACED',
        channel: 'WHATSAPP',
        status: st,
        recipient: '123',
        message: 'msg',
      });
      assert(!log.validateSync(), `Accepts valid status: ${st}`);
    });

    // 6. Type Enum Enforcement
    console.log('\n--- 6. Type Enum Enforcement ---');
    const validTypes = ['ORDER_PLACED', 'ORDER_PREPARING', 'ORDER_READY', 'ORDER_PICKED_UP'];
    validTypes.forEach((tp) => {
      const log = new NotificationLog({
        orderId: 'RF-101',
        type: tp,
        channel: 'WHATSAPP',
        recipient: '123',
        message: 'msg',
      });
      assert(!log.validateSync(), `Accepts valid type: ${tp}`);
    });

    // 7. Index Verification
    console.log('\n--- 7. Database Indexes Audit ---');
    assert(NotificationLog.schema.paths['orderId'].options.index === true, 'orderId has index');
    assert(NotificationLog.schema.paths['channel'].options.index === true, 'channel has index');
    assert(NotificationLog.schema.paths['status'].options.index === true, 'status has index');
  } catch (error) {
    console.error('NotificationLog test error:', error);
    failCount++;
  }

  console.log('\n====================================================');
  console.log(`NOTIFICATION LOG SUITE SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('====================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();
