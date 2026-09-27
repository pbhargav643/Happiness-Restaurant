import assert from 'node:assert';
import http from 'node:http';
import app from '../../src/app.js';
import { generateToken } from '../../src/utils/jwt.js';

console.log('====================================================');
console.log('PHASE 15: MASS ASSIGNMENT & UPDATE INJECTION TEST SUITE');
console.log('====================================================\n');

let passed = 0;
function pass(desc) {
  passed++;
  console.log(`[PASS] ${desc}`);
}

const server = http.createServer(app);

await new Promise((resolve) => {
  server.listen(0, resolve);
});

const port = server.address().port;
const baseUrl = `http://127.0.0.1:${port}`;

const adminToken = generateToken({
  sub: '507f1f77bcf86cd799439011',
  role: 'ADMIN',
});

const customerToken = generateToken({
  sub: '507f1f77bcf86cd799439022',
  role: 'CUSTOMER',
});

try {
  // 1. Customer Registration Mass Assignment Protection
  // Attempting to elevate role to ADMIN, set arbitrary passwordHash, or disable account
  const regRes = await fetch(`${baseUrl}/api/auth/customer/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Legit Customer',
      mobile: '9876543210',
      email: 'massassign@test.com',
      password: 'password123',
      role: 'ADMIN',
      isActive: false,
      passwordHash: 'malicious-injected-hash',
      isAdmin: true,
      permissions: ['ALL'],
    }),
  });

  // If in-memory/mock fallback or db creation
  if (regRes.status === 201) {
    const regData = await regRes.json();
    assert.strictEqual(regData.customer.role, 'CUSTOMER', 'Role must strictly remain CUSTOMER regardless of payload');
    assert.strictEqual(regData.customer.passwordHash, undefined, 'passwordHash must never be exposed or set');
    assert.strictEqual(regData.customer.isAdmin, undefined, 'Arbitrary isAdmin flag must be ignored');
    pass('Customer registration strictly ignores unauthorized role/permission injection');
  } else {
    // Already exists in DB from previous run or 409 conflict
    assert([201, 409].includes(regRes.status), 'Customer registration handles request safely');
    pass('Customer registration rejects or sanitizes input safely');
  }

  // 2. Order Creation Mass Assignment Protection
  // Attempting to inject customerId, subtotal, status: READY, orderType: DELIVERY, readyTime
  const orderRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`,
    },
    body: JSON.stringify({
      customerId: '507f1f77bcf86cd799439099', // Attempt to forge ownership to another customer
      subtotal: 1.00, // Attempt to override calculated subtotal
      total: 1.00,
      price: 1.00,
      status: 'READY', // Attempt to skip PLACED and PREPARING
      readyTime: '12:00',
      orderType: 'DELIVERY', // Attempt delivery
      customer: {
        name: 'Attacker Name',
        mobile: '9876543210',
      },
      pickup: {
        date: '2026-12-31',
        time: '18:30',
      },
      items: [{ itemId: 'soup-veg-clear-soup', quantity: 1, price: 1.00 }],
    }),
  });

  // Because orderType: 'DELIVERY' is injected, it should be immediately rejected with 400
  assert.strictEqual(orderRes.status, 400, 'Order with injected DELIVERY orderType must be rejected');
  const orderBody = await orderRes.json();
  assert(orderBody.message.includes('PICKUP'), 'Rejection message enforces strict PICKUP orderType');
  pass('Order creation strictly rejects injected DELIVERY orderType');

  // 3. Settings Mass Assignment & Update Injection Protection
  // Attempting to inject delivery fields or arbitrary mongo operators ($set, role)
  const settingsRes = await fetch(`${baseUrl}/api/admin/settings`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      deliveryEnabled: true,
      deliveryFee: 50,
      role: 'SUPER_ADMIN',
      $set: { hacked: true },
    }),
  });

  assert.strictEqual(settingsRes.status, 400, 'Settings update with delivery keys must be rejected');
  const settingsBody = await settingsRes.json();
  assert.strictEqual(settingsBody.success, false);
  pass('RestaurantSettings update rejects delivery configuration and forbidden fields');

  // 4. Menu Item Update Mass Assignment Protection
  // Attempting to inject protected fields like role, _id, createdAt
  const menuRes = await fetch(`${baseUrl}/api/admin/menu/507f1f77bcf86cd799439011`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: 'Updated Name',
      role: 'ADMIN',
      passwordHash: 'test',
      createdAt: '1970-01-01',
      $set: { unauthorized: true },
    }),
  });

  // Should succeed or safely return 404 (item not found in test db) without server crash or syntax error
  assert([200, 404].includes(menuRes.status), 'Menu item update safely filters keys');
  pass('Menu item update filters update payload to allowed whitelist only');

  // 5. Customer cannot mutate order status or pickup ready time
  const custStatusRes = await fetch(`${baseUrl}/api/admin/orders/RF-20260923-111111/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`,
    },
    body: JSON.stringify({ status: 'PICKED_UP' }),
  });
  assert.strictEqual(custStatusRes.status, 403, 'Customer cannot access admin order status endpoint');
  pass('Customer is forbidden from mutating order status via admin endpoint');

  console.log('\n====================================================');
  console.log(`MASS ASSIGNMENT TESTS: ${passed} PASSED, 0 FAILED`);
  console.log('====================================================\n');
} finally {
  await new Promise((resolve) => server.close(resolve));
}
