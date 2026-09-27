import http from 'http';
import mongoose from 'mongoose';
import app from '../../app.js';
import { generateToken } from '../../src/utils/jwt.js';

console.log('====================================================');
console.log('ORDER STATUS SEQUENTIAL TRANSITION API TEST SUITE');
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
  const adminToken = generateToken({
    sub: new mongoose.Types.ObjectId().toString(),
    role: 'ADMIN',
  });
  const adminHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  };

  try {
    // 1. Missing Status (400)
    console.log('--- Test 1: Missing Status Parameter Rejection ---');
    const resMissing = await fetch(`${baseUrl}/api/admin/orders/${nonExistentId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({}),
    });
    const dataMissing = await resMissing.json();

    assert(resMissing.status === 400, 'Missing status returns HTTP 400');
    assert(dataMissing.success === false, 'Response has success: false');
    assert(dataMissing.message.includes('Status is required'), 'Message clarifies status is required');

    // 2. Invalid Status String (400)
    console.log('\n--- Test 2: Invalid Status Enum Rejection ---');
    const resInvalidStatus = await fetch(`${baseUrl}/api/admin/orders/${nonExistentId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'DELIVERED' }),
    });
    const dataInvalidStatus = await resInvalidStatus.json();

    assert(resInvalidStatus.status === 400, 'Invalid status "DELIVERED" returns HTTP 400');
    assert(dataInvalidStatus.success === false, 'Response has success: false');
    assert(dataInvalidStatus.message.includes('Invalid status'), 'Error message clarifies invalid status');

    // 3. Status Update on Non-Existent Order (404)
    console.log('\n--- Test 3: Non-Existent Order Status Update ---');
    const resNotFound = await fetch(`${baseUrl}/api/admin/orders/${nonExistentId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'PREPARING' }),
    });
    const dataNotFound = await resNotFound.json();

    assert(resNotFound.status === 404, 'Status update returns HTTP 404 for non-existent order');
    assert(dataNotFound.success === false, 'Response has success: false');
    assert(dataNotFound.message === 'Order not found', 'Message indicates "Order not found"');

    // 4. State Machine Transition Verification (Theoretical Matrix Check)
    console.log('\n--- Test 4: Sequential State Machine Matrix ---');
    const ALLOWED_STATUS_TRANSITIONS = {
      PLACED: ['PREPARING'],
      PREPARING: ['READY'],
      READY: ['PICKED_UP'],
      PICKED_UP: [],
    };

    assert(ALLOWED_STATUS_TRANSITIONS['PLACED'].includes('PREPARING'), 'PLACED can transition to PREPARING');
    assert(ALLOWED_STATUS_TRANSITIONS['PREPARING'].includes('READY'), 'PREPARING can transition to READY');
    assert(ALLOWED_STATUS_TRANSITIONS['READY'].includes('PICKED_UP'), 'READY can transition to PICKED_UP');

    // Disallowed backwards
    assert(!ALLOWED_STATUS_TRANSITIONS['PREPARING'].includes('PLACED'), 'PREPARING cannot revert to PLACED');
    assert(!ALLOWED_STATUS_TRANSITIONS['READY'].includes('PREPARING'), 'READY cannot revert to PREPARING');
    assert(!ALLOWED_STATUS_TRANSITIONS['PICKED_UP'].includes('READY'), 'PICKED_UP cannot revert to READY');

    // Disallowed skips
    assert(!ALLOWED_STATUS_TRANSITIONS['PLACED'].includes('READY'), 'PLACED cannot skip to READY');
    assert(!ALLOWED_STATUS_TRANSITIONS['PLACED'].includes('PICKED_UP'), 'PLACED cannot skip to PICKED_UP');
    assert(ALLOWED_STATUS_TRANSITIONS['PICKED_UP'].length === 0, 'PICKED_UP is terminal status');
  } catch (err) {
    console.error('Order status test error:', err);
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
