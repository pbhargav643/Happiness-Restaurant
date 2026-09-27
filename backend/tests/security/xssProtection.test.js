import assert from 'node:assert';
import http from 'node:http';
import app from '../../src/app.js';
import { isSafeImagePath } from '../../src/middleware/inputValidation.js';
import { generateToken } from '../../src/utils/jwt.js';

console.log('====================================================');
console.log('PHASE 15: XSS & DANGEROUS URI SCHEME PROTECTION TEST SUITE');
console.log('====================================================\n');

let passed = 0;
function pass(desc) {
  passed++;
  console.log(`[PASS] ${desc}`);
}

// 1. Dangerous URI Scheme and Path Traversal Unit Checks
assert.strictEqual(isSafeImagePath('javascript:alert(1)'), false, 'javascript: scheme must be rejected');
assert.strictEqual(isSafeImagePath('JAVASCRIPT:alert(document.cookie)'), false, 'Case-insensitive javascript: rejected');
assert.strictEqual(isSafeImagePath('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=='), false, 'data: URI scheme rejected');
assert.strictEqual(isSafeImagePath('vbscript:msgbox(1)'), false, 'vbscript: scheme rejected');
assert.strictEqual(isSafeImagePath('file:///etc/passwd'), false, 'file: scheme rejected');
assert.strictEqual(isSafeImagePath('../../../secret.png'), false, 'Directory traversal .. rejected');
assert.strictEqual(isSafeImagePath('/images/menu/soup.webp'), true, 'Legitimate relative image path allowed');
assert.strictEqual(isSafeImagePath('https://res.cloudinary.com/demo/image/upload/sample.jpg'), true, 'Legitimate HTTPS image allowed');
pass('isSafeImagePath strictly neutralizes dangerous schemes and traversal patterns');

// 2. Integration Tests via HTTP
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

try {
  // Test A: Email with script payload in Order Placement rejected
  const scriptEmailOrderRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer: {
        name: 'Normal Customer',
        mobile: '9876543210',
        email: '<script>alert(1)</script>@hack.com',
      },
      pickup: {
        date: '2026-12-31',
        time: '18:30',
      },
      items: [{ itemId: 'soup-veg-clear-soup', quantity: 1 }],
      orderType: 'PICKUP',
    }),
  });
  assert.strictEqual(scriptEmailOrderRes.status, 400, 'Email with HTML tags must fail validation');
  const emailErrBody = await scriptEmailOrderRes.json();
  assert.strictEqual(emailErrBody.success, false);
  pass('XSS payload inside email is safely caught and rejected');

  // Test B: Mobile with script payload rejected
  const scriptMobileRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer: {
        name: 'Normal Customer',
        mobile: '<script>alert(1)</script>',
      },
      pickup: {
        date: '2026-12-31',
        time: '18:30',
      },
      items: [{ itemId: 'soup-veg-clear-soup', quantity: 1 }],
      orderType: 'PICKUP',
    }),
  });
  assert.strictEqual(scriptMobileRes.status, 400, 'Mobile with HTML tags must fail validation');
  pass('XSS payload inside mobile number is safely rejected');

  // Test C: Menu Item creation with javascript: image scheme rejected
  const scriptImageRes = await fetch(`${baseUrl}/api/admin/menu`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: 'Exploit Food',
      category: 'starters',
      price: 150,
      image: 'javascript:alert(1)',
    }),
  });
  assert.strictEqual(scriptImageRes.status, 400, 'javascript: image URI must be rejected');
  const imgErr = await scriptImageRes.json();
  assert.strictEqual(imgErr.success, false);
  pass('Admin menu item creation with javascript: image URI rejected with 400');

  // Test D: Search query with XSS payload does not trigger execution or server crash
  const xssSearchRes = await fetch(`${baseUrl}/api/menu?search=${encodeURIComponent('<script>alert("XSS")</script>')}`);
  assert.strictEqual(xssSearchRes.status, 200, 'XSS search query handled safely');
  const contentType = xssSearchRes.headers.get('content-type');
  assert(contentType.includes('application/json'), 'Response must always be application/json, never text/html');
  const nosniff = xssSearchRes.headers.get('x-content-type-options');
  assert.strictEqual(nosniff, 'nosniff', 'X-Content-Type-Options: nosniff header prevents MIME confusion');
  pass('Search query with script tags returns clean application/json without MIME confusion');

  console.log('\n====================================================');
  console.log(`XSS PROTECTION TESTS: ${passed} PASSED, 0 FAILED`);
  console.log('====================================================\n');
} finally {
  await new Promise((resolve) => server.close(resolve));
}
