import mongoose from 'mongoose';
import connectDB, { disconnectDB } from '../../src/config/database.js';
import notificationService, { formatOrderReadyMessage, ALLOWED_CHANNELS } from '../../src/services/notificationService.js';
import NotificationLog from '../../src/models/NotificationLog.js';

console.log('====================================================');
console.log('PHASE 13: CENTRALIZED NOTIFICATION SERVICE TEST SUITE');
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
    await connectDB();

    // 1. Provider Status Inspection (Zero Secrets)
    console.log('--- 1. Provider Status Inspection ---');
    const status = notificationService.getProviderStatus();
    assert(status && typeof status === 'object', 'getProviderStatus returns status object');
    assert(status.whatsapp && typeof status.whatsapp.configured === 'boolean', 'whatsapp status contains configured boolean');
    assert(status.sms && typeof status.sms.configured === 'boolean', 'sms status contains configured boolean');
    assert(status.apiKey === undefined && status.secret === undefined, 'Zero secrets exposed in getProviderStatus');

    // 2. formatOrderReadyMessage Helper
    console.log('\n--- 2. Message Formatting ---');
    const sampleOrder = {
      orderId: 'RF-20260925-333333',
      customer: { name: 'Sunita', mobile: '9876543210' },
      pickup: { dateFormatted: 'Friday, 25 Sep 2026', timeFormatted: '8:30 PM' },
      readyTime: '8:45 PM',
    };
    const msg = formatOrderReadyMessage(sampleOrder);
    assert(msg.includes('HAPPINESS RESTAURANT'), 'Message contains restaurant branding');
    assert(msg.includes('RF-20260925-333333'), 'Message contains orderId');
    assert(msg.includes('ready for pickup'), 'Message contains ready for pickup text');
    assert(!msg.toLowerCase().includes('delivery'), 'Zero delivery terminology');

    // 3. sendOrderNotification - ORDER_PLACED Event
    console.log('\n--- 3. Event Dispatch: ORDER_PLACED ---');
    const mockDispatcher = async () => ({ success: true, messageId: `msg_${Date.now()}` });

    const orderPlacedRes = await notificationService.sendOrderNotification(sampleOrder, 'ORDER_PLACED', {
      mockDispatchers: {
        WHATSAPP: mockDispatcher,
        SMS: mockDispatcher,
      },
    });

    assert(orderPlacedRes.orderId === 'RF-20260925-333333', 'Returns correct orderId');
    assert(orderPlacedRes.event === 'ORDER_PLACED', 'Returns event: ORDER_PLACED');
    assert(orderPlacedRes.results.WHATSAPP.status === 'SENT', 'WhatsApp status is SENT');
    assert(orderPlacedRes.results.SMS.status === 'SENT', 'SMS status is SENT');

    // 4. sendOrderNotification - ORDER_PREPARING Event
    console.log('\n--- 4. Event Dispatch: ORDER_PREPARING ---');
    const orderPrepRes = await notificationService.sendOrderNotification(sampleOrder, 'ORDER_PREPARING', {
      mockDispatchers: {
        WHATSAPP: mockDispatcher,
        SMS: mockDispatcher,
      },
    });

    assert(orderPrepRes.event === 'ORDER_PREPARING', 'Returns event: ORDER_PREPARING');
    assert(orderPrepRes.results.WHATSAPP.status === 'SENT', 'WhatsApp PREPARING is SENT');
    assert(orderPrepRes.results.SMS.status === 'SENT', 'SMS PREPARING is SENT');

    // 5. sendOrderNotification - ORDER_READY Event
    console.log('\n--- 5. Event Dispatch: ORDER_READY ---');
    const orderReadyRes = await notificationService.sendOrderNotification(sampleOrder, 'ORDER_READY', {
      mockDispatchers: {
        WHATSAPP: mockDispatcher,
        SMS: mockDispatcher,
      },
    });

    assert(orderReadyRes.event === 'ORDER_READY', 'Returns event: ORDER_READY');
    assert(orderReadyRes.results.WHATSAPP.status === 'SENT', 'WhatsApp READY is SENT');
    assert(orderReadyRes.results.SMS.status === 'SENT', 'SMS READY is SENT');

    // 6. Duplicate Notification Prevention (Idempotency Guard)
    console.log('\n--- 6. Idempotency Guard (Duplicate Prevention) ---');
    const duplicateRes = await notificationService.sendOrderNotification(sampleOrder, 'ORDER_READY', {
      mockDispatchers: {
        WHATSAPP: mockDispatcher,
        SMS: mockDispatcher,
      },
    });

    assert(duplicateRes.results.WHATSAPP.status === 'SKIPPED_DUPLICATE', 'WhatsApp duplicate skipped');
    assert(duplicateRes.results.SMS.status === 'SKIPPED_DUPLICATE', 'SMS duplicate skipped');

    // 7. Channel Independence (WhatsApp SENT + SMS FAILED)
    console.log('\n--- 7. Channel Independence ---');
    const mixedOrder = {
      orderId: 'RF-20260925-444444',
      customer: { name: 'Alok', mobile: '9876543210' },
      pickup: { time: '21:00' },
      readyTime: '21:15',
    };

    const failDispatcher = async () => ({ success: false, error: 'SMS Gateway unreachable' });

    const mixedRes = await notificationService.sendOrderNotification(mixedOrder, 'ORDER_READY', {
      mockDispatchers: {
        WHATSAPP: mockDispatcher,
        SMS: failDispatcher,
      },
    });

    assert(mixedRes.results.WHATSAPP.status === 'SENT', 'WhatsApp succeeds independently');
    assert(mixedRes.results.SMS.status === 'FAILED', 'SMS records failure independently');
    assert(mixedRes.results.SMS.reason.includes('SMS Gateway unreachable'), 'SMS failure recorded with clear reason');

    // 8. Manual Retry Foundation
    console.log('\n--- 8. Manual Retry Functionality ---');
    const retryRes = await notificationService.retryNotification('RF-20260925-444444', 'SMS', {
      mockOrder: { ...mixedOrder, status: 'READY' },
      mockDispatchers: {
        SMS: mockDispatcher,
      },
    });

    assert(retryRes.results.SMS.status === 'SENT', 'Manual retry dispatches failed channel');

    // 9. Input Validations
    console.log('\n--- 9. Input Validation ---');
    const noMobileRes = await notificationService.sendOrderNotification({ orderId: 'RF-999' });
    assert(noMobileRes.success === false, 'Rejects order without mobile number');

    const invalidOrderRes = await notificationService.sendOrderNotification(null);
    assert(invalidOrderRes.success === false, 'Rejects null order');

    // Clean up test logs
    if (mongoose.connection.readyState === 1) {
      await NotificationLog.deleteMany({
        orderId: { $in: ['RF-20260925-333333', 'RF-20260925-444444'] },
      });
    }

  } catch (err) {
    console.error('Notification service test error:', err);
    failCount++;
  } finally {
    await disconnectDB();
  }

  console.log('\n====================================================');
  console.log(`TOTAL PASSED: ${passCount}`);
  console.log(`TOTAL FAILED: ${failCount}`);
  console.log('====================================================\n');

  if (failCount > 0) process.exit(1);
}

runTests();
