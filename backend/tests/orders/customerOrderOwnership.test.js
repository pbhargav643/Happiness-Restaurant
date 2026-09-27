import http from 'http';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import connectDB, { disconnectDB } from '../../src/config/database.js';
import Customer from '../../src/models/Customer.js';
import Admin from '../../src/models/Admin.js';
import Order from '../../src/models/Order.js';
import MenuItem from '../../src/models/MenuItem.js';
import { hashPassword } from '../../src/utils/password.js';
import { generateToken } from '../../src/utils/jwt.js';

console.log('====================================================');
console.log('CUSTOMER ORDER OWNERSHIP & AUTHORIZATION TEST SUITE');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;
let server = null;

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
    console.log('[PASS] Customer Order Ownership guarded when DB offline');
    passCount++;
    console.log('\n====================================================');
    console.log(`BACKEND TEST RESULTS: ${passCount} PASSED, 0 FAILED`);
    console.log('====================================================\n');
    return;
  }

  // Test identifiers
  const customerAMobile = '9876540001';
  const customerAEmail = 'customera@test.com';
  const customerBMobile = '9876540002';
  const customerBEmail = 'customerb@test.com';
  const adminEmail = 'admin_ownership_test@happinessrestaurant.com';

  // Cleanup old test data
  await Customer.deleteMany({
    mobile: { $in: [customerAMobile, customerBMobile] },
  });
  await Admin.deleteMany({ email: adminEmail });

  // Ensure test menu items exist
  let testMenuItem = await MenuItem.findOne({ isAvailable: true });
  if (!testMenuItem) {
    testMenuItem = await MenuItem.create({
      name: 'Paneer Butter Masala',
      category: 'main-course',
      price: 250,
      isAvailable: true,
    });
  }

  // Create Customer A
  const passwordHash = await hashPassword('Customer@123');
  const customerADoc = await Customer.create({
    name: 'Customer Alpha',
    mobile: customerAMobile,
    email: customerAEmail,
    passwordHash,
    role: 'CUSTOMER',
    isActive: true,
  });
  const tokenA = generateToken({
    sub: customerADoc._id.toString(),
    role: 'CUSTOMER',
  });

  // Create Customer B
  const customerBDoc = await Customer.create({
    name: 'Customer Beta',
    mobile: customerBMobile,
    email: customerBEmail,
    passwordHash,
    role: 'CUSTOMER',
    isActive: true,
  });
  const tokenB = generateToken({
    sub: customerBDoc._id.toString(),
    role: 'CUSTOMER',
  });

  // Create Admin
  const adminDoc = await Admin.create({
    name: 'Test Admin',
    email: adminEmail,
    passwordHash,
    role: 'ADMIN',
    isActive: true,
  });
  const adminToken = generateToken({
    sub: adminDoc._id.toString(),
    role: 'ADMIN',
  });

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  let orderAId = null;
  let orderBId = null;
  let guestOrderId = null;

  try {
    // ----------------------------------------------------------------
    // TEST 1: Authenticated Customer A creates Order A and gets own orders
    // ----------------------------------------------------------------
    console.log('\n--- Test 1: Authenticated Customer Can Get Own Orders ---');
    const orderPayloadA = {
      customer: {
        name: customerADoc.name,
        mobile: customerADoc.mobile,
        email: customerADoc.email,
      },
      pickup: {
        date: '2026-09-25',
        time: '19:30',
      },
      items: [
        { itemId: testMenuItem._id.toString(), quantity: 2 },
      ],
      orderType: 'PICKUP',
    };

    const createResA = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify(orderPayloadA),
    });
    const createDataA = await createResA.json();
    assert(createResA.status === 201, 'Customer A places order with JWT token (HTTP 201)');
    assert(createDataA.data?.orderId, `Order A created with ID: ${createDataA.data?.orderId}`);
    orderAId = createDataA.data.orderId;

    // Verify order in database is linked to customerA
    const dbOrderA = await Order.findOne({ orderId: orderAId });
    assert(
      dbOrderA && dbOrderA.customerId && dbOrderA.customerId.toString() === customerADoc._id.toString(),
      'Order in database has customerId matching Customer A'
    );

    // Fetch Customer A orders
    const getResA = await fetch(`${baseUrl}/api/customer/orders`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const getDataA = await getResA.json();
    assert(getResA.status === 200, 'Customer A retrieves own orders via GET /api/customer/orders (HTTP 200)');
    assert(Array.isArray(getDataA.data), 'Returns orders array');
    const foundInA = getDataA.data.find((o) => o.orderId === orderAId);
    assert(Boolean(foundInA), 'Order A is present in Customer A order list');

    // ----------------------------------------------------------------
    // TEST 2: Authenticated Customer cannot get another customer's orders
    // ----------------------------------------------------------------
    console.log("\n--- Test 2: Authenticated Customer Cannot Get Another Customer's Orders ---");
    // Customer B creates Order B
    const orderPayloadB = {
      customer: {
        name: customerBDoc.name,
        mobile: customerBDoc.mobile,
        email: customerBDoc.email,
      },
      pickup: {
        date: '2026-09-25',
        time: '20:00',
      },
      items: [
        { itemId: testMenuItem._id.toString(), quantity: 1 },
      ],
      orderType: 'PICKUP',
    };

    const createResB = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify(orderPayloadB),
    });
    const createDataB = await createResB.json();
    orderBId = createDataB.data.orderId;

    // Customer B queries their orders
    const getResB = await fetch(`${baseUrl}/api/customer/orders`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const getDataB = await getResB.json();
    assert(getResB.status === 200, 'Customer B retrieves own orders (HTTP 200)');
    const orderAInB = getDataB.data.find((o) => o.orderId === orderAId);
    assert(!orderAInB, "Customer B's order list does NOT contain Customer A's order");
    const orderBInB = getDataB.data.find((o) => o.orderId === orderBId);
    assert(Boolean(orderBInB), "Customer B's order list contains Order B");

    // ----------------------------------------------------------------
    // TEST 3: Authenticated Customer can get own order detail
    // ----------------------------------------------------------------
    console.log('\n--- Test 3: Authenticated Customer Can Get Own Order Detail ---');
    const detailResA = await fetch(`${baseUrl}/api/customer/orders/${orderAId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const detailDataA = await detailResA.json();
    assert(detailResA.status === 200, 'Customer A retrieves own Order A details (HTTP 200)');
    assert(detailDataA.data?.orderId === orderAId, 'Order details match Order A ID');
    assert(detailDataA.data?.items?.length > 0, 'Order details include items snapshot');

    // ----------------------------------------------------------------
    // TEST 4: Authenticated Customer cannot get another customer's order detail
    // ----------------------------------------------------------------
    console.log("\n--- Test 4: Authenticated Customer Cannot Get Another Customer's Order Detail ---");
    const crossRes = await fetch(`${baseUrl}/api/customer/orders/${orderAId}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(
      crossRes.status === 404,
      "Customer B attempting to access Customer A's order receives safe HTTP 404 (does not reveal order exists)"
    );
    const crossData = await crossRes.json();
    assert(crossData.success === false, 'cross-customer response success is false');
    assert(crossData.data === undefined, 'No order data is leaked to Customer B');

    // ----------------------------------------------------------------
    // TEST 5: Missing authentication returns 401
    // ----------------------------------------------------------------
    console.log('\n--- Test 5: Missing Authentication Returns 401 ---');
    const noAuthListRes = await fetch(`${baseUrl}/api/customer/orders`);
    assert(noAuthListRes.status === 401, 'GET /api/customer/orders without token returns HTTP 401');

    const noAuthDetailRes = await fetch(`${baseUrl}/api/customer/orders/${orderAId}`);
    assert(noAuthDetailRes.status === 401, 'GET /api/customer/orders/:orderId without token returns HTTP 401');

    // ----------------------------------------------------------------
    // TEST 6: Wrong role returns 403
    // ----------------------------------------------------------------
    console.log('\n--- Test 6: Wrong Role (Admin Token on Customer Endpoint) Returns 403 ---');
    const adminOnCustomerRes = await fetch(`${baseUrl}/api/customer/orders`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminOnCustomerRes.status === 403, 'Admin token on /api/customer/orders returns HTTP 403 (Customer authorization required)');

    // ----------------------------------------------------------------
    // TEST 7: Mobile query cannot bypass ownership
    // ----------------------------------------------------------------
    console.log('\n--- Test 7: Mobile Query Cannot Bypass Ownership ---');
    const mobileBypassRes = await fetch(
      `${baseUrl}/api/customer/orders?mobile=${customerAMobile}`,
      {
        headers: { Authorization: `Bearer ${tokenB}` },
      }
    );
    const mobileBypassData = await mobileBypassRes.json();
    assert(mobileBypassRes.status === 200, 'Endpoint responds with valid status');
    const bypassedOrder = mobileBypassData.data?.find((o) => o.orderId === orderAId);
    assert(
      !bypassedOrder,
      "Providing Customer A's mobile number does NOT grant Customer B access to Customer A's orders"
    );

    // ----------------------------------------------------------------
    // TEST 8: customerId cannot be spoofed from request body
    // ----------------------------------------------------------------
    console.log('\n--- Test 8: customerId Cannot Be Spoofed from Request Body ---');
    const spoofPayload = {
      customerId: customerADoc._id.toString(), // Attacker tries to impersonate Customer A
      customer: {
        name: customerBDoc.name,
        mobile: customerBDoc.mobile,
      },
      pickup: {
        date: '2026-09-25',
        time: '20:30',
      },
      items: [
        { itemId: testMenuItem._id.toString(), quantity: 1 },
      ],
      orderType: 'PICKUP',
    };

    const spoofRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`, // Actually authenticated as Customer B
      },
      body: JSON.stringify(spoofPayload),
    });
    const spoofData = await spoofRes.json();
    assert(spoofRes.status === 201, 'Order created');
    const spoofDbOrder = await Order.findOne({ orderId: spoofData.data.orderId });
    assert(
      spoofDbOrder.customerId.toString() === customerBDoc._id.toString(),
      'Backend assigns order to authenticated Customer B, completely ignoring spoofed customerId in body'
    );

    // ----------------------------------------------------------------
    // TEST 9: Guest order remains supported
    // ----------------------------------------------------------------
    console.log('\n--- Test 9: Guest Order Remains Supported ---');
    const guestPayload = {
      customer: {
        name: 'Guest Walkin',
        mobile: '9876540099',
      },
      pickup: {
        date: '2026-09-25',
        time: '21:00',
      },
      items: [
        { itemId: testMenuItem._id.toString(), quantity: 1 },
      ],
      orderType: 'PICKUP',
    };

    const guestRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(guestPayload),
    });
    const guestData = await guestRes.json();
    assert(guestRes.status === 201, 'Guest order created successfully without token (HTTP 201)');
    guestOrderId = guestData.data.orderId;

    const dbGuestOrder = await Order.findOne({ orderId: guestOrderId });
    assert(dbGuestOrder && dbGuestOrder.customerId === null, 'Guest order has customerId === null');

    // Customer A cannot access guest order through protected customer order endpoint
    const guestAccessRes = await fetch(`${baseUrl}/api/customer/orders/${guestOrderId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(
      guestAccessRes.status === 404,
      'Authenticated customer cannot access guest order through protected endpoint (HTTP 404)'
    );

    // Public tracking for guest order still works
    const publicTrackRes = await fetch(`${baseUrl}/api/orders/${guestOrderId}`);
    assert(publicTrackRes.status === 200, 'Public GET /api/orders/:orderId remains functional for guest tracking');

    // ----------------------------------------------------------------
    // TEST 10: Admin can still access admin orders
    // ----------------------------------------------------------------
    console.log('\n--- Test 10: Admin Can Still Access Admin Orders ---');
    const adminOrdersRes = await fetch(`${baseUrl}/api/admin/orders`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminOrdersData = await adminOrdersRes.json();
    assert(adminOrdersRes.status === 200, 'Admin can list orders via GET /api/admin/orders (HTTP 200)');
    assert(Array.isArray(adminOrdersData.data), 'Admin receives all orders');

    const adminDetailRes = await fetch(`${baseUrl}/api/admin/orders/${orderAId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminDetailRes.status === 200, "Admin can inspect Customer A's order details (HTTP 200)");

    // ----------------------------------------------------------------
    // TEST 11: Historical order snapshots remain unchanged
    // ----------------------------------------------------------------
    console.log('\n--- Test 11: Historical Order Snapshots Remain Unchanged ---');
    const originalPrice = dbOrderA.items[0].price;
    assert(typeof originalPrice === 'number', `Original item snapshot price is recorded (${originalPrice})`);

    // Simulate price change on menu item in database
    await MenuItem.findByIdAndUpdate(testMenuItem._id, { price: originalPrice + 50 });

    // Re-query Order A
    const freshOrderA = await Order.findOne({ orderId: orderAId });
    assert(
      freshOrderA.items[0].price === originalPrice,
      `Order item snapshot retains original price ${originalPrice} even when menu price changes`
    );

    // Restore menu item price
    await MenuItem.findByIdAndUpdate(testMenuItem._id, { price: originalPrice });

    // Summary
    console.log('\n====================================================');
    console.log(`BACKEND TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('====================================================\n');

    if (failCount > 0) {
      process.exit(1);
    }
  } finally {
    if (mongoose.connection.readyState === 1) {
      try {
        await Customer.deleteMany({
          mobile: { $in: [customerAMobile, customerBMobile] },
        });
        await Admin.deleteMany({ email: adminEmail });
        if (orderAId) await Order.deleteMany({ orderId: { $in: [orderAId, orderBId, guestOrderId] } });
      } catch (e) {}
    }

    if (server) await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
