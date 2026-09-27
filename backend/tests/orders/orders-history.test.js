import http from 'http';
import app from '../../app.js';

console.log('====================================================');
console.log('CUSTOMER ORDER HISTORY API TEST SUITE');
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
    // 1. Missing Mobile Parameter Safe Behavior (Does not leak all customer orders)
    console.log('--- Test 1: Missing Mobile Parameter Safe Behavior ---');
    const resNoMobile = await fetch(`${baseUrl}/api/orders`);
    const dataNoMobile = await resNoMobile.json();

    assert(resNoMobile.status === 200, 'GET /api/orders without mobile returns HTTP 200 with safe empty list');
    assert(dataNoMobile.success === true, 'Response has success: true');
    assert(Array.isArray(dataNoMobile.data) && dataNoMobile.data.length === 0, 'data is safe empty array');
    assert(dataNoMobile.message.includes('Self-Pickup'), 'Message specifies Restaurant Self-Pickup');

    // 2. Invalid Mobile Parameter Rejection (400)
    console.log('\n--- Test 2: Invalid Mobile Parameter Rejection ---');
    const resBadMobile = await fetch(`${baseUrl}/api/orders?mobile=invalid_mobile_123`);
    const dataBadMobile = await resBadMobile.json();

    assert(resBadMobile.status === 400, 'GET /api/orders with invalid mobile returns HTTP 400');
    assert(dataBadMobile.success === false, 'Invalid mobile response has success: false');
    assert(dataBadMobile.message.includes('mobile'), 'Error message clarifies valid mobile requirement');

    // 3. Valid Mobile Query Handling
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

    // 4. Pagination Parameters
    console.log('\n--- Test 4: Pagination Handling ---');
    const resPagination = await fetch(`${baseUrl}/api/orders?mobile=9876543210&page=2&limit=5`);
    const dataPagination = await resPagination.json();

    assert(resPagination.status === 200, 'Pagination query returns HTTP 200');
    assert(dataPagination.meta.page === 2, 'meta.page reflects requested page');
    assert(dataPagination.meta.limit === 5, 'meta.limit reflects requested limit');
  } catch (err) {
    console.error('Customer order history test error:', err);
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
