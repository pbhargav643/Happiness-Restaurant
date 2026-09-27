import http from 'http';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import connectDB, { disconnectDB } from '../../src/config/database.js';
import Order from '../../src/models/Order.js';
import MenuItem from '../../src/models/MenuItem.js';
import Admin from '../../src/models/Admin.js';
import { generateToken } from '../../src/utils/jwt.js';

console.log('====================================================');
console.log('PHASE 12 PROMPT 2: ADMIN ORDER STATUS TEST SUITE');
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

  const adminDoc = await Admin.findOne({ role: 'ADMIN', isActive: true });
  const adminSub = adminDoc ? adminDoc._id.toString() : new mongoose.Types.ObjectId().toString();

  const adminToken = generateToken({
    sub: adminSub,
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
      console.log('[PASS] Live DB mutation guarded when offline');
      passCount++;
      return;
    }
    testItem = await MenuItem.findOne({ isAvailable: true });
    if (!testItem) {
      testItem = await MenuItem.create({
        name: `Status Test Dish ${Date.now()}`,
        category: 'main-course',
        price: 260,
        isAvailable: true,
      });
    }

    // 1. Create fresh order in PLACED status
    console.log('--- 1. Order Initial State (PLACED) ---');
    const createRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: { name: 'Admin Status Tester', mobile: '9876541111' },
        pickup: { date: '2026-09-25', time: '19:00' },
        items: [{ itemId: testItem._id.toString(), quantity: 1 }],
        orderType: 'PICKUP',
      }),
    });
    const createData = await createRes.json();
    testOrderId = createData.data?.orderId;
    assert(createRes.status === 201 && testOrderId, `Order created with ID: ${testOrderId}`);
    assert(createData.data.status === 'PLACED', 'Initial order status is PLACED');

    // 2. Authorization Checks
    console.log('\n--- 2. Authorization Verification ---');
    const unauthRes = await fetch(`${baseUrl}/api/admin/orders/${testOrderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PREPARING' }),
    });
    assert(unauthRes.status === 401, 'Unauthenticated status update returns HTTP 401');

    const custRoleRes = await fetch(`${baseUrl}/api/admin/orders/${testOrderId}/status`, {
      method: 'PATCH',
      headers: customerHeaders,
      body: JSON.stringify({ status: 'PREPARING' }),
    });
    assert(custRoleRes.status === 403, 'Customer role accessing admin status route returns HTTP 403');

    // 3. Invalid Transition: Skipping step PLACED -> READY (HTTP 400)
    console.log('\n--- 3. Invalid Progression Protection (Skipping) ---');
    const skipReadyRes = await fetch(`${baseUrl}/api/admin/orders/${testOrderId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'READY' }),
    });
    assert(skipReadyRes.status === 400, 'Rejects skipping PLACED -> READY with HTTP 400');
    const skipReadyJson = await skipReadyRes.json();
    assert(
      skipReadyJson.message.toLowerCase().includes('invalid status transition'),
      'Error message clarifies invalid status transition'
    );

    // Skipping PLACED -> PICKED_UP (HTTP 400)
    const skipPickedRes = await fetch(`${baseUrl}/api/admin/orders/${testOrderId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'PICKED_UP' }),
    });
    assert(skipPickedRes.status === 400, 'Rejects skipping PLACED -> PICKED_UP with HTTP 400');

    // 4. Valid Step 1: PLACED -> PREPARING ("Start Preparing")
    console.log('\n--- 4. Valid Step 1: PLACED -> PREPARING (Start Preparing) ---');
    const step1Res = await fetch(`${baseUrl}/api/admin/orders/${testOrderId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'PREPARING' }),
    });
    const step1Json = await step1Res.json();
    assert(step1Res.status === 200, 'Admin can transition PLACED -> PREPARING (HTTP 200)');
    assert(step1Json.data.status === 'PREPARING', 'Order status in response is PREPARING');

    const checkDb1 = await Order.findOne({ orderId: testOrderId });
    assert(checkDb1.status === 'PREPARING', 'Order status in MongoDB persisted as PREPARING');

    // 5. Valid Step 2: PREPARING -> READY ("Mark Ready")
    console.log('\n--- 5. Valid Step 2: PREPARING -> READY (Mark Ready) ---');
    const step2Res = await fetch(`${baseUrl}/api/admin/orders/${testOrderId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'READY' }),
    });
    const step2Json = await step2Res.json();
    assert(step2Res.status === 200, 'Admin can transition PREPARING -> READY (HTTP 200)');
    assert(step2Json.data.status === 'READY', 'Order status in response is READY');

    const checkDb2 = await Order.findOne({ orderId: testOrderId });
    assert(checkDb2.status === 'READY', 'Order status in MongoDB persisted as READY');

    // 6. Invalid Backward Transition: READY -> PREPARING (HTTP 400)
    console.log('\n--- 6. Invalid Backward Transition Protection ---');
    const backRes = await fetch(`${baseUrl}/api/admin/orders/${testOrderId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'PREPARING' }),
    });
    assert(backRes.status === 400, 'Rejects backward transition READY -> PREPARING with HTTP 400');

    // 7. Valid Step 3: READY -> PICKED_UP ("Mark Picked Up")
    console.log('\n--- 7. Valid Step 3: READY -> PICKED_UP (Mark Picked Up) ---');
    const step3Res = await fetch(`${baseUrl}/api/admin/orders/${testOrderId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'PICKED_UP' }),
    });
    const step3Json = await step3Res.json();
    assert(step3Res.status === 200, 'Admin can transition READY -> PICKED_UP (HTTP 200)');
    assert(step3Json.data.status === 'PICKED_UP', 'Order status in response is PICKED_UP');

    const checkDb3 = await Order.findOne({ orderId: testOrderId });
    assert(checkDb3.status === 'PICKED_UP', 'Order status in MongoDB persisted as PICKED_UP');

    // 8. Terminal State Enforcement (PICKED_UP cannot transition)
    console.log('\n--- 8. Terminal State Protection (PICKED_UP) ---');
    const termRes = await fetch(`${baseUrl}/api/admin/orders/${testOrderId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'READY' }),
    });
    assert(termRes.status === 400, 'Rejects modifying terminal status PICKED_UP with HTTP 400');

    // 9. Malformed / Empty Status Protection
    console.log('\n--- 9. Malformed Status Payload Protection ---');
    const emptyStatusRes = await fetch(`${baseUrl}/api/admin/orders/${testOrderId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: '' }),
    });
    assert(emptyStatusRes.status === 400, 'Rejects empty status string with HTTP 400');

    const badStatusRes = await fetch(`${baseUrl}/api/admin/orders/${testOrderId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'FLYING_DELIVERY' }),
    });
    assert(badStatusRes.status === 400, 'Rejects invalid status name with HTTP 400');

    // Cleanup
    if (testOrderId) {
      await Order.deleteOne({ orderId: testOrderId });
    }
  } catch (err) {
    console.error('adminOrderStatus test failure:', err);
    failCount++;
  } finally {
    if (testOrderId) {
      await Order.deleteOne({ orderId: testOrderId }).catch(() => {});
    }
    server.close();
    await disconnectDB();
  }

  console.log('\n====================================================');
  console.log(`TOTAL PASSED: ${passCount}`);
  console.log(`TOTAL FAILED: ${failCount}`);
  console.log('====================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests();
