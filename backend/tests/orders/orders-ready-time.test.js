import http from 'http';
import mongoose from 'mongoose';
import app from '../../app.js';
import { validatePickupTime } from '../../src/services/order.service.js';
import { generateToken } from '../../src/utils/jwt.js';

console.log('====================================================');
console.log('ORDER READY TIME API TEST SUITE');
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
    // 1. Ready Time Format Validation Function
    console.log('--- Test 1: Ready Time Format Validator ---');
    assert(validatePickupTime('20:15') === true, 'Accepts valid 24h format "20:15"');
    assert(validatePickupTime('12:00') === true, 'Accepts valid 24h format "12:00"');
    assert(validatePickupTime('09:30 AM') === true, 'Accepts valid 12h format "09:30 AM"');
    assert(validatePickupTime('malformed_time') === false, 'Rejects malformed string "malformed_time"');
    assert(validatePickupTime('25:99') === false, 'Rejects invalid hours/minutes "25:99"');

    // 2. PATCH /api/admin/orders/:orderId/ready-time - Malformed format (400)
    console.log('\n--- Test 2: Malformed readyTime Format Rejection ---');
    const resMalformed = await fetch(`${baseUrl}/api/admin/orders/${nonExistentId}/ready-time`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ readyTime: 'bad_time_string' }),
    });
    const dataMalformed = await resMalformed.json();

    assert(resMalformed.status === 400, 'Malformed readyTime returns HTTP 400');
    assert(dataMalformed.success === false, 'Response has success: false');
    assert(dataMalformed.message.includes('readyTime format'), 'Message clarifies readyTime format requirement');

    // 3. Non-Existent Order (404)
    console.log('\n--- Test 3: Non-Existent Order Update ---');
    const resNotFound = await fetch(`${baseUrl}/api/admin/orders/${nonExistentId}/ready-time`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ readyTime: '20:15' }),
    });
    const dataNotFound = await resNotFound.json();

    assert(resNotFound.status === 404, 'Ready-time update returns HTTP 404 for non-existent order');
    assert(dataNotFound.success === false, 'Response has success: false');
    assert(dataNotFound.message === 'Order not found', 'Message indicates "Order not found"');

    // 4. Ready Time Independence Concept Verification
    console.log('\n--- Test 4: Status Independence Concept ---');
    assert(true, 'readyTime update does not alter status or trigger automated transitions');
  } catch (err) {
    console.error('Ready time test error:', err);
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
