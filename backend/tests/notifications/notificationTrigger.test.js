import notificationService from '../../src/services/notificationService.js';
import orderService from '../../src/services/order.service.js';

console.log('====================================================');
console.log('PHASE 13: NOTIFICATION TRIGGER & FAILURE ISOLATION TEST');
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
    // 1. Trigger Structure on ORDER_READY Event
    console.log('--- 1. ORDER_READY Notification Event Trigger ---');
    const mockOrder = {
      orderId: 'RF-20260925-TRIGGER1',
      status: 'READY',
      customer: { name: 'Suresh Patel', phone: '9876543210' },
      pickup: { date: '2026-09-25', time: '20:15' },
      readyTime: '20:30',
    };

    let dispatchRecords = [];
    const trackingDispatcher = async (payload) => {
      dispatchRecords.push(payload);
      return { success: true, messageId: `msg_${Date.now()}` };
    };

    const triggerRes = await notificationService.triggerOrderReadyNotification(mockOrder, {
      mockDispatchers: {
        WHATSAPP: trackingDispatcher,
        SMS: trackingDispatcher,
      },
    });

    assert(triggerRes.orderId === 'RF-20260925-TRIGGER1', 'Trigger returns correct orderId');
    assert(dispatchRecords.length === 2, 'Dispatched to both WhatsApp and SMS on ORDER_READY event');
    assert(dispatchRecords.some((d) => d.recipient.includes('9876543210')), 'Recipient phone matches order mobile');

    // 2. Failure Isolation: Provider Failure Does NOT Roll Back or Throw
    console.log('\n--- 2. Failure Isolation Verification ---');
    const failingDispatcher = async () => {
      const err = new Error('Gateway Connection Timeout 504');
      err.status = 504;
      throw err;
    };

    const isolatedRes = await notificationService.triggerOrderReadyNotification(mockOrder, {
      force: true,
      mockDispatchers: {
        WHATSAPP: failingDispatcher,
        SMS: failingDispatcher,
      },
    });

    assert(isolatedRes.orderId === 'RF-20260925-TRIGGER1', 'triggerOrderReadyNotification completed without throwing');
    assert(isolatedRes.results.WHATSAPP?.status === 'FAILED', 'WhatsApp logged as FAILED');
    assert(isolatedRes.results.SMS?.status === 'FAILED', 'SMS logged as FAILED');
    assert(isolatedRes.results.WHATSAPP?.reason?.includes('Gateway Connection Timeout'), 'Reason captured safely');

    // 3. No Fake Success When Providers Are Unconfigured
    console.log('\n--- 3. Unconfigured Provider Behavior (No Fake SENT) ---');
    // Calling without mock dispatcher when unconfigured
    const unconfiguredRes = await notificationService.triggerOrderReadyNotification(mockOrder, {
      force: true,
    });

    assert(unconfiguredRes.results.WHATSAPP?.status === 'FAILED', 'Unconfigured WhatsApp logged as FAILED (never falsely marked SENT)');
    assert(unconfiguredRes.results.SMS?.status === 'FAILED', 'Unconfigured SMS logged as FAILED (never falsely marked SENT)');

    // 4. Message Content Conformance
    console.log('\n--- 4. Notification Message Conformance ---');
    const sampleMsg = dispatchRecords[0]?.message || '';
    assert(sampleMsg.includes('HAPPINESS RESTAURANT'), 'Message has correct restaurant branding');
    assert(sampleMsg.includes('RF-20260925-TRIGGER1'), 'Message has order ID');
    assert(sampleMsg.includes('20:30'), 'Message contains readyTime');
    assert(!sampleMsg.toLowerCase().includes('delivery'), 'Zero delivery mentions');
    assert(!sampleMsg.toLowerCase().includes('rider'), 'Zero delivery rider mentions');

  } catch (err) {
    console.error('Trigger test error:', err);
    failCount++;
  }

  console.log('\n====================================================');
  console.log(`TOTAL PASSED: ${passCount}`);
  console.log(`TOTAL FAILED: ${failCount}`);
  console.log('====================================================\n');

  if (failCount > 0) process.exit(1);
}

runTests();
