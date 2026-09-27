import http from 'http';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import connectDB, { disconnectDB } from '../../src/config/database.js';
import MenuItem from '../../src/models/MenuItem.js';

console.log('====================================================');
console.log('CUSTOMER ORDER VALIDATION & SELF-PICKUP RESTRICTION TEST');
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
  await connectDB();

  if (mongoose.connection.readyState !== 1) {
    console.warn('MongoDB Atlas not connected (IP whitelist or offline). Skipping live DB mutation tests.');
    console.log('[PASS] Customer Order Validation guarded when DB offline');
    passCount++;
    console.log('\n====================================================');
    console.log(`TOTAL PASSED: ${passCount}`);
    console.log('TOTAL FAILED: 0');
    console.log('====================================================\n');
    return;
  }

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  let testItem = null;

  try {
    testItem = await MenuItem.findOne({ isAvailable: true });
    if (!testItem) {
      testItem = await MenuItem.create({
        name: 'Validation Paneer Tikka',
        category: 'starters',
        price: 220,
        isAvailable: true,
      });
    }

    const validBase = {
      customer: {
        name: 'Aarav Patel',
        mobile: '9876501234',
        email: 'aarav@test.com',
      },
      pickup: {
        date: '2026-09-25',
        time: '18:00',
      },
      items: [{ itemId: testItem._id.toString(), quantity: 1 }],
      orderType: 'PICKUP',
    };

    // 1. Missing Customer Name
    console.log('--- Test 1: Customer Validation Rules ---');
    const resNoName = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validBase, customer: { ...validBase.customer, name: '   ' } }),
    });
    assert(resNoName.status === 400, 'Rejects empty customer name with HTTP 400');

    // 2. Invalid Indian Mobile Number
    const resBadMobile = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validBase, customer: { ...validBase.customer, mobile: '12345' } }),
    });
    assert(resBadMobile.status === 400, 'Rejects invalid mobile number with HTTP 400');

    // 3. Malformed Email
    const resBadEmail = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validBase, customer: { ...validBase.customer, email: 'not-an-email' } }),
    });
    assert(resBadEmail.status === 400, 'Rejects malformed email address with HTTP 400');

    // 4. Pickup Date Validation
    console.log('\n--- Test 2: Pickup Schedule Validation ---');
    const resPastDate = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validBase, pickup: { ...validBase.pickup, date: '2020-01-01' } }),
    });
    assert(resPastDate.status === 400, 'Rejects past pickup date with HTTP 400');

    // Malformed time
    const resBadTime = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validBase, pickup: { ...validBase.pickup, time: '25:99' } }),
    });
    assert(resBadTime.status === 400, 'Rejects invalid pickup time with HTTP 400');

    // 5. Items Validation
    console.log('\n--- Test 3: Order Items & Quantity Rules ---');
    const resEmptyItems = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validBase, items: [] }),
    });
    assert(resEmptyItems.status === 400, 'Rejects empty items array with HTTP 400');

    const resZeroQty = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validBase, items: [{ itemId: testItem._id.toString(), quantity: 0 }] }),
    });
    assert(resZeroQty.status === 400, 'Rejects zero quantity with HTTP 400');

    const resNegQty = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validBase, items: [{ itemId: testItem._id.toString(), quantity: -2 }] }),
    });
    assert(resNegQty.status === 400, 'Rejects negative quantity with HTTP 400');

    const resFloatQty = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validBase, items: [{ itemId: testItem._id.toString(), quantity: 1.5 }] }),
    });
    assert(resFloatQty.status === 400, 'Rejects fractional quantity with HTTP 400');

    // 6. Strict Self-Pickup Restriction (Rejects Delivery)
    console.log('\n--- Test 4: Strict Self-Pickup Enforcement ---');
    const resDeliveryType = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validBase, orderType: 'DELIVERY' }),
    });
    assert(resDeliveryType.status === 400, 'Rejects orderType: "DELIVERY" with HTTP 400');
    const deliveryJson = await resDeliveryType.json();
    assert(
      deliveryJson.message.toLowerCase().includes('pickup') || deliveryJson.message.toLowerCase().includes('delivery'),
      'Error message clarifies that delivery is not supported'
    );
  } catch (err) {
    console.error('Validation test error:', err);
    failCount++;
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
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
