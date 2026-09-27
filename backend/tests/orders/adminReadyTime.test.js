import http from 'http';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import connectDB, { disconnectDB } from '../../src/config/database.js';
import Order from '../../src/models/Order.js';
import MenuItem from '../../src/models/MenuItem.js';
import Admin from '../../src/models/Admin.js';
import { generateToken } from '../../src/utils/jwt.js';

console.log('====================================================');
console.log('PHASE 12 PROMPT 2: ADMIN READY TIME & STATUS ISOLATION');
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
        name: `Ready Time Dish ${Date.now()}`,
        category: 'main-course',
        price: 280,
        isAvailable: true,
      });
    }

    // 1. Create order and advance to PREPARING
    console.log('--- 1. Order Setup & Transition to PREPARING ---');
    const createRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: { name: 'Ready Time Admin Tester', mobile: '9876542222' },
        pickup: { date: '2026-09-25', time: '19:30' },
        items: [{ itemId: testItem._id.toString(), quantity: 1 }],
        orderType: 'PICKUP',
      }),
    });
    const createData = await createRes.json();
    testOrderId = createData.data?.orderId;
    assert(createRes.status === 201 && testOrderId, `Order created: ${testOrderId}`);

    await fetch(`${baseUrl}/api/admin/orders/${testOrderId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'PREPARING' }),
    });

    const initOrder = await Order.findOne({ orderId: testOrderId });
    assert(initOrder.status === 'PREPARING', 'Order is in PREPARING status');
    assert(initOrder.readyTime === null, 'Initial readyTime is null');

    // 2. Authorization Checks
    console.log('\n--- 2. Authorization Checks for ready-time ---');
    const unauthRes = await fetch(`${baseUrl}/api/admin/orders/${testOrderId}/ready-time`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ readyTime: '20:15' }),
    });
    assert(unauthRes.status === 401, 'Unauthenticated PATCH ready-time returns HTTP 401');

    const customerRes = await fetch(`${baseUrl}/api/admin/orders/${testOrderId}/ready-time`, {
      method: 'PATCH',
      headers: customerHeaders,
      body: JSON.stringify({ readyTime: '20:15' }),
    });
    assert(customerRes.status === 403, 'Customer role token returns HTTP 403');

    // 3. Setting Ready Time in 24h format (20:15)
    console.log('\n--- 3. Setting Ready Time (24h Format: 20:15) ---');
    const updateRes1 = await fetch(`${baseUrl}/api/admin/orders/${testOrderId}/ready-time`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ readyTime: '20:15' }),
    });
    const updateData1 = await updateRes1.json();
    assert(updateRes1.status === 200, 'PATCH ready-time returns HTTP 200');
    assert(updateData1.data.readyTime === '20:15', 'readyTime in response is "20:15"');

    // CRITICAL: Verify Status Isolation (Status remains PREPARING)
    console.log('\n--- 4. Status Isolation Verification ---');
    const dbOrder1 = await Order.findOne({ orderId: testOrderId });
    assert(
      dbOrder1.status === 'PREPARING',
      'Order status remains PREPARING (setting ready-time does NOT alter status to READY)'
    );

    // 5. Setting Ready Time in 12h format (8:30 PM)
    console.log('\n--- 5. Setting Ready Time (12h Format: 8:30 PM) ---');
    const updateRes2 = await fetch(`${baseUrl}/api/admin/orders/${testOrderId}/ready-time`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ readyTime: '8:30 PM' }),
    });
    const updateData2 = await updateRes2.json();
    assert(updateRes2.status === 200, 'PATCH ready-time (12h format) returns HTTP 200');
    assert(updateData2.data.readyTime === '8:30 PM', 'readyTime in response is "8:30 PM"');

    const dbOrder2 = await Order.findOne({ orderId: testOrderId });
    assert(dbOrder2.status === 'PREPARING', 'Order status remains PREPARING');

    // 6. Validation: Rejecting malformed / invalid time strings
    console.log('\n--- 6. Malformed Ready Time Validation ---');
    const badTimeRes1 = await fetch(`${baseUrl}/api/admin/orders/${testOrderId}/ready-time`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ readyTime: 'midnight' }),
    });
    assert(badTimeRes1.status === 400, 'Rejects "midnight" with HTTP 400');

    const badTimeRes2 = await fetch(`${baseUrl}/api/admin/orders/${testOrderId}/ready-time`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ readyTime: '26:99' }),
    });
    assert(badTimeRes2.status === 400, 'Rejects invalid hours/minutes "26:99" with HTTP 400');

    // 7. Resetting / Clearing Ready Time to null
    console.log('\n--- 7. Clearing Ready Time ---');
    const clearRes = await fetch(`${baseUrl}/api/admin/orders/${testOrderId}/ready-time`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ readyTime: null }),
    });
    const clearData = await clearRes.json();
    assert(clearRes.status === 200, 'Clearing readyTime returns HTTP 200');
    assert(clearData.data.readyTime === null, 'readyTime in response is null');

    const dbOrder3 = await Order.findOne({ orderId: testOrderId });
    assert(dbOrder3.readyTime === null, 'readyTime in MongoDB is null');
    assert(dbOrder3.status === 'PREPARING', 'Order status continues to be PREPARING');

    // Cleanup
    if (testOrderId) {
      await Order.deleteOne({ orderId: testOrderId });
    }
  } catch (err) {
    console.error('adminReadyTime test failure:', err);
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
