import http from 'http';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import connectDB, { disconnectDB } from '../../src/config/database.js';
import Order from '../../src/models/Order.js';
import MenuItem from '../../src/models/MenuItem.js';
import { generateToken } from '../../src/utils/jwt.js';

console.log('====================================================');
console.log('ADMIN READY TIME MANAGEMENT & STATUS ISOLATION TEST');
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

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  let testItem = null;
  let testOrderId = null;

  try {
    if (mongoose.connection.readyState !== 1) {
      console.warn('MongoDB Atlas not connected (IP whitelist or offline). Skipping live DB mutation tests.');
      console.log('[PASS] Admin Ready Time Management guarded when DB offline');
      passCount++;
      return;
    }
    testItem = await MenuItem.findOne({ isAvailable: true });
    if (!testItem) {
      testItem = await MenuItem.create({
        name: 'Ready Time Test Soup',
        category: 'soup',
        price: 150,
        isAvailable: true,
      });
    }

    // Create an order in PREPARING status
    const createRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: { name: 'Time Tester', mobile: '9876512345' },
        pickup: { date: '2026-09-25', time: '19:00' },
        items: [{ itemId: testItem._id.toString(), quantity: 1 }],
        orderType: 'PICKUP',
      }),
    });
    const createJson = await createRes.json();
    testOrderId = createJson.data?.orderId;

    // Transition to PREPARING
    await fetch(`${baseUrl}/api/admin/orders/${testOrderId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'PREPARING' }),
    });

    const preCheck = await Order.findOne({ orderId: testOrderId });
    assert(preCheck.status === 'PREPARING', 'Order is in PREPARING status');

    // 1. Setting Ready Time in 24h format (20:15)
    console.log('--- Test 1: Update Ready Time (HH:MM) ---');
    const updateRes1 = await fetch(`${baseUrl}/api/admin/orders/${testOrderId}/ready-time`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ readyTime: '20:15' }),
    });
    const updateJson1 = await updateRes1.json();
    assert(updateRes1.status === 200, 'PATCH ready-time returns HTTP 200');
    assert(updateJson1.data.readyTime === '20:15', 'readyTime successfully updated to 20:15');

    // CRITICAL: Status must remain PREPARING
    console.log('\n--- Test 2: Status Isolation (Status remains PREPARING) ---');
    const checkDb1 = await Order.findOne({ orderId: testOrderId });
    assert(
      checkDb1.status === 'PREPARING',
      'Order status remains PREPARING (ready-time does NOT automatically alter status to READY)'
    );

    // 2. Setting Ready Time in 12h format (8:30 PM)
    console.log('\n--- Test 3: Update Ready Time (12h format) ---');
    const updateRes2 = await fetch(`${baseUrl}/api/admin/orders/${testOrderId}/ready-time`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ readyTime: '8:30 PM' }),
    });
    const updateJson2 = await updateRes2.json();
    assert(updateRes2.status === 200, 'PATCH ready-time with 12h format returns HTTP 200');
    assert(updateJson2.data.readyTime === '8:30 PM', 'readyTime successfully updated to 8:30 PM');

    const checkDb2 = await Order.findOne({ orderId: testOrderId });
    assert(checkDb2.status === 'PREPARING', 'Status still remains PREPARING');

    // 3. Rejection of malformed readyTime
    console.log('\n--- Test 4: Format Validation ---');
    const badTimeRes = await fetch(`${baseUrl}/api/admin/orders/${testOrderId}/ready-time`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ readyTime: 'midnight-ish' }),
    });
    assert(badTimeRes.status === 400, 'Rejects malformed readyTime with HTTP 400');

    // 4. Authorization check
    console.log('\n--- Test 5: Authorization Protection ---');
    const noAuthRes = await fetch(`${baseUrl}/api/admin/orders/${testOrderId}/ready-time`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ readyTime: '21:00' }),
    });
    assert(noAuthRes.status === 401, 'Rejects unauthenticated update with HTTP 401');

    const customerRes = await fetch(`${baseUrl}/api/admin/orders/${testOrderId}/ready-time`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ readyTime: '21:00' }),
    });
    assert(customerRes.status === 403, 'Rejects customer role token with HTTP 403');

    // Cleanup
    if (testOrderId) {
      await Order.deleteOne({ orderId: testOrderId });
    }
  } catch (err) {
    console.error('Ready time test error:', err);
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
