import http from 'http';
import mongoose from 'mongoose';
import app from '../../app.js';
import NotificationLog from '../../src/models/NotificationLog.js';
import { generateToken } from '../../src/utils/jwt.js';

console.log('====================================================');
console.log('NOTIFICATION ARCHITECTURE & AUDIT LOG TEST SUITE');
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
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  const adminToken = generateToken({
    sub: new mongoose.Types.ObjectId().toString(),
    role: 'ADMIN',
  });
  const adminHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  };

  try {
    // 1. HTTP Endpoint: GET /api/notifications/order/:orderId
    console.log('--- Test 1: GET /api/notifications/order/:orderId ---');
    const res = await fetch(`${baseUrl}/api/notifications/order/RF-20260917-100100`, {
      headers: adminHeaders,
    });
    const json = await res.json();

    assert(res.status === 200, 'GET /api/notifications/order/:orderId returns HTTP 200');
    assert(json.success === true, 'Response contains success: true');
    assert(Array.isArray(json.data), 'Returns an array of notification logs');

    // 2. NotificationLog Model Validation
    console.log('\n--- Test 2: NotificationLog Schema Constraints ---');
    const validLog = new NotificationLog({
      orderId: 'RF-20260917-100100',
      type: 'ORDER_PLACED',
      channel: 'WHATSAPP',
      recipient: '9876543210',
      message: 'Your order RF-20260917-100100 has been placed.',
    });
    const validErr = validLog.validateSync();
    assert(!validErr, 'Valid NotificationLog passes validation');
    assert(validLog.status === 'PENDING', 'Default status is strictly PENDING (never falsely marked SENT)');

    // Channel validation
    const invalidChannelLog = new NotificationLog({
      orderId: 'RF-20260917-100100',
      type: 'ORDER_PLACED',
      channel: 'EMAIL', // Not permitted in Phase 8
      recipient: 'test@example.com',
      message: 'Test',
    });
    const channelErr = invalidChannelLog.validateSync();
    assert(!!channelErr?.errors?.channel, 'Rejects invalid channel "EMAIL" (Allowed: WHATSAPP, SMS)');

    // Status validation
    const invalidStatusLog = new NotificationLog({
      orderId: 'RF-20260917-100100',
      type: 'ORDER_PLACED',
      channel: 'SMS',
      status: 'DELIVERED', // Not permitted
      recipient: '9876543210',
      message: 'Test',
    });
    const statusErr = invalidStatusLog.validateSync();
    assert(!!statusErr?.errors?.status, 'Rejects invalid status (Allowed: PENDING, SENT, FAILED)');

    // Type validation
    const invalidTypeLog = new NotificationLog({
      orderId: 'RF-20260917-100100',
      type: 'MARKETING_PROMO', // Not permitted
      channel: 'SMS',
      recipient: '9876543210',
      message: 'Test',
    });
    const typeErr = invalidTypeLog.validateSync();
    assert(!!typeErr?.errors?.type, 'Rejects arbitrary notification types');

    // 3. Index Verification
    console.log('\n--- Test 3: NotificationLog Index Configuration ---');
    assert(NotificationLog.schema.paths['orderId'].options.index === true, 'orderId has index');
    assert(NotificationLog.schema.paths['status'].options.index === true, 'status has index');
    assert(NotificationLog.schema.paths['channel'].options.index === true, 'channel has index');
  } catch (err) {
    console.error('Notification log test error:', err);
    failCount++;
  } finally {
    server.close();
  }

  console.log('\n====================================================');
  console.log(`TOTAL PASSED: ${passCount}`);
  console.log(`TOTAL FAILED: ${failCount}`);
  console.log('====================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();
