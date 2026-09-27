import http from 'http';
import app from '../../app.js';

console.log('====================================================');
console.log('RESTAURANT SETTINGS GET API TEST SUITE');
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
    console.log('--- Test 1: GET /api/settings Singleton Retrieval ---');
    const res = await fetch(`${baseUrl}/api/settings`);
    const json = await res.json();

    assert(res.status === 200, 'GET /api/settings returns HTTP 200');
    assert(json.success === true, 'Response contains success: true');
    assert(typeof json.data === 'object', 'Response data is a settings object');
    assert(
      json.data.serviceMode === 'Restaurant Self-Pickup',
      'serviceMode is strictly "Restaurant Self-Pickup"'
    );
    assert(typeof json.data.pickupEnabled === 'boolean', 'pickupEnabled is a boolean');
    assert(typeof json.data.openingTime === 'string', 'openingTime is configured');
    assert(typeof json.data.closingTime === 'string', 'closingTime is configured');
    assert(typeof json.data.slotInterval === 'number', 'slotInterval is a number');
    assert(typeof json.data.preparationBuffer === 'number', 'preparationBuffer is a number');

    console.log('\n--- Test 2: Zero Delivery Attributes Audit ---');
    assert(json.data.deliveryEnabled === undefined, 'Settings contains zero deliveryEnabled');
    assert(json.data.deliveryFee === undefined, 'Settings contains zero deliveryFee');
    assert(json.data.deliveryAddress === undefined, 'Settings contains zero deliveryAddress');
    assert(json.data.deliveryPartner === undefined, 'Settings contains zero deliveryPartner');
  } catch (err) {
    console.error('Settings GET test error:', err);
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
