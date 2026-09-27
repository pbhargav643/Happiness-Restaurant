import assert from 'node:assert';
import http from 'node:http';
import app from '../../src/app.js';
import { generateToken } from '../../src/utils/jwt.js';

console.log('====================================================');
console.log('PHASE 15: AUTHENTICATION ABUSE & PENETRATION TEST SUITE');
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

try {
  // 1. No token provided
  const noTokenRes = await fetch(`${baseUrl}/api/admin/orders`);
  assert.strictEqual(noTokenRes.status, 401, 'No token returns 401');
  pass('Case 1: No token provided returns HTTP 401');

  // 2. Empty token provided
  const emptyTokenRes = await fetch(`${baseUrl}/api/admin/orders`, {
    headers: { Authorization: 'Bearer ' },
  });
  assert.strictEqual(emptyTokenRes.status, 401, 'Empty token returns 401');
  pass('Case 2: Empty Bearer token returns HTTP 401');

  // 3. Malformed token structure (not 3 segments)
  const malformedTokens = [
    'Bearer abc',
    'Bearer abc.def',
    'Bearer a.b.c.d.e',
    'Bearer undefined',
    'Bearer null',
  ];
  for (const badToken of malformedTokens) {
    const res = await fetch(`${baseUrl}/api/admin/orders`, {
      headers: { Authorization: badToken },
    });
    assert.strictEqual(res.status, 401, `Malformed token "${badToken}" returns 401`);
  }
  pass('Case 3: Malformed token structures return HTTP 401');

  // 4. Expired token
  const expiredToken = generateToken({ sub: 'admin-1', role: 'ADMIN' }, { expiresIn: -3600 });
  const expiredRes = await fetch(`${baseUrl}/api/admin/orders`, {
    headers: { Authorization: `Bearer ${expiredToken}` },
  });
  assert.strictEqual(expiredRes.status, 401, 'Expired token returns 401');
  const expiredBody = await expiredRes.json();
  assert(expiredBody.expired === true || expiredBody.message.includes('expired'), 'Identifies expired token');
  pass('Case 4: Expired token returns HTTP 401 with clean expiration notice');

  // 5. Invalid signature / Tampered token
  const validToken = generateToken({ sub: 'admin-1', role: 'ADMIN' });
  const parts = validToken.split('.');
  const tamperedToken = `${parts[0]}.${parts[1]}xyz.${parts[2]}`;
  const tamperedRes = await fetch(`${baseUrl}/api/admin/orders`, {
    headers: { Authorization: `Bearer ${tamperedToken}` },
  });
  assert.strictEqual(tamperedRes.status, 401, 'Tampered token signature returns 401');
  pass('Case 5: Tampered token signature returns HTTP 401');

  // 6. Wrong token type (Customer token against admin endpoint)
  const customerToken = generateToken({ sub: 'cust-1', role: 'CUSTOMER' });
  const wrongRoleRes = await fetch(`${baseUrl}/api/admin/orders`, {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert.strictEqual(wrongRoleRes.status, 403, 'Customer token on admin API returns 403');
  pass('Case 6: Customer role token on admin endpoint returns HTTP 403 Forbidden');

  // 7. Wrong token type (Admin token against customer orders endpoint)
  const wrongRoleCustRes = await fetch(`${baseUrl}/api/customer/orders`, {
    headers: { Authorization: `Bearer ${validToken}` },
  });
  assert.strictEqual(wrongRoleCustRes.status, 403, 'Admin token on customer API returns 403');
  pass('Case 7: Admin role token on customer endpoint returns HTTP 403 Forbidden');

  // 8. Zero secret disclosure in rejection bodies
  const checkRes = await fetch(`${baseUrl}/api/admin/orders`);
  const bodyStr = JSON.stringify(await checkRes.json());
  assert(!bodyStr.toLowerCase().includes('jwt_secret'), 'Never leaks JWT_SECRET');
  assert(!bodyStr.toLowerCase().includes('passwordhash'), 'Never leaks passwordHash');
  assert(!bodyStr.toLowerCase().includes('stack'), 'Never leaks stack');
  pass('Case 8: Rejection responses never disclose JWT secrets, password hashes, or stack traces');

  console.log('\n====================================================');
  console.log(`AUTHENTICATION ABUSE TESTS: ${passed} PASSED, 0 FAILED`);
  console.log('====================================================\n');
} finally {
  await new Promise((resolve) => server.close(resolve));
}
