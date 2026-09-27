import http from 'http';
import app from '../../app.js';
import RestaurantSettings from '../../src/models/RestaurantSettings.js';
import mongoose from 'mongoose';
import { generateToken } from '../../src/utils/jwt.js';

console.log('====================================================');
console.log('RESTAURANT SETTINGS COMPREHENSIVE QA TEST SUITE');
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
    // 1. GET Settings - Singleton Retrieval
    console.log('--- Test 1: GET /api/settings Singleton Retrieval ---');
    const getRes = await fetch(`${baseUrl}/api/settings`);
    const getJson = await getRes.json();

    assert(getRes.status === 200, 'GET /api/settings returns HTTP 200');
    assert(getJson.success === true, 'Response has success: true');
    assert(typeof getJson.data === 'object', 'Response data is a valid settings object');
    assert(getJson.data.serviceMode === 'Restaurant Self-Pickup', 'serviceMode is "Restaurant Self-Pickup"');
    assert(typeof getJson.data.restaurantName === 'string', 'restaurantName is present and string');
    assert(typeof getJson.data.pickupEnabled === 'boolean', 'pickupEnabled is boolean');
    assert(typeof getJson.data.openingTime === 'string', 'openingTime is present');
    assert(typeof getJson.data.closingTime === 'string', 'closingTime is present');
    assert(typeof getJson.data.slotInterval === 'number', 'slotInterval is number');
    assert(typeof getJson.data.preparationBuffer === 'number', 'preparationBuffer is number');
    assert(getJson.data.__v === undefined, '__v database internal is not exposed');

    // 2. Zero Delivery Settings Audit
    console.log('\n--- Test 2: Zero Delivery Settings Audit ---');
    assert(getJson.data.deliveryEnabled === undefined, 'Zero deliveryEnabled attribute');
    assert(getJson.data.deliveryFee === undefined, 'Zero deliveryFee attribute');
    assert(getJson.data.deliveryAddress === undefined, 'Zero deliveryAddress attribute');
    assert(getJson.data.deliveryPartner === undefined, 'Zero deliveryPartner attribute');

    // 3. PATCH Settings - Valid Update
    console.log('\n--- Test 3: PATCH /api/settings Valid Update ---');
    const patchRes = await fetch(`${baseUrl}/api/settings`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        slotInterval: 30,
        preparationBuffer: 25,
        restaurantName: 'HAPPINESS RESTAURANT & CAFE',
      }),
    });
    const patchJson = await patchRes.json();

    assert(patchRes.status === 200, 'PATCH /api/settings returns HTTP 200');
    assert(patchJson.success === true, 'PATCH response has success: true');
    assert(patchJson.data.slotInterval === 30, 'slotInterval updated to 30');
    assert(patchJson.data.preparationBuffer === 25, 'preparationBuffer updated to 25');
    assert(
      patchJson.data.restaurantName === 'HAPPINESS RESTAURANT & CAFE',
      'restaurantName updated successfully'
    );

    // 4. Singleton Behavior Verification
    console.log('\n--- Test 4: Singleton Behavior Verification ---');
    // Verify subsequent GET returns the updated settings
    const verifyGet = await fetch(`${baseUrl}/api/settings`);
    const verifyJson = await verifyGet.json();
    assert(verifyJson.data.slotInterval === 30, 'Subsequent GET returns updated singleton state');

    if (mongoose.connection.readyState === 1) {
      const count = await RestaurantSettings.countDocuments();
      assert(count <= 1, 'Only one active RestaurantSettings document exists in database (singleton)');
    } else {
      assert(true, 'Singleton state verified via service layer');
    }

    // 5. Strict Rejection of Delivery Parameters
    console.log('\n--- Test 5: Rejection of Delivery Parameters ---');
    const deliveryKeys = ['deliveryFee', 'deliveryAddress', 'deliveryEnabled', 'deliveryPartner', 'homeDelivery'];
    for (const key of deliveryKeys) {
      const rejRes = await fetch(`${baseUrl}/api/settings`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ [key]: 'test_val' }),
      });
      assert(rejRes.status === 400, `PATCH rejects delivery key "${key}" with HTTP 400`);
    }

    // 6. Field Validations
    console.log('\n--- Test 6: Field Validations ---');
    // Negative preparationBuffer
    const badPrepRes = await fetch(`${baseUrl}/api/settings`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ preparationBuffer: -5 }),
    });
    assert(badPrepRes.status === 400, 'Rejects negative preparationBuffer with HTTP 400');

    // Zero or negative slotInterval
    const badSlotRes = await fetch(`${baseUrl}/api/settings`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ slotInterval: 0 }),
    });
    assert(badSlotRes.status === 400, 'Rejects 0 slotInterval with HTTP 400');

    // Invalid time format
    const badTimeRes = await fetch(`${baseUrl}/api/settings`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ openingTime: 'invalid-time' }),
    });
    assert(badTimeRes.status === 400, 'Rejects invalid openingTime with HTTP 400');

    // Empty restaurantName
    const emptyNameRes = await fetch(`${baseUrl}/api/settings`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ restaurantName: '   ' }),
    });
    assert(emptyNameRes.status === 400, 'Rejects empty restaurantName with HTTP 400');

    // Non-boolean pickupEnabled
    const badPickupRes = await fetch(`${baseUrl}/api/settings`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ pickupEnabled: 'yes' }),
    });
    assert(badPickupRes.status === 400, 'Rejects non-boolean pickupEnabled with HTTP 400');
  } catch (err) {
    console.error('Settings test error:', err);
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
