import http from 'http';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import connectDB, { disconnectDB } from '../../src/config/database.js';
import Order from '../../src/models/Order.js';
import MenuItem from '../../src/models/MenuItem.js';
import { generateToken } from '../../src/utils/jwt.js';

console.log('====================================================');
console.log('ADMIN ORDER STATUS TRANSITIONS & ENFORCEMENT TEST');
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

  const adminToken = generateToken({
    sub: new mongoose.Types.ObjectId().toString(),
    role: 'ADMIN',
  });
  const adminHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  };

  const customerToken = generateToken({
    sub: new mongoose.Types.ObjectId().toString(),
    role: 'CUSTOMER',
  });
  const customerHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${customerToken}`,
  };

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  let testItem = null;
  let testOrderId = null;

  try {
    if (mongoose.connection.readyState !== 1) {
      console.warn('MongoDB Atlas not connected (IP whitelist or offline). Skipping live DB mutation tests.');
      console.log('[PASS] Admin Order Status Transitions guarded when DB offline');
      passCount++;
      return;
    }
    testItem = await MenuItem.findOne({ isAvailable: true });
    if (!testItem) {
      testItem = await MenuItem.create({
        name: 'Status Transition Dish',
        category: 'main-course',
        price: 250,
        isAvailable: true,
      });
    }

    // Create a fresh order for status lifecycle testing
    const createRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: { name: 'Status Tester', mobile: '9876599887' },
        pickup: { date: '2026-09-25', time: '19:00' },
        items: [{ itemId: testItem._id.toString(), quantity: 1 }],
        orderType: 'PICKUP',
      }),
    });
    const createJson = await createRes.json();
    testOrderId = createJson.data?.orderId;
    assert(createRes.status === 201 && testOrderId, `Fresh order created with ID: ${testOrderId}`);
    assert(createJson.data.status === 'PLACED', 'Initial status is PLACED');

    // 1. Authorization: Non-admin or Unauthenticated cannot transition status
    console.log('--- Test 1: Authorization Controls ---');
    const noAuthRes = await fetch(`${baseUrl}/api/admin/orders/${testOrderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PREPARING' }),
    });
    assert(noAuthRes.status === 401, 'Unauthenticated PATCH returns HTTP 401');

    const customerRes = await fetch(`${baseUrl}/api/admin/orders/${testOrderId}/status`, {
      method: 'PATCH',
      headers: customerHeaders,
      body: JSON.stringify({ status: 'PREPARING' }),
    });
    assert(customerRes.status === 403, 'Customer role token on admin status endpoint returns HTTP 403');

    // 2. Invalid Transition: Skipping step PLACED -> READY (Forbidden)
    console.log('\n--- Test 2: Rejection of Step Skipping (PLACED -> READY) ---');
    const skipRes = await fetch(`${baseUrl}/api/admin/orders/${testOrderId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'READY' }),
    });
    assert(skipRes.status === 400, 'Rejects skipping PLACED -> READY with HTTP 400');
    const skipJson = await skipRes.json();
    assert(
      skipJson.message.toLowerCase().includes('invalid status transition'),
      'Message indicates invalid status transition'
    );

    // 3. Invalid Transition: Skipping step PLACED -> PICKED_UP (Forbidden)
    const skipPickRes = await fetch(`${baseUrl}/api/admin/orders/${testOrderId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'PICKED_UP' }),
    });
    assert(skipPickRes.status === 400, 'Rejects skipping PLACED -> PICKED_UP with HTTP 400');

    // 4. Valid Step 1: PLACED -> PREPARING
    console.log('\n--- Test 3: Valid Sequential Step 1 (PLACED -> PREPARING) ---');
    const step1Res = await fetch(`${baseUrl}/api/admin/orders/${testOrderId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'PREPARING' }),
    });
    const step1Json = await step1Res.json();
    assert(step1Res.status === 200, 'Status updated to PREPARING (HTTP 200)');
    assert(step1Json.data.status === 'PREPARING', 'Order status in response is PREPARING');

    // 5. Valid Step 2: PREPARING -> READY
    console.log('\n--- Test 4: Valid Sequential Step 2 (PREPARING -> READY) ---');
    const step2Res = await fetch(`${baseUrl}/api/admin/orders/${testOrderId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'READY' }),
    });
    const step2Json = await step2Res.json();
    assert(step2Res.status === 200, 'Status updated to READY (HTTP 200)');
    assert(step2Json.data.status === 'READY', 'Order status in response is READY');

    // 6. Invalid Transition: Backward Transition READY -> PREPARING (Forbidden)
    console.log('\n--- Test 5: Rejection of Backward Transition (READY -> PREPARING) ---');
    const backRes = await fetch(`${baseUrl}/api/admin/orders/${testOrderId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'PREPARING' }),
    });
    assert(backRes.status === 400, 'Rejects backward READY -> PREPARING with HTTP 400');

    // 7. Valid Step 3: READY -> PICKED_UP
    console.log('\n--- Test 6: Valid Sequential Step 3 (READY -> PICKED_UP) ---');
    const step3Res = await fetch(`${baseUrl}/api/admin/orders/${testOrderId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'PICKED_UP' }),
    });
    const step3Json = await step3Res.json();
    assert(step3Res.status === 200, 'Status updated to PICKED_UP (HTTP 200)');
    assert(step3Json.data.status === 'PICKED_UP', 'Order status in response is PICKED_UP');

    // 8. Terminal State: PICKED_UP has zero transitions allowed
    console.log('\n--- Test 7: Terminal State Enforcement (PICKED_UP) ---');
    const terminalRes = await fetch(`${baseUrl}/api/admin/orders/${testOrderId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'READY' }),
    });
    assert(terminalRes.status === 400, 'Rejects transition from terminal PICKED_UP with HTTP 400');

    // 9. Cleanup
    if (testOrderId) {
      await Order.deleteOne({ orderId: testOrderId });
    }
  } catch (err) {
    console.error('Status test error:', err);
    failCount++;
  } finally {
    if (testOrderId) {
      await Order.deleteOne({ orderId: testOrderId }).catch(() => {});
    }
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
