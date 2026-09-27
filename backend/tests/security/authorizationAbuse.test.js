import assert from 'node:assert';
import http from 'node:http';
import app from '../../src/app.js';
import { generateToken } from '../../src/utils/jwt.js';

console.log('====================================================');
console.log('PHASE 15: AUTHORIZATION ABUSE & ADMIN ENDPOINT QA');
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

const adminToken = generateToken({ sub: 'admin-qa-1', role: 'ADMIN' });
const customerToken = generateToken({ sub: 'cust-qa-1', role: 'CUSTOMER' });

const endpointsToAudit = [
  { method: 'GET', path: '/api/admin/orders' },
  { method: 'GET', path: '/api/admin/orders/RF-20260925-000001' },
  { method: 'PATCH', path: '/api/admin/orders/RF-20260925-000001/status', body: { status: 'PREPARING' } },
  { method: 'PATCH', path: '/api/admin/orders/RF-20260925-000001/ready-time', body: { readyTime: '20:00' } },
  { method: 'POST', path: '/api/admin/menu', body: { name: 'Dish', category: 'soup', price: 100 } },
  { method: 'PATCH', path: '/api/admin/menu/60d5ec49f1b2c8b1f8e4e1a1', body: { price: 120 } },
  { method: 'PATCH', path: '/api/admin/menu/60d5ec49f1b2c8b1f8e4e1a1/availability', body: { isAvailable: false } },
  { method: 'DELETE', path: '/api/admin/menu/60d5ec49f1b2c8b1f8e4e1a1' },
  { method: 'GET', path: '/api/admin/settings' },
  { method: 'PATCH', path: '/api/admin/settings', body: { restaurantName: 'HAPPINESS RESTAURANT' } },
  { method: 'GET', path: '/api/notifications/logs' },
  { method: 'GET', path: '/api/notifications/status' },
  { method: 'POST', path: '/api/notifications/60d5ec49f1b2c8b1f8e4e1a1/retry' },
];

try {
  for (const ep of endpointsToAudit) {
    const optsUnauth = {
      method: ep.method,
      headers: ep.body ? { 'Content-Type': 'application/json' } : {},
      body: ep.body ? JSON.stringify(ep.body) : undefined,
    };

    // 1. Unauthenticated request -> strictly 401
    const resUnauth = await fetch(`${baseUrl}${ep.path}`, optsUnauth);
    assert.strictEqual(
      resUnauth.status,
      401,
      `Unauthenticated ${ep.method} ${ep.path} must return 401 (got ${resUnauth.status})`
    );

    // 2. Customer token -> strictly 403 Forbidden
    const optsCust = {
      method: ep.method,
      headers: {
        Authorization: `Bearer ${customerToken}`,
        ...(ep.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: ep.body ? JSON.stringify(ep.body) : undefined,
    };
    const resCust = await fetch(`${baseUrl}${ep.path}`, optsCust);
    assert.strictEqual(
      resCust.status,
      403,
      `Customer token on ${ep.method} ${ep.path} must return 403 (got ${resCust.status})`
    );
  }
  pass(`All ${endpointsToAudit.length} sensitive admin endpoints strictly reject unauthenticated requests with HTTP 401`);
  pass(`All ${endpointsToAudit.length} sensitive admin endpoints strictly reject customer tokens with HTTP 403 Forbidden`);

  // 3. Admin token -> Authorized (not 401 or 403)
  const adminRes = await fetch(`${baseUrl}/api/admin/orders`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminRes.status !== 401 && adminRes.status !== 403, 'Admin token must be authorized');
  pass('Authorized Admin token successfully passes role verification on admin endpoints');

  console.log('\n====================================================');
  console.log(`AUTHORIZATION ABUSE TESTS: ${passed} PASSED, 0 FAILED`);
  console.log('====================================================\n');
} finally {
  await new Promise((resolve) => server.close(resolve));
}
