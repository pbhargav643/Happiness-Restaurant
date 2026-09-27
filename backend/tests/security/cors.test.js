import assert from 'node:assert';
import http from 'node:http';
import app from '../../src/app.js';

console.log('====================================================');
console.log('PHASE 15: CORS SECURITY TEST SUITE');
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
  // 1. Allowed Origin
  const allowedOriginRes = await fetch(`${baseUrl}/api/health`, {
    headers: {
      Origin: 'http://localhost:5173',
    },
  });

  assert.strictEqual(
    allowedOriginRes.headers.get('access-control-allow-origin'),
    'http://localhost:5173',
    'CORS should reflect authorized origin'
  );
  pass('Authorized frontend origin http://localhost:5173 receives CORS header');

  // 2. Credentials header
  assert.strictEqual(
    allowedOriginRes.headers.get('access-control-allow-credentials'),
    'true',
    'CORS credentials header must be true'
  );
  pass('Access-Control-Allow-Credentials is set to true');

  // 3. Preflight OPTIONS request
  const preflightRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:5173',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type, Authorization',
    },
  });

  assert(preflightRes.status === 204 || preflightRes.status === 200, 'Preflight status should be 204 or 200');
  const allowMethods = preflightRes.headers.get('access-control-allow-methods');
  assert(allowMethods && allowMethods.includes('POST'), 'Preflight permits POST method');
  assert(allowMethods && allowMethods.includes('GET'), 'Preflight permits GET method');
  assert(allowMethods && allowMethods.includes('PATCH'), 'Preflight permits PATCH method');
  assert(allowMethods && allowMethods.includes('DELETE'), 'Preflight permits DELETE method');
  pass('Preflight OPTIONS response correctly authorizes standard HTTP methods');

  // 4. Wildcard origin prevention with credentials
  assert.notStrictEqual(
    allowedOriginRes.headers.get('access-control-allow-origin'),
    '*',
    'CORS must not return wildcard * with credentials enabled'
  );
  pass('CORS never returns wildcard * origin with credentials');

  console.log('\n====================================================');
  console.log(`CORS TESTS: ${passed} PASSED, 0 FAILED`);
  console.log('====================================================\n');
} finally {
  await new Promise((resolve) => server.close(resolve));
}
