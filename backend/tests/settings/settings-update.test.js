import http from 'http';
import app from '../../app.js';
import mongoose from 'mongoose';
import { generateToken } from '../../src/utils/jwt.js';

console.log('====================================================');
console.log('RESTAURANT SETTINGS UPDATE & VALIDATION TEST SUITE');
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
  const adminToken = generateToken({ sub: new mongoose.Types.ObjectId().toString(), role: 'ADMIN' });
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  };

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // 1. Valid Settings Update
    console.log('--- Test 1: PATCH /api/settings Valid Update ---');
    const resValid = await fetch(`${baseUrl}/api/settings`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        slotInterval: 20,
        preparationBuffer: 25,
      }),
    });
    const dataValid = await resValid.json();

    assert(resValid.status === 200, 'PATCH /api/settings returns HTTP 200');
    assert(dataValid.success === true, 'Response contains success: true');
    assert(dataValid.data.slotInterval === 20, 'slotInterval successfully updated to 20');
    assert(dataValid.data.preparationBuffer === 25, 'preparationBuffer successfully updated to 25');

    // 2. Strict Rejection of Delivery Settings
    console.log('\n--- Test 2: Rejection of Delivery Parameters ---');
    const resDeliveryFee = await fetch(`${baseUrl}/api/settings`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ deliveryFee: 50 }),
    });
    const dataDeliveryFee = await resDeliveryFee.json();
    assert(resDeliveryFee.status === 400, 'Rejects deliveryFee with HTTP 400');
    assert(dataDeliveryFee.message.includes('Delivery settings are not permitted'), 'Message specifies delivery is not permitted');

    const resDeliveryAddr = await fetch(`${baseUrl}/api/settings`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ deliveryAddress: 'Main Street' }),
    });
    assert(resDeliveryAddr.status === 400, 'Rejects deliveryAddress with HTTP 400');

    const resDeliveryEnabled = await fetch(`${baseUrl}/api/settings`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ deliveryEnabled: true }),
    });
    assert(resDeliveryEnabled.status === 400, 'Rejects deliveryEnabled with HTTP 400');

    // 3. Validation of Operational Fields
    console.log('\n--- Test 3: Field Validation Rules ---');
    const resBadPrep = await fetch(`${baseUrl}/api/settings`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ preparationBuffer: -10 }),
    });
    assert(resBadPrep.status === 400, 'Rejects negative preparationBuffer with HTTP 400');

    const resBadSlot = await fetch(`${baseUrl}/api/settings`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ slotInterval: 0 }),
    });
    assert(resBadSlot.status === 400, 'Rejects zero slotInterval with HTTP 400');

    const resBadTime = await fetch(`${baseUrl}/api/settings`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ openingTime: '99:99' }),
    });
    assert(resBadTime.status === 400, 'Rejects malformed openingTime with HTTP 400');

    const resEmptyName = await fetch(`${baseUrl}/api/settings`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ restaurantName: '   ' }),
    });
    assert(resEmptyName.status === 400, 'Rejects empty restaurantName with HTTP 400');
  } catch (err) {
    console.error('Settings update test error:', err);
    failCount++;
  } finally {
    await new Promise((resolve) => server.close(resolve));
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
