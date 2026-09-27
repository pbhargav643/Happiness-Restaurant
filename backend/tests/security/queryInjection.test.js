import assert from 'node:assert';
import http from 'node:http';
import app from '../../src/app.js';
import { mongoSanitizer } from '../../src/middleware/mongoSanitizer.js';

console.log('====================================================');
console.log('PHASE 15: MONGODB / NoSQL QUERY INJECTION TEST SUITE');
console.log('====================================================\n');

let passed = 0;
function pass(desc) {
  passed++;
  console.log(`[PASS] ${desc}`);
}

// 1. Direct Unit Test of mongoSanitizer Middleware
const maliciousBody = {
  name: 'Test Customer',
  password: { $ne: null },
  filter: {
    $gt: '',
    $regex: '.*',
    nested: {
      $where: 'sleep(1000)',
      safeField: 'legitimate',
    },
  },
  'evil.key': 'injection',
};

const reqMock = {
  body: JSON.parse(JSON.stringify(maliciousBody)),
  query: { search: { $regex: '.*' }, 'param.dot': 'val' },
  params: { id: { $ne: '123' } },
};

mongoSanitizer(reqMock, {}, () => {});

assert.strictEqual(reqMock.body.password.$ne, undefined, 'Operators starting with $ must be stripped');
assert.strictEqual(reqMock.body.filter.$gt, undefined, '$gt operator stripped');
assert.strictEqual(reqMock.body.filter.$regex, undefined, '$regex operator stripped');
assert.strictEqual(reqMock.body.filter.nested.$where, undefined, '$where operator stripped');
assert.strictEqual(reqMock.body.filter.nested.safeField, 'legitimate', 'Legitimate nested fields preserved');
assert.strictEqual(reqMock.body['evil.key'], undefined, 'Dotted property injection keys stripped');
assert.strictEqual(reqMock.query.search.$regex, undefined, 'Query operators starting with $ stripped');
assert.strictEqual(reqMock.query['param.dot'], undefined, 'Query dotted keys stripped');
assert.strictEqual(reqMock.params.id.$ne, undefined, 'Param operators starting with $ stripped');
pass('mongoSanitizer recursively removes all $ operators and dotted injection paths');

// 2. Integration Tests via HTTP against Live App Routes
const server = http.createServer(app);

await new Promise((resolve) => {
  server.listen(0, resolve);
});

const port = server.address().port;
const baseUrl = `http://127.0.0.1:${port}`;

try {
  // Test A: NoSQL Injection Attempt on Customer Login Authentication Bypass
  const loginInjectionRes = await fetch(`${baseUrl}/api/auth/customer/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: { $ne: null },
      password: { $ne: null },
    }),
  });
  assert.strictEqual(loginInjectionRes.status, 400, 'Login with NoSQL operators must be rejected safely');
  const loginBody = await loginInjectionRes.json();
  assert.strictEqual(loginBody.success, false);
  pass('Customer login safely rejects NoSQL operator injection attempt');

  // Test B: NoSQL Injection in Order Submission Payload
  const orderInjectionRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer: {
        name: { $gt: '' },
        mobile: { $ne: null },
      },
      pickup: {
        date: { $regex: '.*' },
        time: { $exists: true },
      },
      items: [{ itemId: 'soup-veg-clear-soup', quantity: 1 }],
      orderType: 'PICKUP',
    }),
  });
  assert.strictEqual(orderInjectionRes.status, 400, 'Order creation with injected operators must be rejected');
  const orderBody = await orderInjectionRes.json();
  assert.strictEqual(orderBody.success, false);
  pass('Order creation safely rejects nested NoSQL operator injection payload');

  // Test C: NoSQL Operator Injection in Public Menu Query String
  const menuInjectionRes = await fetch(`${baseUrl}/api/menu?category[$gt]=&search[$regex]=.*`);
  assert.strictEqual(menuInjectionRes.status, 200, 'Menu endpoint handles operator query strings safely without crashing');
  const menuBody = await menuInjectionRes.json();
  assert.strictEqual(menuBody.success, true);
  pass('Public menu endpoint neutralizes query operator injection and returns clean response');

  // Test D: Legitimate Menu Search and Filter Unbroken
  const legitimateSearchRes = await fetch(`${baseUrl}/api/menu?search=soup`);
  assert.strictEqual(legitimateSearchRes.status, 200, 'Legitimate menu search succeeds');
  const legitSearchBody = await legitimateSearchRes.json();
  assert.strictEqual(legitSearchBody.success, true);
  assert(Array.isArray(legitSearchBody.data), 'Search returns items array');
  pass('Legitimate search filter operates normally with sanitized inputs');

  const legitimateCategoryRes = await fetch(`${baseUrl}/api/menu?category=starters`);
  assert.strictEqual(legitimateCategoryRes.status, 200, 'Legitimate category filter succeeds');
  const legitCatBody = await legitimateCategoryRes.json();
  assert.strictEqual(legitCatBody.success, true);
  assert(Array.isArray(legitCatBody.data), 'Category returns items array');
  pass('Legitimate category filter operates normally with sanitized inputs');

  console.log('\n====================================================');
  console.log(`QUERY INJECTION TESTS: ${passed} PASSED, 0 FAILED`);
  console.log('====================================================\n');
} finally {
  await new Promise((resolve) => server.close(resolve));
}
