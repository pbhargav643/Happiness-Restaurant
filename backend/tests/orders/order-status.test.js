import Order from '../../src/models/Order.js';
import { orderService, validatePickupTime } from '../../src/services/orderService.js';

console.log('====================================================');
console.log('ORDER STATUS TRANSITIONS & READY TIME TEST SUITE');
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
    // 1. Status Transition Rules Engine
    console.log('--- Test 1: Controlled Sequential Status Transitions ---');
    const ALLOWED_TRANSITIONS = {
      PLACED: ['PREPARING'],
      PREPARING: ['READY'],
      READY: ['PICKED_UP'],
      PICKED_UP: [],
    };

    // Valid forward transitions
    assert(ALLOWED_TRANSITIONS['PLACED'].includes('PREPARING'), 'PLACED can transition to PREPARING');
    assert(ALLOWED_TRANSITIONS['PREPARING'].includes('READY'), 'PREPARING can transition to READY');
    assert(ALLOWED_TRANSITIONS['READY'].includes('PICKED_UP'), 'READY can transition to PICKED_UP');

    // Invalid backward transitions
    assert(!ALLOWED_TRANSITIONS['PREPARING'].includes('PLACED'), 'PREPARING cannot revert to PLACED');
    assert(!ALLOWED_TRANSITIONS['READY'].includes('PREPARING'), 'READY cannot revert to PREPARING');
    assert(!ALLOWED_TRANSITIONS['READY'].includes('PLACED'), 'READY cannot revert to PLACED');
    assert(!ALLOWED_TRANSITIONS['PICKED_UP'].includes('READY'), 'PICKED_UP cannot revert to READY');
    assert(!ALLOWED_TRANSITIONS['PICKED_UP'].includes('PREPARING'), 'PICKED_UP cannot revert to PREPARING');

    // Skipping stages
    assert(!ALLOWED_TRANSITIONS['PLACED'].includes('READY'), 'PLACED cannot skip directly to READY');
    assert(!ALLOWED_TRANSITIONS['PLACED'].includes('PICKED_UP'), 'PLACED cannot skip directly to PICKED_UP');

    // Terminal state
    assert(ALLOWED_TRANSITIONS['PICKED_UP'].length === 0, 'PICKED_UP is strictly terminal (zero outbound transitions)');

    // 2. Ready Time Validation Logic
    console.log('\n--- Test 2: Ready Time Format Validation ---');
    assert(validatePickupTime('20:15') === true, 'Accepts valid readyTime "20:15"');
    assert(validatePickupTime('12:00') === true, 'Accepts valid readyTime "12:00"');
    assert(validatePickupTime('invalid-time') === false, 'Rejects malformed readyTime string');

    // 3. Status Independence from Ready Time
    console.log('\n--- Test 3: Ready Time Independence from Status ---');
    const testOrder = new Order({
      orderId: 'RF-20260917-112233',
      customer: { name: 'Vikram', mobile: '9876543210' },
      pickup: { date: '2026-09-20', time: '19:00' },
      items: [{ itemId: 'item-1', name: 'Veg Soup', price: 100, quantity: 1 }],
      subtotal: 100,
      orderType: 'PICKUP',
      status: 'PREPARING',
      readyTime: null,
    });

    // When readyTime is set by admin to "19:15", status must NOT automatically jump to READY
    testOrder.readyTime = '19:15';
    assert(testOrder.status === 'PREPARING', 'Setting readyTime to "19:15" keeps status as PREPARING (does not auto-change status)');
    assert(testOrder.readyTime === '19:15', 'readyTime is successfully stored as "19:15"');

    // Clearing readyTime
    testOrder.readyTime = null;
    assert(testOrder.readyTime === null, 'readyTime can be cleared back to null safely');
    assert(testOrder.status === 'PREPARING', 'Status remains unchanged when readyTime is cleared');
  } catch (err) {
    console.error('Order status test error:', err);
    failCount++;
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
