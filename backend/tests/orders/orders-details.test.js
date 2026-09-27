import http from 'http';
import mongoose from 'mongoose';
import app from '../../app.js';
import { generateToken } from '../../src/utils/jwt.js';

console.log('====================================================');
console.log('ORDER DETAILS API TEST SUITE (CUSTOMER & ADMIN)');
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

  const nonExistentId = 'RF-20260921-999999';

  try {
    // 1. Customer GET /api/orders/:orderId - Non-existent Order (404)
    console.log('--- Test 1: Customer Order Lookup 404 Response ---');
    const resCustomerNotFound = await fetch(`${baseUrl}/api/orders/${nonExistentId}`);
    const dataCustomerNotFound = await resCustomerNotFound.json();

    assert(resCustomerNotFound.status === 404, 'GET /api/orders/:orderId returns HTTP 404 for unknown order ID');
    assert(dataCustomerNotFound.success === false, '404 response contains success: false');
    assert(dataCustomerNotFound.message === 'Order not found', 'Message strictly matches: "Order not found"');
    assert(!dataCustomerNotFound.stack, 'Response does not expose internal stack traces');

    // 2. Customer GET /api/orders/:orderId - Arbitrary / Malformed ID string (404)
    console.log('\n--- Test 2: Arbitrary Malformed Order ID Handling ---');
    const resArbitrary = await fetch(`${baseUrl}/api/orders/random-garbage-order-id-xyz`);
    const dataArbitrary = await resArbitrary.json();

    assert(resArbitrary.status === 404, 'Malformed order ID returns HTTP 404 safely');
    assert(dataArbitrary.success === false, 'Response contains success: false');
    assert(dataArbitrary.message === 'Order not found', 'Message matches "Order not found"');

    // 3. Admin GET /api/admin/orders/:orderId - Non-existent Order (404)
    console.log('\n--- Test 3: Admin Order Lookup 404 Response ---');
    const adminToken = generateToken({ sub: new mongoose.Types.ObjectId().toString(), role: 'ADMIN' });
    const resAdminNotFound = await fetch(`${baseUrl}/api/admin/orders/${nonExistentId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dataAdminNotFound = await resAdminNotFound.json();

    assert(resAdminNotFound.status === 404, 'GET /api/admin/orders/:orderId returns HTTP 404 for unknown order ID');
    assert(dataAdminNotFound.success === false, 'Admin 404 response contains success: false');
    assert(dataAdminNotFound.message === 'Order not found', 'Admin 404 message matches "Order not found"');

    // 4. Response Envelope Consistency Check
    console.log('\n--- Test 4: Standard JSON Response Envelope ---');
    assert(typeof dataCustomerNotFound === 'object', 'Error response is a valid JSON object');
    assert('success' in dataCustomerNotFound && 'message' in dataCustomerNotFound, 'Conforms to { success, message } schema');
  } catch (err) {
    console.error('Order details test error:', err);
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
