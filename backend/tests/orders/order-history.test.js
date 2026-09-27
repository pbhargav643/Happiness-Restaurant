import http from 'http';
import app from '../../app.js';

console.log('====================================================');
console.log('CUSTOMER ORDER LOOKUP & HISTORY API TEST SUITE');
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

  try {
    // 1. GET /api/orders without mobile query
    console.log('--- Test 1: Missing Mobile Parameter Safe Behavior ---');
    const resNoMobile = await fetch(`${baseUrl}/api/orders`);
    const dataNoMobile = await resNoMobile.json();

    assert(resNoMobile.status === 200, 'GET /api/orders without mobile returns HTTP 200 with safe empty list');
    assert(dataNoMobile.success === true, 'Response has success: true');
    assert(Array.isArray(dataNoMobile.data), 'Response data is an array');
    assert(dataNoMobile.message.includes('Self-Pickup'), 'Message specifies Restaurant Self-Pickup');

    // 2. GET /api/orders with invalid mobile number
    console.log('\n--- Test 2: Invalid Mobile Parameter Rejection ---');
    const resBadMobile = await fetch(`${baseUrl}/api/orders?mobile=12345`);
    const dataBadMobile = await resBadMobile.json();

    assert(resBadMobile.status === 400, 'GET /api/orders with invalid mobile returns HTTP 400');
    assert(dataBadMobile.success === false, 'Invalid mobile response has success: false');

    // 3. GET /api/orders with valid mobile number
    console.log('\n--- Test 3: Valid Mobile Query Handling ---');
    const resValidMobile = await fetch(`${baseUrl}/api/orders?mobile=9876543210`);
    const dataValidMobile = await resValidMobile.json();

    assert(resValidMobile.status === 200, 'GET /api/orders?mobile=9876543210 returns HTTP 200');
    assert(dataValidMobile.success === true, 'Response contains success: true');
    assert(Array.isArray(dataValidMobile.data), 'Response data is an array');
    assert(typeof dataValidMobile.meta === 'object', 'Response includes meta pagination object');
    assert(typeof dataValidMobile.meta.page === 'number', 'meta.page is a number');
    assert(typeof dataValidMobile.meta.limit === 'number', 'meta.limit is a number');
    assert(typeof dataValidMobile.meta.total === 'number', 'meta.total is a number');

    // 4. GET /api/orders/:orderId with non-existent order ID
    console.log('\n--- Test 4: Single Order Lookup 404 Response ---');
    const resUnknownId = await fetch(`${baseUrl}/api/orders/RF-20260917-999999`);
    const dataUnknownId = await resUnknownId.json();

    assert(resUnknownId.status === 404, 'GET /api/orders/:orderId returns HTTP 404 for unknown order ID');
    assert(dataUnknownId.success === false, '404 response contains success: false');
    assert(dataUnknownId.message === 'Order not found', '404 message indicates "Order not found"');
  } catch (err) {
    console.error('Order history test error:', err);
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
