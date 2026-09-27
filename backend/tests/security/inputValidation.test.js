import assert from 'node:assert';
import http from 'node:http';
import app from '../../src/app.js';
import { mongoSanitizer } from '../../src/middleware/mongoSanitizer.js';
import { isSafeImagePath } from '../../src/middleware/inputValidation.js';
import { generateToken } from '../../src/utils/jwt.js';

console.log('====================================================');
console.log('PHASE 15: INPUT VALIDATION & NOSQL DEFENSE TEST SUITE');
console.log('====================================================\n');

let passed = 0;
function pass(desc) {
  passed++;
  console.log(`[PASS] ${desc}`);
}

// 1. NoSQL Injection / MongoSanitizer unit test
const maliciousPayload = {
  customer: {
    name: 'Attacker',
    $where: 'sleep(5000)',
    'nested.key': 'bad',
  },
  $gt: '',
  validKey: 'safe-value',
};

const mockReq = { body: JSON.parse(JSON.stringify(maliciousPayload)), query: { $ne: null }, params: {} };
mongoSanitizer(mockReq, {}, () => {});

assert.strictEqual(mockReq.body.$gt, undefined, '$gt operator must be stripped');
assert.strictEqual(mockReq.body.customer.$where, undefined, '$where operator must be stripped');
assert.strictEqual(mockReq.body.customer['nested.key'], undefined, 'Key with dot must be stripped');
assert.strictEqual(mockReq.body.validKey, 'safe-value', 'Safe key preserved');
assert.strictEqual(mockReq.query.$ne, undefined, 'Query $ne operator stripped');
pass('mongoSanitizer successfully strips all NoSQL injection operators and property traversals');

// 2. Image Path Traversal Prevention
assert.strictEqual(isSafeImagePath('../../../etc/passwd'), false, 'Directory traversal is unsafe');
assert.strictEqual(isSafeImagePath('/images/menu/../../secret.txt'), false, 'Relative traversal is unsafe');
assert.strictEqual(isSafeImagePath('C:\\Windows\\System32\\cmd.exe'), false, 'Windows backslash path is unsafe');
assert.strictEqual(isSafeImagePath('/images/menu/paneer-tikka.jpg'), true, 'Valid menu image path is safe');
assert.strictEqual(isSafeImagePath('https://example.com/photo.jpg'), true, 'Valid HTTPS image URL is safe');
pass('isSafeImagePath strictly blocks directory traversal attempts');

// 3. API Integration Tests for Input Validation
const server = http.createServer(app);

await new Promise((resolve) => {
  server.listen(0, resolve);
});

const port = server.address().port;
const baseUrl = `http://127.0.0.1:${port}`;
const adminToken = generateToken({ sub: 'admin-1', role: 'ADMIN' });

try {
  // Test Delivery rejection
  const deliveryRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderType: 'DELIVERY',
      customer: { name: 'John Doe', mobile: '9876543210' },
      pickup: { date: '2026-09-25', time: '18:00' },
      items: [{ itemId: 'soup-item', quantity: 1 }],
    }),
  });
  assert.strictEqual(deliveryRes.status, 400, 'DELIVERY orderType must be rejected');
  const deliveryBody = await deliveryRes.json();
  assert(deliveryBody.message.includes('PICKUP'), 'Error message specifies PICKUP requirement');
  pass('Order creation strictly rejects non-PICKUP order types');

  // Test invalid mobile number
  const badMobileRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer: { name: 'John Doe', mobile: '12345' }, // Invalid mobile
      pickup: { date: '2026-09-25', time: '18:00' },
      items: [{ itemId: 'soup-item', quantity: 1 }],
    }),
  });
  assert.strictEqual(badMobileRes.status, 400, 'Invalid mobile must return 400');
  pass('Order creation rejects invalid mobile numbers with HTTP 400');

  // Test invalid pickup date format
  const badDateRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer: { name: 'John Doe', mobile: '9876543210' },
      pickup: { date: '25-09-2026', time: '18:00' }, // Invalid format
      items: [{ itemId: 'soup-item', quantity: 1 }],
    }),
  });
  assert.strictEqual(badDateRes.status, 400, 'Invalid date format must return 400');
  pass('Order creation rejects malformed pickup dates with HTTP 400');

  // Test empty items array
  const emptyItemsRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer: { name: 'John Doe', mobile: '9876543210' },
      pickup: { date: '2026-09-25', time: '18:00' },
      items: [], // Empty
    }),
  });
  assert.strictEqual(emptyItemsRes.status, 400, 'Empty items array must return 400');
  pass('Order creation rejects empty items array with HTTP 400');

  // Test invalid itemId param on order lookup
  const badOrderIdRes = await fetch(`${baseUrl}/api/orders/invalid%20order%20with%20spaces%20and%20symbols$$$`);
  assert.strictEqual(badOrderIdRes.status, 400, 'Malformed Order ID format returns 400');
  pass('Order lookup parameter validator rejects malformed Order ID formats');

  // Test path traversal on admin menu creation
  const traversalMenuRes = await fetch(`${baseUrl}/api/admin/menu`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: 'Hacked Dish',
      category: 'soup',
      price: 150,
      image: '../../../etc/passwd',
    }),
  });
  assert.strictEqual(traversalMenuRes.status, 400, 'Menu item with directory traversal image must return 400');
  pass('Admin menu creation rejects image path traversal attempts');

  console.log('\n====================================================');
  console.log(`INPUT VALIDATION TESTS: ${passed} PASSED, 0 FAILED`);
  console.log('====================================================\n');
} finally {
  await new Promise((resolve) => server.close(resolve));
}
