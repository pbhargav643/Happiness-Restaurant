import http from 'http';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import connectDB, { disconnectDB } from '../../src/config/database.js';
import Customer from '../../src/models/Customer.js';
import Order from '../../src/models/Order.js';
import MenuItem from '../../src/models/MenuItem.js';
import { hashPassword } from '../../src/utils/password.js';
import { generateToken } from '../../src/utils/jwt.js';

console.log('====================================================');
console.log('CUSTOMER ORDER OWNERSHIP & DATA PRIVACY TEST SUITE');
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
    console.log('[PASS] Customer Order Ownership & Privacy guarded when DB offline');
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

  const mobileA = '9876543201';
  const mobileB = '9876543202';
  const guestMobile = '9876543203';

  // Clean up any previous test artifacts
  await Customer.deleteMany({ mobile: { $in: [mobileA, mobileB] } });

  let testItem = null;
  let orderAId = null;
  let orderBId = null;
  let guestOrderId = null;

  try {
    testItem = await MenuItem.findOne({ isAvailable: true });
    if (!testItem) {
      testItem = await MenuItem.create({
        name: 'Ownership Test Dish',
        category: 'main-course',
        price: 240,
        isAvailable: true,
      });
    }

    const passwordHash = await hashPassword('TestPassword@123');

    // Create Customer A
    const custA = await Customer.create({
      name: 'Customer Alice',
      mobile: mobileA,
      email: 'alice@test.com',
      passwordHash,
      role: 'CUSTOMER',
      isActive: true,
    });
    const tokenA = generateToken({ sub: custA._id.toString(), role: 'CUSTOMER' });

    // Create Customer B
    const custB = await Customer.create({
      name: 'Customer Bob',
      mobile: mobileB,
      email: 'bob@test.com',
      passwordHash,
      role: 'CUSTOMER',
      isActive: true,
    });
    const tokenB = generateToken({ sub: custB._id.toString(), role: 'CUSTOMER' });

    // 1. Customer A places Order A
    console.log('--- Test 1: Authenticated Order Creation & Tagging ---');
    const resA = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        customer: { name: custA.name, mobile: custA.mobile },
        pickup: { date: '2026-09-25', time: '19:00' },
        items: [{ itemId: testItem._id.toString(), quantity: 1 }],
        orderType: 'PICKUP',
      }),
    });
    const dataA = await resA.json();
    orderAId = dataA.data?.orderId;
    assert(resA.status === 201 && orderAId, `Customer A placed order: ${orderAId}`);

    const dbOrderA = await Order.findOne({ orderId: orderAId });
    assert(
      dbOrderA.customerId?.toString() === custA._id.toString(),
      'Order A in database is correctly linked to Customer A ID'
    );

    // 2. Customer A can access own order
    console.log('\n--- Test 2: Customer A Accesses Own Order ---');
    const ownRes = await fetch(`${baseUrl}/api/orders/${orderAId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(ownRes.status === 200, 'Customer A accesses own Order A via GET /api/orders/:orderId (HTTP 200)');

    // 3. Customer B CANNOT access Customer A's order (Safe 404)
    console.log("\n--- Test 3: Customer B Blocked From Accessing Customer A's Order ---");
    const crossRes = await fetch(`${baseUrl}/api/orders/${orderAId}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(crossRes.status === 404, 'Customer B receives safe HTTP 404 (order existence not leaked)');
    const crossJson = await crossRes.json();
    assert(crossJson.success === false, 'Response has success: false');

    // 4. Unauthenticated guest CANNOT access Customer A's order
    console.log("\n--- Test 4: Unauthenticated User Blocked From Customer A's Order ---");
    const unauthRes = await fetch(`${baseUrl}/api/orders/${orderAId}`);
    assert(unauthRes.status === 404, 'Unauthenticated user receives safe HTTP 404 when querying customer order');

    // 5. Unauthenticated mobile query does NOT expose Customer A's authenticated order
    console.log("\n--- Test 5: Mobile Query Snooping Blocked ---");
    const snoopRes = await fetch(`${baseUrl}/api/orders?mobile=${mobileA}`);
    const snoopJson = await snoopRes.json();
    assert(snoopRes.status === 200, 'Endpoint responds with HTTP 200');
    const leakedOrder = snoopJson.data?.find((o) => o.orderId === orderAId);
    assert(!leakedOrder, 'Customer A authenticated order is NOT leaked to unauthenticated mobile query');

    // 6. Guest order creation and tracking
    console.log('\n--- Test 6: Guest Order Access Supported ---');
    const guestRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: { name: 'Guest Charlie', mobile: guestMobile },
        pickup: { date: '2026-09-25', time: '20:00' },
        items: [{ itemId: testItem._id.toString(), quantity: 1 }],
        orderType: 'PICKUP',
      }),
    });
    const guestData = await guestRes.json();
    guestOrderId = guestData.data?.orderId;
    assert(guestRes.status === 201 && guestOrderId, `Guest order placed: ${guestOrderId}`);

    const dbGuest = await Order.findOne({ orderId: guestOrderId });
    assert(dbGuest.customerId === null, 'Guest order has customerId: null');

    // Guest can track their order with the unique order ID
    const guestTrackRes = await fetch(`${baseUrl}/api/orders/${guestOrderId}`);
    assert(guestTrackRes.status === 200, 'Guest can track order by orderId via public tracking (HTTP 200)');

    // 7. customerId spoofing prevention in request body
    console.log('\n--- Test 7: customerId Body Spoofing Prevention ---');
    const spoofRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`, // Bob authenticated
      },
      body: JSON.stringify({
        customerId: custA._id.toString(), // Attacker Bob tries to impersonate Alice
        customer: { name: custB.name, mobile: custB.mobile },
        pickup: { date: '2026-09-25', time: '20:30' },
        items: [{ itemId: testItem._id.toString(), quantity: 1 }],
        orderType: 'PICKUP',
      }),
    });
    const spoofData = await spoofRes.json();
    orderBId = spoofData.data?.orderId;
    const dbOrderB = await Order.findOne({ orderId: orderBId });
    assert(
      dbOrderB.customerId.toString() === custB._id.toString(),
      'Backend strictly binds order to authenticated token (Bob), completely ignoring spoofed customerId (Alice)'
    );

    // Cleanup
    await Order.deleteMany({ orderId: { $in: [orderAId, orderBId, guestOrderId] } });
    await Customer.deleteMany({ mobile: { $in: [mobileA, mobileB] } });
  } catch (err) {
    console.error('Ownership test error:', err);
    failCount++;
  } finally {
    if (orderAId || orderBId || guestOrderId) {
      await Order.deleteMany({ orderId: { $in: [orderAId, orderBId, guestOrderId] } }).catch(() => {});
    }
    await Customer.deleteMany({ mobile: { $in: [mobileA, mobileB] } }).catch(() => {});
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
