import assert from 'node:assert';
import { createRateLimiter, _resetRateLimiter } from '../../src/middleware/rateLimiter.js';

console.log('====================================================');
console.log('PHASE 15: RATE LIMITING SECURITY TEST SUITE');
console.log('====================================================\n');

let passed = 0;
function pass(desc) {
  passed++;
  console.log(`[PASS] ${desc}`);
}

_resetRateLimiter();

// 1. Create a controlled rate limiter: max 3 attempts per window
const testLimiter = createRateLimiter({
  windowMs: 5000,
  maxAttempts: 3,
  message: 'Custom rate limit exceeded.',
  skipInTests: false,
});

function mockRequest(ip = '192.168.1.100') {
  return {
    headers: { 'x-forwarded-for': ip },
    socket: { remoteAddress: ip },
    ip,
  };
}

function mockResponse() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(key, val) {
      this.headers[key.toLowerCase()] = val;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

// Attempts 1, 2, 3 should all succeed (call next)
let nextCalled = 0;
const next = () => { nextCalled++; };

for (let i = 1; i <= 3; i++) {
  const req = mockRequest('10.0.0.1');
  const res = mockResponse();
  testLimiter(req, res, next);
  assert.strictEqual(res.statusCode, 200, `Attempt ${i} should be permitted`);
}
assert.strictEqual(nextCalled, 3, 'next() called 3 times');
pass('Permits requests up to configured limit');

// Attempt 4 from same IP should trigger 429
const req4 = mockRequest('10.0.0.1');
const res4 = mockResponse();
let nextCalled4 = false;
testLimiter(req4, res4, () => { nextCalled4 = true; });

assert.strictEqual(nextCalled4, false, 'next() must NOT be called after limit exceeded');
assert.strictEqual(res4.statusCode, 429, 'HTTP 429 status code returned');
assert.strictEqual(res4.body.success, false, 'Response contains success: false');
assert.strictEqual(res4.body.message, 'Custom rate limit exceeded.', 'Custom rate limit message returned');
assert(Boolean(res4.headers['retry-after']), 'Retry-After header included');
pass('Triggers HTTP 429 with Retry-After header upon exceeding limit');

// Request from a different IP should NOT be blocked (IP isolation)
const reqOther = mockRequest('10.0.0.2');
const resOther = mockResponse();
let nextCalledOther = false;
testLimiter(reqOther, resOther, () => { nextCalledOther = true; });
assert.strictEqual(nextCalledOther, true, 'Different IP is not affected');
assert.strictEqual(resOther.statusCode, 200, 'Different IP receives 200');
pass('Rate limit counters are strictly isolated per IP');

// Test store reset
_resetRateLimiter();
const reqAfterReset = mockRequest('10.0.0.1');
const resAfterReset = mockResponse();
let nextCalledReset = false;
testLimiter(reqAfterReset, resAfterReset, () => { nextCalledReset = true; });
assert.strictEqual(nextCalledReset, true, 'IP can request again after store reset');
pass('_resetRateLimiter() safely clears counters for test teardown');

console.log('\n====================================================');
console.log(`RATE LIMITING TESTS: ${passed} PASSED, 0 FAILED`);
console.log('====================================================\n');
