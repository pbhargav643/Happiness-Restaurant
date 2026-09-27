import http from 'http';
import app from '../../src/app.js';
import connectDB, { disconnectDB } from '../../src/config/database.js';
import Customer from '../../src/models/Customer.js';
import Admin from '../../src/models/Admin.js';
import Order from '../../src/models/Order.js';
import MenuItem from '../../src/models/MenuItem.js';
import { hashPassword } from '../../src/utils/password.js';
import { generateToken, verifyToken } from '../../src/utils/jwt.js';

console.log('====================================================');
console.log('PHASE 10 FINAL AUTHENTICATION SECURITY & QA TEST SUITE');
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

  const adminEmail = 'qa_admin@happinessrestaurant.com';
  const customerA_Mobile = '9876599001';
  const customerB_Mobile = '9876599002';
  const customerA_Email = 'customerA_qa@test.com';
  const customerB_Email = 'customerB_qa@test.com';
  const sharedPassword = 'SecurePassword@123';

  // Cleanup old test data
  await Admin.deleteMany({ email: adminEmail });
  await Customer.deleteMany({ mobile: { $in: [customerA_Mobile, customerB_Mobile] } });

  // 1. Setup Admin
  const adminHash = await hashPassword(sharedPassword);
  const adminDoc = await Admin.create({
    name: 'QA Admin',
    email: adminEmail,
    passwordHash: adminHash,
    role: 'ADMIN',
    isActive: true,
  });
  const adminToken = generateToken({ sub: adminDoc._id.toString(), role: 'ADMIN' });

  // 2. Setup Customer A
  const custA_Hash = await hashPassword(sharedPassword);
  const custA_Doc = await Customer.create({
    name: 'QA Customer A',
    mobile: customerA_Mobile,
    email: customerA_Email,
    passwordHash: custA_Hash,
    role: 'CUSTOMER',
    isActive: true,
  });
  const tokenA = generateToken({ sub: custA_Doc._id.toString(), role: 'CUSTOMER' });

  // 3. Setup Customer B
  const custB_Hash = await hashPassword(sharedPassword);
  const custB_Doc = await Customer.create({
    name: 'QA Customer B',
    mobile: customerB_Mobile,
    email: customerB_Email,
    passwordHash: custB_Hash,
    role: 'CUSTOMER',
    isActive: true,
  });
  const tokenB = generateToken({ sub: custB_Doc._id.toString(), role: 'CUSTOMER' });

  // Ensure a test menu item
  let testItem = await MenuItem.findOne({ isAvailable: true });
  if (!testItem) {
    testItem = await MenuItem.create({
      name: 'Paneer Tikka QA',
      category: 'starter',
      price: 260,
      isAvailable: true,
    });
  }

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  let orderA_Id = null;
  let orderB_Id = null;
  let guestOrderId = null;

  try {
    // ----------------------------------------------------------------
    // SECTION 1: ADMIN ROLE SECURITY & PROTECTION
    // ----------------------------------------------------------------
    console.log('--- SECTION 1: Admin Role Security & /api/admin/* Protection ---');
    // Admin with ADMIN token
    const adminOrdersRes = await fetch(`${baseUrl}/api/admin/orders`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminOrdersRes.status === 200, 'ADMIN token granted access to /api/admin/orders (HTTP 200)');

    // Customer token on Admin endpoint -> 403
    const custOnAdminRes = await fetch(`${baseUrl}/api/admin/orders`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(custOnAdminRes.status === 403, 'CUSTOMER token rejected on /api/admin/orders (HTTP 403 Forbidden)');

    // No token on Admin endpoint -> 401
    const noTokenAdminRes = await fetch(`${baseUrl}/api/admin/orders`);
    assert(noTokenAdminRes.status === 401, 'Missing token rejected on /api/admin/orders (HTTP 401 Unauthorized)');

    // Invalid token on Admin endpoint -> 401
    const invalidTokenAdminRes = await fetch(`${baseUrl}/api/admin/orders`, {
      headers: { Authorization: 'Bearer invalid.token.payload' },
    });
    assert(invalidTokenAdminRes.status === 401, 'Invalid token rejected on /api/admin/orders (HTTP 401 Unauthorized)');

    // ----------------------------------------------------------------
    // SECTION 2: CUSTOMER ROLE SECURITY & PROTECTION
    // ----------------------------------------------------------------
    console.log('\n--- SECTION 2: Customer Role Security & /api/customer/* Protection ---');
    // Customer with CUSTOMER token
    const custOrdersRes = await fetch(`${baseUrl}/api/customer/orders`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(custOrdersRes.status === 200, 'CUSTOMER token granted access to /api/customer/orders (HTTP 200)');

    // Admin token on Customer endpoint -> 403
    const adminOnCustRes = await fetch(`${baseUrl}/api/customer/orders`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminOnCustRes.status === 403, 'ADMIN token rejected on /api/customer/orders (HTTP 403 Forbidden)');

    // No token on Customer endpoint -> 401
    const noTokenCustRes = await fetch(`${baseUrl}/api/customer/orders`);
    assert(noTokenCustRes.status === 401, 'Missing token rejected on /api/customer/orders (HTTP 401 Unauthorized)');

    // ----------------------------------------------------------------
    // SECTION 3: CUSTOMER ORDER OWNERSHIP & SPOOFING PROTECTION
    // ----------------------------------------------------------------
    console.log('\n--- SECTION 3: Customer Order Ownership & Anti-Spoofing ---');
    // Customer A creates Order A
    const orderPayloadA = {
      customer: { name: custA_Doc.name, mobile: custA_Doc.mobile },
      pickup: { date: '2026-09-25', time: '19:00' },
      items: [{ itemId: testItem._id.toString(), quantity: 1 }],
      orderType: 'PICKUP',
    };
    const resCreateA = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify(orderPayloadA),
    });
    const dataCreateA = await resCreateA.json();
    orderA_Id = dataCreateA.data?.orderId;
    assert(resCreateA.status === 201 && orderA_Id, `Customer A creates Order A (${orderA_Id})`);

    // Customer B attempts to spoof Customer A's customerId
    const spoofPayload = {
      customerId: custA_Doc._id.toString(), // Forged customerId
      customer: { name: custB_Doc.name, mobile: custB_Doc.mobile },
      pickup: { date: '2026-09-25', time: '19:30' },
      items: [{ itemId: testItem._id.toString(), quantity: 1 }],
      orderType: 'PICKUP',
    };
    const resCreateB = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify(spoofPayload),
    });
    const dataCreateB = await resCreateB.json();
    orderB_Id = dataCreateB.data?.orderId;
    assert(resCreateB.status === 201 && orderB_Id, `Customer B creates Order B (${orderB_Id})`);

    // Verify backend bound Order B to Customer B, completely ignoring spoofed customerId
    const dbOrderB = await Order.findOne({ orderId: orderB_Id });
    assert(
      dbOrderB.customerId.toString() === custB_Doc._id.toString(),
      'Backend anti-spoofing binds order to authenticated identity, ignoring body customerId'
    );

    // Cross-customer access check
    const aViewsA = await fetch(`${baseUrl}/api/customer/orders/${orderA_Id}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(aViewsA.status === 200, 'Customer A can view own Order A (HTTP 200)');

    const aViewsB = await fetch(`${baseUrl}/api/customer/orders/${orderB_Id}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(aViewsB.status === 404, 'Customer A blocked from viewing Order B with safe HTTP 404');

    const bViewsB = await fetch(`${baseUrl}/api/customer/orders/${orderB_Id}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(bViewsB.status === 200, 'Customer B can view own Order B (HTTP 200)');

    const bViewsA = await fetch(`${baseUrl}/api/customer/orders/${orderA_Id}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(bViewsA.status === 404, 'Customer B blocked from viewing Order A with safe HTTP 404');

    // Mobile query cannot bypass ownership
    const bypassRes = await fetch(`${baseUrl}/api/customer/orders?mobile=${customerA_Mobile}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const bypassData = await bypassRes.json();
    const leakedOrder = bypassData.data?.find((o) => o.orderId === orderA_Id);
    assert(!leakedOrder, 'Mobile number query does NOT leak Order A to Customer B');

    // ----------------------------------------------------------------
    // SECTION 4: GUEST ORDER COMPATIBILITY
    // ----------------------------------------------------------------
    console.log('\n--- SECTION 4: Guest Order Compatibility ---');
    const guestPayload = {
      customer: { name: 'Walk-in Guest', mobile: '9876540011' },
      pickup: { date: '2026-09-25', time: '20:00' },
      items: [{ itemId: testItem._id.toString(), quantity: 1 }],
      orderType: 'PICKUP',
    };
    const guestRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(guestPayload),
    });
    const guestData = await guestRes.json();
    guestOrderId = guestData.data?.orderId;
    assert(guestRes.status === 201 && guestOrderId, `Guest places order without token (${guestOrderId})`);

    const dbGuestOrder = await Order.findOne({ orderId: guestOrderId });
    assert(dbGuestOrder && dbGuestOrder.customerId === null, 'Guest order has customerId: null');

    const publicGuestTrack = await fetch(`${baseUrl}/api/orders/${guestOrderId}`);
    assert(publicGuestTrack.status === 200, 'Public order tracking works for guest order');

    const protectedGuestAccess = await fetch(`${baseUrl}/api/customer/orders/${guestOrderId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(protectedGuestAccess.status === 404, 'Protected customer API blocks access to guest orders');

    // ----------------------------------------------------------------
    // SECTION 5: PASSWORD & JWT SECURITY
    // ----------------------------------------------------------------
    console.log('\n--- SECTION 5: Password & JWT Security ---');
    const custADb = await Customer.findOne({ mobile: customerA_Mobile }).select('+passwordHash');
    assert(
      custADb.passwordHash !== sharedPassword && custADb.passwordHash.length > 20,
      'Customer password is cryptographically hashed, not stored plaintext'
    );

    const adminDb = await Admin.findOne({ email: adminEmail }).select('+passwordHash');
    assert(
      adminDb.passwordHash !== sharedPassword && adminDb.passwordHash.length > 20,
      'Admin password is cryptographically hashed, not stored plaintext'
    );

    const decodedCustToken = verifyToken(tokenA);
    assert(
      decodedCustToken.passwordHash === undefined &&
      decodedCustToken.password === undefined &&
      decodedCustToken.sub === custA_Doc._id.toString() &&
      decodedCustToken.role === 'CUSTOMER',
      'Customer JWT contains only minimal required claims (no passwords or secrets)'
    );

    const decodedAdminToken = verifyToken(adminToken);
    assert(
      decodedAdminToken.passwordHash === undefined &&
      decodedAdminToken.password === undefined &&
      decodedAdminToken.sub === adminDoc._id.toString() &&
      decodedAdminToken.role === 'ADMIN',
      'Admin JWT contains only minimal required claims (no passwords or secrets)'
    );

    // ----------------------------------------------------------------
    // SECTION 6: LOGIN ERROR SECURITY & NO ENUMERATION
    // ----------------------------------------------------------------
    console.log('\n--- SECTION 6: Login Error Security & Non-Enumeration ---');
    // Admin invalid login
    const badAdminRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: 'WrongPassword@999' }),
    });
    const badAdminData = await badAdminRes.json();
    assert(badAdminRes.status === 401, 'Admin invalid login returns HTTP 401');
    assert(badAdminData.message === 'Invalid email or password.', 'Admin error is generic ("Invalid email or password.")');

    // Customer invalid login
    const badCustRes = await fetch(`${baseUrl}/api/auth/customer/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: customerA_Mobile, password: 'WrongPassword@999' }),
    });
    const badCustData = await badCustRes.json();
    assert(badCustRes.status === 401, 'Customer invalid login returns HTTP 401');
    assert(badCustData.message === 'Invalid mobile/email or password.', 'Customer error is generic ("Invalid mobile/email or password.")');

    // ----------------------------------------------------------------
    // SECTION 7: PUBLIC BROWSING ACCESSIBILITY
    // ----------------------------------------------------------------
    console.log('\n--- SECTION 7: Public Customer APIs Accessibility ---');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert(healthRes.status === 200, 'GET /api/health is publicly accessible (HTTP 200)');

    const menuRes = await fetch(`${baseUrl}/api/menu`);
    assert(menuRes.status === 200, 'GET /api/menu is publicly accessible (HTTP 200)');

    const settingsRes = await fetch(`${baseUrl}/api/settings`);
    assert(settingsRes.status === 200, 'GET /api/settings is publicly accessible (HTTP 200)');

    // ----------------------------------------------------------------
    // SECTION 8: LOGOUT STATEFULNESS & ORDER PERSISTENCE
    // ----------------------------------------------------------------
    console.log('\n--- SECTION 8: Logout & Order Record Persistence ---');
    const logoutRes = await fetch(`${baseUrl}/api/auth/customer/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(logoutRes.status === 200, 'Customer logout succeeds (HTTP 200)');

    // Orders are strictly preserved in DB after customer logout
    const postLogoutOrderA = await Order.findOne({ orderId: orderA_Id });
    assert(Boolean(postLogoutOrderA), 'Orders in MongoDB are NOT deleted on customer logout');

    console.log('\n====================================================');
    console.log(`FINAL PHASE 10 QA RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('====================================================\n');

    if (failCount > 0) {
      process.exit(1);
    }
  } finally {
    // Cleanup
    await Admin.deleteMany({ email: adminEmail });
    await Customer.deleteMany({ mobile: { $in: [customerA_Mobile, customerB_Mobile] } });
    if (orderA_Id) await Order.deleteMany({ orderId: { $in: [orderA_Id, orderB_Id, guestOrderId] } });

    server.close();
    await disconnectDB();
  }
}

runTests().catch((err) => {
  console.error('Final QA Test Suite Error:', err);
  process.exit(1);
});
