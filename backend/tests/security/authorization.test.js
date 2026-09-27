import assert from 'node:assert';
import http from 'node:http';
import app from '../../src/app.js';
import { generateToken } from '../../src/utils/jwt.js';

console.log('====================================================');
console.log('PHASE 15: AUTHORIZATION & ROLE ISOLATION TEST SUITE');
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

const adminToken = generateToken({ sub: 'admin-12345', role: 'ADMIN' });
const customerToken = generateToken({ sub: 'customer-67890', role: 'CUSTOMER' });

try {
  // 1. Unauthenticated request to Admin routes -> 401
  const unauthAdminRes = await fetch(`${baseUrl}/api/admin/orders`);
  assert.strictEqual(unauthAdminRes.status, 401, 'Unauthenticated admin access must return 401');
  pass('Unauthenticated request to /api/admin/orders returns HTTP 401');

  // 2. Customer token on Admin route -> 403 Forbidden
  const customerOnAdminRes = await fetch(`${baseUrl}/api/admin/orders`, {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert.strictEqual(customerOnAdminRes.status, 403, 'Customer role accessing admin API must return 403');
  pass('Customer token accessing admin route /api/admin/orders returns HTTP 403 Forbidden');

  // 3. Customer token on Notification status -> 403 Forbidden
  const customerOnNotifRes = await fetch(`${baseUrl}/api/notifications/status`, {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert.strictEqual(customerOnNotifRes.status, 403, 'Customer role accessing notifications API must return 403');
  pass('Customer token accessing /api/notifications/status returns HTTP 403 Forbidden');

  // 4. Unauthenticated request to Customer Orders -> 401
  const unauthCustomerRes = await fetch(`${baseUrl}/api/customer/orders`);
  assert.strictEqual(unauthCustomerRes.status, 401, 'Unauthenticated customer access must return 401');
  pass('Unauthenticated request to /api/customer/orders returns HTTP 401');

  // 5. Admin token on Customer Orders -> 403 Forbidden
  const adminOnCustomerRes = await fetch(`${baseUrl}/api/customer/orders`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(adminOnCustomerRes.status, 403, 'Admin token accessing customer API must return 403');
  pass('Admin token accessing customer route /api/customer/orders returns HTTP 403 Forbidden');

  // 6. Malformed Authorization headers -> 401
  const badHeaders = [
    'Basic YWRtaW46cGFzc3dvcmQ=',
    'Token xyz123',
    'Bearer',
    'Bearer token extra param',
    '',
  ];

  for (const h of badHeaders) {
    const res = await fetch(`${baseUrl}/api/admin/orders`, {
      headers: { Authorization: h },
    });
    assert.strictEqual(res.status, 401, `Malformed header "${h}" must return 401`);
  }
  pass('All non-standard Authorization headers are strictly rejected with HTTP 401');

  console.log('\n====================================================');
  console.log(`AUTHORIZATION TESTS: ${passed} PASSED, 0 FAILED`);
  console.log('====================================================\n');
} finally {
  await new Promise((resolve) => server.close(resolve));
}
