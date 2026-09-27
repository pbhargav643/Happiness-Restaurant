import assert from 'node:assert';
import http from 'node:http';
import app from '../../src/app.js';
import { generateToken } from '../../src/utils/jwt.js';

console.log('====================================================');
console.log('PHASE 15: MENU SECURITY & MUTATION AUTHORIZATION TEST SUITE');
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

const adminToken = generateToken({ sub: 'admin-1', role: 'ADMIN' });
const customerToken = generateToken({ sub: 'customer-1', role: 'CUSTOMER' });

try {
  // 1. Unauthenticated menu creation -> 401
  const unauthCreateRes = await fetch(`${baseUrl}/api/admin/menu`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Dish', category: 'soup', price: 100 }),
  });
  assert.strictEqual(unauthCreateRes.status, 401, 'Unauthenticated menu creation must return 401');
  pass('Unauthenticated POST /api/admin/menu returns HTTP 401');

  // 2. Customer token on menu creation -> 403
  const customerCreateRes = await fetch(`${baseUrl}/api/admin/menu`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`,
    },
    body: JSON.stringify({ name: 'Dish', category: 'soup', price: 100 }),
  });
  assert.strictEqual(customerCreateRes.status, 403, 'Customer token on menu creation must return 403');
  pass('Customer token on POST /api/admin/menu returns HTTP 403 Forbidden');

  // 3. Unauthenticated menu deletion -> 401
  const unauthDeleteRes = await fetch(`${baseUrl}/api/admin/menu/sample-item-id`, {
    method: 'DELETE',
  });
  assert.strictEqual(unauthDeleteRes.status, 401, 'Unauthenticated menu deletion must return 401');
  pass('Unauthenticated DELETE /api/admin/menu/:itemId returns HTTP 401');

  // 4. Admin menu creation with negative price -> 400
  const negPriceRes = await fetch(`${baseUrl}/api/admin/menu`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ name: 'Dish', category: 'soup', price: -50 }),
  });
  assert.strictEqual(negPriceRes.status, 400, 'Negative price must return 400');
  pass('Admin menu creation with negative price returns HTTP 400');

  // 5. Admin menu creation with missing name -> 400
  const missingNameRes = await fetch(`${baseUrl}/api/admin/menu`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ name: '', category: 'soup', price: 100 }),
  });
  assert.strictEqual(missingNameRes.status, 400, 'Missing name must return 400');
  pass('Admin menu creation with empty name returns HTTP 400');

  console.log('\n====================================================');
  console.log(`MENU SECURITY TESTS: ${passed} PASSED, 0 FAILED`);
  console.log('====================================================\n');
} finally {
  await new Promise((resolve) => server.close(resolve));
}
