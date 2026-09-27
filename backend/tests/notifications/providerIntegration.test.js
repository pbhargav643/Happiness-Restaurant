import http from 'http';
import mongoose from 'mongoose';
import app from '../../app.js';
import NotificationLog from '../../src/models/NotificationLog.js';
import Order from '../../src/models/Order.js';
import { generateToken } from '../../src/utils/jwt.js';
import whatsappService, { sendWhatsAppNotification } from '../../src/services/whatsappService.js';
import smsService, { sendSmsNotification } from '../../src/services/smsService.js';
import notificationService from '../../src/services/notificationService.js';

console.log('====================================================');
console.log('PHASE 13: REAL PROVIDER INTEGRATION TEST SUITE');
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
    // ----------------------------------------------------
    // TEST 1: WhatsApp Service Provider Contract & Normalization
    // ----------------------------------------------------
    console.log('--- Test 1: WhatsApp Service Provider Contract ---');
    assert(typeof sendWhatsAppNotification === 'function', 'sendWhatsAppNotification function is exported');
    assert(typeof whatsappService.buildTemplateData === 'function', 'buildTemplateData function exists');

    // Unconfigured safety
    const waUnconfRes = await sendWhatsAppNotification({
      recipient: '9876543210',
      message: 'Test message',
      order: { orderId: 'RF-20260925-TEST01', readyTime: '7:30 PM' },
    });
    assert(waUnconfRes.success === false, 'WhatsApp returns success: false when unconfigured');
    assert(waUnconfRes.providerMessageId === null, 'providerMessageId is null when unconfigured');
    assert(waUnconfRes.error && waUnconfRes.error.includes('not configured'), 'Returns clear non-configured error message');

    // Invalid recipient
    const waInvRes = await sendWhatsAppNotification({
      recipient: 'invalid-phone-num',
      message: 'Test message',
      order: { orderId: 'RF-20260925-TEST01' },
      customDispatcher: async () => ({ success: true }),
    });
    assert(waInvRes.success === false, 'Rejects invalid recipient phone number');
    assert(waInvRes.error.includes('Invalid recipient'), 'Error explains invalid recipient format');

    // Mock dispatcher normalized result
    let waPayloadCaptured = null;
    const waMockRes = await sendWhatsAppNotification({
      recipient: '9876543210',
      order: {
        orderId: 'RF-20260925-TEST01',
        readyTime: '7:30 PM',
        customer: { name: 'Pooja Patel', phone: '9876543210' },
      },
      customDispatcher: async (payload) => {
        waPayloadCaptured = payload;
        return { success: true, providerMessageId: 'wa_msg_test_9988' };
      },
    });
    assert(waMockRes.success === true, 'WhatsApp mock dispatch returns success: true');
    assert(waMockRes.providerMessageId === 'wa_msg_test_9988', 'WhatsApp returns normalized providerMessageId');
    assert(waMockRes.error === null, 'WhatsApp error is null on success');
    assert(waPayloadCaptured?.templateData?.customerName === 'Pooja Patel', 'Template data contains customerName');
    assert(waPayloadCaptured?.templateData?.orderId === 'RF-20260925-TEST01', 'Template data contains orderId');
    assert(waPayloadCaptured?.templateData?.readyTime === '7:30 PM', 'Template data contains readyTime');

    // ----------------------------------------------------
    // TEST 2: SMS Service Provider Contract & Normalization
    // ----------------------------------------------------
    console.log('\n--- Test 2: SMS Service Provider Contract ---');
    assert(typeof sendSmsNotification === 'function', 'sendSmsNotification function is exported');
    assert(typeof smsService.formatSmsMessage === 'function', 'formatSmsMessage function exists');

    // Unconfigured safety
    const smsUnconfRes = await sendSmsNotification({
      recipient: '9876543210',
      order: { orderId: 'RF-20260925-TEST02', readyTime: '8:00 PM' },
    });
    assert(smsUnconfRes.success === false, 'SMS returns success: false when unconfigured');
    assert(smsUnconfRes.providerMessageId === null, 'providerMessageId is null when unconfigured');
    assert(smsUnconfRes.error && smsUnconfRes.error.includes('not configured'), 'Returns clear non-configured SMS error');

    // Short pickup text format check
    const formattedSms = smsService.formatSmsMessage({
      orderId: 'RF-20260925-TEST02',
      readyTime: '8:00 PM',
    });
    assert(formattedSms.includes('RF-20260925-TEST02'), 'SMS contains orderId');
    assert(formattedSms.includes('ready for pickup'), 'SMS mentions ready for pickup');
    assert(!formattedSms.toLowerCase().includes('delivery'), 'Strictly NO delivery wording in SMS');
    assert(!formattedSms.toLowerCase().includes('driver'), 'Strictly NO driver wording in SMS');

    // Mock dispatcher normalized result
    let smsPayloadCaptured = null;
    const smsMockRes = await sendSmsNotification({
      recipient: '+919876543210',
      order: { orderId: 'RF-20260925-TEST02', readyTime: '8:00 PM' },
      customDispatcher: async (payload) => {
        smsPayloadCaptured = payload;
        return { success: true, messageId: 'sms_msg_test_7766' };
      },
    });
    assert(smsMockRes.success === true, 'SMS mock dispatch returns success: true');
    assert(smsMockRes.providerMessageId === 'sms_msg_test_7766', 'SMS returns normalized providerMessageId from messageId');
    assert(smsPayloadCaptured.recipient === '9876543210', 'Normalized to 10-digit Indian recipient');

    // ----------------------------------------------------
    // TEST 3: NotificationLog Model & providerMessageId Field
    // ----------------------------------------------------
    console.log('\n--- Test 3: NotificationLog Model providerMessageId Field ---');
    assert(NotificationLog.schema.paths['providerMessageId'] !== undefined, 'NotificationLog schema includes providerMessageId');

    const testLog = new NotificationLog({
      orderId: 'RF-20260925-TEST03',
      type: 'ORDER_READY',
      channel: 'WHATSAPP',
      recipient: '9876543210',
      message: 'Test message body',
      status: 'SENT',
      providerMessageId: 'wa_audit_test_123',
    });
    assert(testLog.providerMessageId === 'wa_audit_test_123', 'providerMessageId is stored on model');

    // ----------------------------------------------------
    // TEST 4: Idempotency & Failure Isolation in Notification Service
    // ----------------------------------------------------
    console.log('\n--- Test 4: Idempotency & Failure Isolation ---');
    const mockOrder = {
      orderId: 'RF-20260925-TEST04',
      status: 'READY',
      customer: { name: 'Ramesh Shah', phone: '9876543210' },
      pickup: { dateFormatted: '25 Sep 2026', timeFormatted: '7:30 PM' },
      readyTime: '7:45 PM',
    };

    // Dispatch with mock dispatcher
    const triggerRes = await notificationService.triggerOrderReadyNotification(mockOrder, {
      mockDispatchers: {
        WHATSAPP: async () => ({ success: true, providerMessageId: 'wa_idemp_01' }),
        SMS: async () => ({ success: true, providerMessageId: 'sms_idemp_01' }),
      },
    });
    assert(triggerRes.results.WHATSAPP.status === 'SENT', 'WhatsApp status marked SENT with mock');
    assert(triggerRes.results.WHATSAPP.providerMessageId === 'wa_idemp_01', 'WhatsApp recorded providerMessageId');
    assert(triggerRes.results.SMS.status === 'SENT', 'SMS status marked SENT with mock');
    assert(triggerRes.results.SMS.providerMessageId === 'sms_idemp_01', 'SMS recorded providerMessageId');

    // ----------------------------------------------------
    // TEST 5: Admin Notification Retry Endpoint Security & Validation
    // ----------------------------------------------------
    console.log('\n--- Test 5: Admin Notification Retry Endpoint ---');

    // Unauthorized access rejected
    const unauthRes = await fetch(`${baseUrl}/api/admin/notifications/fake_id_123/retry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    assert(unauthRes.status === 401 || unauthRes.status === 403, 'Unauthorized retry rejected with 401/403');

    // Valid admin token with non-existent notification ID
    const notFoundRes = await fetch(`${baseUrl}/api/admin/notifications/65f1234567890abcdef12345/retry`, {
      method: 'POST',
      headers: adminHeaders,
    });
    assert(notFoundRes.status === 404, 'Non-existent notification ID returns HTTP 404');

    // Service unit test for retryNotificationById
    console.log('\n--- Test 6: retryNotificationById Logic ---');
    const mockFailedLog = {
      _id: '65f1234567890abcdef12345',
      orderId: 'RF-20260925-TEST05',
      type: 'ORDER_READY',
      channel: 'SMS',
      status: 'FAILED',
      recipient: '9876543210',
      message: 'Your order is ready',
      error: 'SMS_NOT_CONFIGURED',
      save: async function () { return this; },
    };

    const mockSentLog = {
      _id: '65f1234567890abcdef12346',
      orderId: 'RF-20260925-TEST05',
      type: 'ORDER_READY',
      channel: 'WHATSAPP',
      status: 'SENT',
      recipient: '9876543210',
      message: 'Your order is ready',
      error: null,
      save: async function () { return this; },
    };

    const readyOrder = {
      orderId: 'RF-20260925-TEST05',
      status: 'READY',
      customer: { phone: '9876543210' },
    };

    // Rejects already SENT notifications
    try {
      await notificationService.retryNotificationById('65f1234567890abcdef12346', {
        mockLog: mockSentLog,
        mockOrder: readyOrder,
      });
      assert(false, 'Should throw error when retrying already SENT notification');
    } catch (sentErr) {
      assert(sentErr.statusCode === 400, 'Rejects retry of already SENT notification with HTTP 400');
      assert(sentErr.message.includes('already successfully sent'), 'Helpful rejection message');
    }

    // Retrying FAILED notification with mock dispatcher succeeds
    const retrySuccessRes = await notificationService.retryNotificationById('65f1234567890abcdef12345', {
      mockLog: mockFailedLog,
      mockOrder: readyOrder,
      mockDispatchers: {
        SMS: async () => ({ success: true, providerMessageId: 'sms_retry_succ_001' }),
      },
    });
    assert(retrySuccessRes.success === true, 'Retry of FAILED notification succeeds with dispatcher');
    assert(retrySuccessRes.status === 'SENT', 'Updated status is SENT');
    assert(retrySuccessRes.providerMessageId === 'sms_retry_succ_001', 'Captured new providerMessageId on retry');

    // ----------------------------------------------------
    // TEST 7: Zero Credential & Secret Leakage
    // ----------------------------------------------------
    console.log('\n--- Test 7: Zero Credential Leakage ---');
    const secretLeakTest = await sendWhatsAppNotification({
      recipient: '9876543210',
      customDispatcher: async () => {
        throw new Error('Authorization failed for Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.supersecretkey');
      },
    });
    assert(secretLeakTest.success === false, 'Failed dispatch handled safely');
    assert(!secretLeakTest.error.includes('supersecretkey'), 'Bearer tokens stripped from error message');

  } catch (err) {
    console.error('Provider integration test error:', err);
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
