import assert from 'node:assert';
import http from 'node:http';
import app from '../../src/app.js';

/**
 * HTTP Security Headers Verification Test Suite
 * Validates Helmet-equivalent defensive response headers
 */
console.log('====================================================');
console.log('PHASE 15: HTTP SECURITY HEADERS TEST SUITE');
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
  const res = await fetch(`${baseUrl}/api/health`);
  const headers = res.headers;

  // 1. X-Content-Type-Options
  assert.strictEqual(
    headers.get('x-content-type-options'),
    'nosniff',
    'X-Content-Type-Options must be nosniff'
  );
  pass('X-Content-Type-Options header is set to nosniff');

  // 2. X-Frame-Options
  assert.strictEqual(
    headers.get('x-frame-options'),
    'SAMEORIGIN',
    'X-Frame-Options must be SAMEORIGIN'
  );
  pass('X-Frame-Options header is set to SAMEORIGIN');

  // 3. X-XSS-Protection
  assert.strictEqual(
    headers.get('x-xss-protection'),
    '0',
    'X-XSS-Protection must be 0'
  );
  pass('X-XSS-Protection header is set to 0');

  // 4. Strict-Transport-Security
  const hsts = headers.get('strict-transport-security');
  assert(Boolean(hsts) && hsts.includes('max-age='), 'Strict-Transport-Security must be configured');
  pass('Strict-Transport-Security header is properly configured');

  // 5. Referrer-Policy
  assert.strictEqual(
    headers.get('referrer-policy'),
    'strict-origin-when-cross-origin',
    'Referrer-Policy must be strict-origin-when-cross-origin'
  );
  pass('Referrer-Policy header is strict-origin-when-cross-origin');

  // 6. Content-Security-Policy
  const csp = headers.get('content-security-policy');
  assert(Boolean(csp) && csp.includes("default-src 'self'"), 'CSP must restrict default-src to self');
  pass('Content-Security-Policy header defines safe resource directives');

  // 7. Cross-Origin-Opener-Policy & Resource-Policy
  assert.strictEqual(
    headers.get('cross-origin-opener-policy'),
    'same-origin',
    'COOP must be same-origin'
  );
  pass('Cross-Origin-Opener-Policy is set to same-origin');

  assert.strictEqual(
    headers.get('cross-origin-resource-policy'),
    'same-origin',
    'CORP must be same-origin'
  );
  pass('Cross-Origin-Resource-Policy is set to same-origin');

  // 8. Fingerprinting removal (X-Powered-By)
  assert.strictEqual(
    headers.get('x-powered-by'),
    null,
    'X-Powered-By must not be exposed'
  );
  pass('X-Powered-By header is cleanly stripped');

  console.log('\n====================================================');
  console.log(`SECURITY HEADERS TESTS: ${passed} PASSED, 0 FAILED`);
  console.log('====================================================\n');
} finally {
  await new Promise((resolve) => server.close(resolve));
}
