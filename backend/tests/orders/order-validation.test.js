import {
  normalizeIndianMobile,
  validatePickupDate,
  validatePickupTime,
} from '../../src/services/orderService.js';
import Order from '../../src/models/Order.js';

console.log('====================================================');
console.log('ORDER INPUT & CONSTRAINT VALIDATION TEST SUITE');
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
    // 1. Customer Indian Mobile Number Normalization & Validation
    console.log('--- Test 1: Indian Mobile Validation ---');
    assert(normalizeIndianMobile('9876543210') === '9876543210', 'Valid 10-digit number accepted');
    assert(normalizeIndianMobile('+919876543210') === '9876543210', 'Number with +91 prefix normalized');
    assert(normalizeIndianMobile('09876543210') === '9876543210', 'Number with leading 0 normalized');
    assert(normalizeIndianMobile('98765-43210') === '9876543210', 'Hyphenated number normalized');
    assert(normalizeIndianMobile('8123456789') === '8123456789', 'Number starting with 8 accepted');
    assert(normalizeIndianMobile('7123456789') === '7123456789', 'Number starting with 7 accepted');
    assert(normalizeIndianMobile('6123456789') === '6123456789', 'Number starting with 6 accepted');
    assert(normalizeIndianMobile('5123456789') === null, 'Rejects invalid starting digit 5');
    assert(normalizeIndianMobile('12345') === null, 'Rejects short mobile number');
    assert(normalizeIndianMobile('9876543210123') === null, 'Rejects excessively long mobile number');
    assert(normalizeIndianMobile('abcdefghij') === null, 'Rejects non-numeric mobile number');
    assert(normalizeIndianMobile('') === null, 'Rejects empty mobile string');
    assert(normalizeIndianMobile(null) === null, 'Rejects null mobile');

    // 2. Pickup Date Validation
    console.log('\n--- Test 2: Pickup Date Validation ---');
    const todayStr = new Date().toISOString().slice(0, 10);
    assert(validatePickupDate(todayStr) === true, 'Accepts today as valid pickup date');

    const future = new Date();
    future.setDate(future.getDate() + 5);
    const futureStr = future.toISOString().slice(0, 10);
    assert(validatePickupDate(futureStr) === true, 'Accepts future date as valid pickup date');

    const past = new Date();
    past.setDate(past.getDate() - 2);
    const pastStr = past.toISOString().slice(0, 10);
    assert(validatePickupDate(pastStr) === false, 'Rejects past pickup date');
    assert(validatePickupDate('2026/09/20') === false, 'Rejects non-ISO date format (slashes)');
    assert(validatePickupDate('invalid-date') === false, 'Rejects arbitrary invalid date string');

    // 3. Pickup Time Validation
    console.log('\n--- Test 3: Pickup Time Validation ---');
    assert(validatePickupTime('14:30') === true, 'Accepts valid 24h time 14:30');
    assert(validatePickupTime('09:00') === true, 'Accepts valid 24h time 09:00');
    assert(validatePickupTime('22:15') === true, 'Accepts valid 24h time 22:15');
    assert(validatePickupTime('02:30 PM') === true, 'Accepts valid 12h time with PM');
    assert(validatePickupTime('11:00 AM') === true, 'Accepts valid 12h time with AM');
    assert(validatePickupTime('25:99') === false, 'Rejects out-of-range hours/minutes 25:99');
    assert(validatePickupTime('invalid-time') === false, 'Rejects arbitrary time string');
    assert(validatePickupTime('') === false, 'Rejects empty time string');

    // 4. Schema-level Rejections
    console.log('\n--- Test 4: Schema-level Constraints ---');
    const invalidStatusOrder = new Order({
      orderId: 'RF-20260917-999999',
      customer: { name: 'Pooja', mobile: '9876543210' },
      pickup: { date: todayStr, time: '14:00' },
      items: [{ itemId: 'item-1', name: 'Soup', price: 100, quantity: 1 }],
      subtotal: 100,
      orderType: 'PICKUP',
      status: 'DELIVERED', // Not allowed!
    });
    const statusErr = invalidStatusOrder.validateSync();
    assert(!!statusErr?.errors?.status, 'Order schema strictly rejects status "DELIVERED"');

    const zeroQuantityOrder = new Order({
      orderId: 'RF-20260917-888888',
      customer: { name: 'Pooja', mobile: '9876543210' },
      pickup: { date: todayStr, time: '14:00' },
      items: [{ itemId: 'item-1', name: 'Soup', price: 100, quantity: 0 }], // Invalid quantity
      subtotal: 100,
      orderType: 'PICKUP',
    });
    const qtyErr = zeroQuantityOrder.validateSync();
    assert(!!qtyErr?.errors?.['items.0.quantity'], 'Order schema rejects quantity 0 (min is 1)');

    const emptyItemsOrder = new Order({
      orderId: 'RF-20260917-777777',
      customer: { name: 'Pooja', mobile: '9876543210' },
      pickup: { date: todayStr, time: '14:00' },
      items: [], // Invalid empty items
      subtotal: 0,
      orderType: 'PICKUP',
    });
    const emptyItemsErr = emptyItemsOrder.validateSync();
    assert(!!emptyItemsErr?.errors?.items, 'Order schema rejects empty items array');
  } catch (err) {
    console.error('Order validation test error:', err);
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
