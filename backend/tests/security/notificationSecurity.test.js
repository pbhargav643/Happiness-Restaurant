import assert from 'node:assert';
import http from 'node:http';
import app from '../../src/app.js';
import { generateToken } from '../../src/utils/jwt.js';

console.log('====================================================');
console.log('PHASE 15: NOTIFICATION SECURITY & CREDENTIAL PROTECTION TEST SUITE');
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
  // 1. Unauthenticated request to /api/notifications/logs -> 401
  const unauthLogsRes = await fetch(`${baseUrl}/api/notifications/logs`);
  assert.strictEqual(unauthLogsRes.status, 401, 'Unauthenticated logs access must return 401');
  pass('Unauthenticated request to /api/notifications/logs returns HTTP 401');

  // 2. Unauthenticated request to retry -> 401
  const unauthRetryRes = await fetch(`${baseUrl}/api/notifications/sample-id/retry`, {
    method: 'POST',
  });
  assert.strictEqual(unauthRetryRes.status, 401, 'Unauthenticated retry must return 401');
  pass('Unauthenticated request to /api/notifications/:id/retry returns HTTP 401');

  // 3. Customer token on notification logs -> 403
  const customerLogsRes = await fetch(`${baseUrl}/api/notifications/logs`, {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert.strictEqual(customerLogsRes.status, 403, 'Customer token on notification logs must return 403');
  pass('Customer token on /api/notifications/logs returns HTTP 403 Forbidden');

  // 4. Admin accesses provider status -> 200, response must NOT contain secret keys
  const statusRes = await fetch(`${baseUrl}/api/notifications/status`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(statusRes.status, 200, 'Admin can view provider status');
  const statusBody = await statusRes.json();
  const rawJson = JSON.stringify(statusBody);

  assert(!rawJson.toLowerCase().includes('whatapp_api_key'), 'No API key in status response');
  assert(!rawJson.toLowerCase().includes('bearer '), 'No bearer token in status response');
  assert(!rawJson.toLowerCase().includes('password'), 'No password in status response');
  pass('Provider status endpoint sanitizes response and never exposes secret keys or tokens');

  console.log('\n====================================================');
  console.log(`NOTIFICATION SECURITY TESTS: ${passed} PASSED, 0 FAILED`);
  console.log('====================================================\n');
} finally {
  await new Promise((resolve) => server.close(resolve));
}
