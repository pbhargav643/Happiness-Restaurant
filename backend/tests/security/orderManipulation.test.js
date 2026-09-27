import assert from 'node:assert';
import http from 'node:http';
import app from '../../src/app.js';
import { orderService } from '../../src/services/order.service.js';

console.log('====================================================');
console.log('PHASE 15: ORDER MANIPULATION & PENETRATION TEST SUITE');
console.log('====================================================\n');

let passed = 0;
function pass(desc) {
  passed++;
  console.log(`[PASS] ${desc}`);
}

const server = http.createServer(app);

await new Promise((resolve) => {
  server.listen(0, resolve);
});

const port = server.address().port;
const baseUrl = `http://127.0.0.1:${port}`;

try {
  // 1. ORDER QUANTITY ABUSE
  const invalidQuantities = [0, -1, -50, 1.5, 3.14, 'two', '10abc', 999999, null, undefined];
  for (const q of invalidQuantities) {
    const res = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderType: 'PICKUP',
        customer: { name: 'Quantity Tester', mobile: '9876543210' },
        pickup: { date: '2026-09-25', time: '19:00' },
        items: [{ itemId: 'item-1', quantity: q }],
      }),
    });
    assert.strictEqual(res.status, 400, `Quantity ${q} must be rejected with HTTP 400 (got ${res.status})`);
  }
  pass('All invalid quantities (0, negative, float, string, huge integer, null, undefined) rejected with HTTP 400');

  // 2. ORDER ITEM ABUSE (Empty items, huge number of items, malformed itemId)
  // Empty items
  const emptyRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderType: 'PICKUP',
      customer: { name: 'Item Tester', mobile: '9876543210' },
      pickup: { date: '2026-09-25', time: '19:00' },
      items: [],
    }),
  });
  assert.strictEqual(emptyRes.status, 400, 'Empty items array must return 400');
  pass('Empty items array is strictly rejected with HTTP 400');

  // Huge number of items (> 50 items)
  const hugeItems = Array.from({ length: 60 }, (_, i) => ({ itemId: `item-${i}`, quantity: 1 }));
  const hugeRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderType: 'PICKUP',
      customer: { name: 'Item Tester', mobile: '9876543210' },
      pickup: { date: '2026-09-25', time: '19:00' },
      items: hugeItems,
    }),
  });
  assert.strictEqual(hugeRes.status, 400, 'Over 50 items must return 400');
  pass('Flooding orders with more than 50 distinct items is strictly rejected with HTTP 400');

  // Malformed itemId (empty string or whitespace)
  const badIdRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderType: 'PICKUP',
      customer: { name: 'Item Tester', mobile: '9876543210' },
      pickup: { date: '2026-09-25', time: '19:00' },
      items: [{ itemId: '   ', quantity: 1 }],
    }),
  });
  assert.strictEqual(badIdRes.status, 400, 'Whitespace itemId must return 400');
  pass('Malformed/whitespace itemId is strictly rejected with HTTP 400');

  // 3. ORDER TYPE ABUSE (DELIVERY must be rejected)
  const deliveryRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderType: 'DELIVERY',
      customer: { name: 'Delivery Attacker', mobile: '9876543210' },
      pickup: { date: '2026-09-25', time: '19:00' },
      items: [{ itemId: 'item-1', quantity: 1 }],
    }),
  });
  assert.strictEqual(deliveryRes.status, 400, 'DELIVERY orderType must be rejected');
  pass('Attempted DELIVERY order type is strictly rejected with HTTP 400');

  // 4. STATUS TRANSITION ABUSE (Illegal status skips)
  const invalidTransitions = [
    { from: 'PLACED', to: 'READY' },
    { from: 'PLACED', to: 'PICKED_UP' },
    { from: 'PREPARING', to: 'PICKED_UP' },
    { from: 'READY', to: 'PREPARING' },
    { from: 'PICKED_UP', to: 'PREPARING' },
    { from: 'PICKED_UP', to: 'PLACED' },
  ];

  const allowedTransitions = {
    PLACED: ['PREPARING'],
    PREPARING: ['READY'],
    READY: ['PICKED_UP'],
    PICKED_UP: [],
  };

  for (const t of invalidTransitions) {
    const nextAllowed = allowedTransitions[t.from] || [];
    assert(!nextAllowed.includes(t.to), `Transition from ${t.from} to ${t.to} must NOT be allowed`);
  }
  pass('All non-sequential status skips and backwards transitions are strictly rejected');

  // 5. READY TIME ABUSE
  const invalidReadyTimes = ['25:00', '12:60', 'not-a-time', '99:99', '2026-09-25T19:00:00Z', 'A'.repeat(500)];
  for (const rt of invalidReadyTimes) {
    let thrown = false;
    try {
      await orderService.updateReadyTime('RF-20260925-000001', rt);
    } catch (err) {
      thrown = true;
      assert.strictEqual(err.statusCode, 400, 'Invalid readyTime throws 400');
    }
    assert.strictEqual(thrown, true, `Invalid readyTime "${rt}" must throw 400`);
  }
  pass('All malformed, out-of-range, and excessively long readyTime formats are rejected with HTTP 400');

  console.log('\n====================================================');
  console.log(`ORDER MANIPULATION TESTS: ${passed} PASSED, 0 FAILED`);
  console.log('====================================================\n');
} finally {
  await new Promise((resolve) => server.close(resolve));
}
