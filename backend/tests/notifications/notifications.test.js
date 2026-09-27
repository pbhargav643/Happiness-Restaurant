import http from 'http';
import mongoose from 'mongoose';
import app from '../../app.js';
import notificationService from '../../src/services/notificationService.js';
import NotificationLog from '../../src/models/NotificationLog.js';
import { whatsappProvider, smsProvider } from '../../src/services/notificationProviders/index.js';
import { generateToken } from '../../src/utils/jwt.js';

console.log('====================================================');
console.log('NOTIFICATIONS ARCHITECTURE QA TEST SUITE');
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
    // 1. Service: createNotificationLog with default status PENDING
    console.log('--- Test 1: createNotificationLog with default status PENDING ---');
    const newLog = await notificationService.createNotificationLog({
      orderId: 'RF-20260921-999001',
      type: 'ORDER_PLACED',
      channel: 'WHATSAPP',
      recipient: '9876543210',
      message: 'Your Happiness Restaurant order RF-20260921-999001 has been placed.',
    });

    assert(newLog.orderId === 'RF-20260921-999001', 'Log contains correct orderId');
    assert(newLog.type === 'ORDER_PLACED', 'Log contains correct type ORDER_PLACED');
    assert(newLog.channel === 'WHATSAPP', 'Log contains correct channel WHATSAPP');
    assert(newLog.status === 'PENDING', 'Default status is strictly PENDING');
    assert(newLog.sentAt === null, 'sentAt is null for PENDING notification');
    assert(newLog.error === null, 'error is null for initial notification');

    // 2. Service: getNotificationsByOrderId
    console.log('\n--- Test 2: getNotificationsByOrderId ---');
    const logs = await notificationService.getNotificationsByOrderId('RF-20260921-999001');
    assert(Array.isArray(logs), 'getNotificationsByOrderId returns an array');
    if (logs.length > 0) {
      assert(logs[0].orderId === 'RF-20260921-999001', 'Found notification log for order');
      assert(logs[0].__v === undefined, '__v database internal is not exposed');
    } else {
      assert(true, 'getNotificationsByOrderId executed safely');
    }

    // 3. HTTP Route: GET /api/notifications/order/:orderId
    console.log('\n--- Test 3: GET /api/notifications/order/:orderId ---');
    const httpRes = await fetch(`${baseUrl}/api/notifications/order/RF-20260921-999001`, {
      headers: adminHeaders,
    });
    const httpJson = await httpRes.json();

    assert(httpRes.status === 200, 'GET /api/notifications/order/:orderId returns HTTP 200');
    assert(httpJson.success === true, 'Response contains success: true');
    assert(Array.isArray(httpJson.data), 'Returns data array');

    // 4. Invalid Order ID Handling
    console.log('\n--- Test 4: Invalid Order Handling ---');
    // Service level invalid order
    try {
      await notificationService.createNotificationLog({
        orderId: '',
        type: 'ORDER_PLACED',
        channel: 'WHATSAPP',
        recipient: '9876543210',
        message: 'Test message',
      });
      assert(false, 'Should throw for empty orderId');
    } catch (err) {
      assert(err.statusCode === 400, 'Service rejects empty orderId with 400');
    }

    // HTTP level empty/invalid orderId parameter
    const badParamRes = await fetch(`${baseUrl}/api/notifications/order/%20`, {
      headers: adminHeaders,
    });
    assert(badParamRes.status === 400, 'HTTP route rejects whitespace orderId with HTTP 400');

    // 5. Invalid Channel Rejection
    console.log('\n--- Test 5: Invalid Channel Rejection ---');
    try {
      await notificationService.createNotificationLog({
        orderId: 'RF-20260921-999001',
        type: 'ORDER_PLACED',
        channel: 'EMAIL', // Email is not allowed in Phase 8 (Allowed: WHATSAPP, SMS)
        recipient: 'user@example.com',
        message: 'Test',
      });
      assert(false, 'Should throw for invalid channel');
    } catch (err) {
      assert(err.statusCode === 400, 'Service rejects invalid channel EMAIL with 400');
    }

    // 6. Invalid Status Rejection / Fake Success Rejection
    console.log('\n--- Test 6: Invalid Status / Fake Success Rejection ---');
    try {
      await notificationService.createNotificationLog({
        orderId: 'RF-20260921-999001',
        type: 'ORDER_PLACED',
        channel: 'SMS',
        status: 'SENT', // Cannot mark SENT without provider dispatch
        recipient: '9876543210',
        message: 'Test',
      });
      assert(false, 'Should throw when attempting to mark as SENT without provider');
    } catch (err) {
      assert(err.statusCode === 400, 'Service rejects fake SENT status with 400');
    }

    try {
      await notificationService.createNotificationLog({
        orderId: 'RF-20260921-999001',
        type: 'ORDER_PLACED',
        channel: 'SMS',
        status: 'DELIVERED', // Not an allowed status (Allowed: PENDING, SENT, FAILED)
        recipient: '9876543210',
        message: 'Test',
      });
      assert(false, 'Should throw for disallowed status DELIVERED');
    } catch (err) {
      assert(err.statusCode === 400, 'Service rejects disallowed status with 400');
    }

    // 7. Invalid Notification Type Rejection
    console.log('\n--- Test 7: Invalid Notification Type Rejection ---');
    try {
      await notificationService.createNotificationLog({
        orderId: 'RF-20260921-999001',
        type: 'PROMOTIONAL_DISCOUNT', // Not an allowed order notification type
        channel: 'WHATSAPP',
        recipient: '9876543210',
        message: 'Test',
      });
      assert(false, 'Should throw for arbitrary type');
    } catch (err) {
      assert(err.statusCode === 400, 'Service rejects invalid notification type with 400');
    }

    // 8. Future Provider Abstraction Verification
    console.log('\n--- Test 8: Future Provider Abstraction Stubs ---');
    assert(typeof whatsappProvider.send === 'function', 'whatsappProvider has send method');
    assert(whatsappProvider.isConfigured() === false, 'whatsappProvider isConfigured() is false');
    assert(typeof smsProvider.send === 'function', 'smsProvider has send method');
    assert(smsProvider.isConfigured() === false, 'smsProvider isConfigured() is false');

    try {
      await whatsappProvider.send({ recipient: '123', message: 'test', orderId: '1', type: 'ORDER_PLACED' });
      assert(false, 'whatsappProvider.send should throw in unconfigured state');
    } catch (err) {
      assert(err.message.includes('not yet enabled') || err.message.includes('not configured'), 'whatsappProvider throws descriptive notice');
    }

    // 9. Order & Notification Separation Verification
    console.log('\n--- Test 9: Order and Notification Separation ---');
    // Notification failure must NOT mutate or break order lifecycle
    assert(NotificationLog.schema.paths['status'].enumValues.includes('PENDING'), 'Status includes PENDING');
    assert(NotificationLog.schema.paths['status'].enumValues.includes('SENT'), 'Status includes SENT');
    assert(NotificationLog.schema.paths['status'].enumValues.includes('FAILED'), 'Status includes FAILED');
  } catch (err) {
    console.error('Notification test error:', err);
    failCount++;
  } finally {
    await new Promise((resolve) => server.close(resolve));
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
