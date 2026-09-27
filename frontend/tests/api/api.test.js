import { API_BASE_URL, normalizeApiError, api } from '../../src/services/api.js';

console.log('====================================================');
console.log('FRONTEND API CLIENT & ERROR HANDLING TEST SUITE');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;


function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${message}`);
    failCount++;
  }
}

async function runTests() {
  try {
    // 1. Base URL Configuration
    console.log('--- Test 1: API Base URL Configuration ---');
    assert(typeof API_BASE_URL === 'string', 'API_BASE_URL is a string');
    assert(API_BASE_URL.includes('/api'), 'API_BASE_URL contains /api endpoint path');
    assert(!API_BASE_URL.endsWith('/'), 'API_BASE_URL has no trailing slash');

    // 2. Error Normalization
    console.log('\n--- Test 2: Error Normalization ---');
    const netErr = normalizeApiError(new TypeError('Failed to fetch'));
    assert(netErr.isApiError === true, 'Normalized error has isApiError: true');
    assert(netErr.message.includes('Unable to reach the restaurant server'), 'Friendly message for network failure');
    assert(!netErr.message.includes('TypeError'), 'Does not leak JS exception names to user');

    const timeoutErr = normalizeApiError({ name: 'AbortError' });
    assert(timeoutErr.message.includes('Connection timed out'), 'Friendly message for timeout');

    const notFoundErr = normalizeApiError(new Error('Item not found'), { status: 404 });
    assert(notFoundErr.status === 404, 'Preserves status 404');
    assert(notFoundErr.message === 'Item not found', 'Preserves clean server error message');

    const serverErr = normalizeApiError(new Error('Database syntax crash at line 99'), { status: 500 });
    assert(serverErr.status === 500, 'Preserves 500 status');
    assert(!serverErr.message.includes('syntax crash'), 'Sanitizes internal server error text');
    assert(serverErr.message.includes('technical difficulties'), 'Friendly customer message on 500');

    // 3. API Methods Presence
    console.log('\n--- Test 3: API Service Methods ---');
    assert(typeof api.get === 'function', 'api.get is a function');
    assert(typeof api.post === 'function', 'api.post is a function');
    assert(typeof api.patch === 'function', 'api.patch is a function');
    assert(typeof api.checkHealth === 'function', 'api.checkHealth is a function');

    // 4. Live Health Check
    console.log('\n--- Test 4: Live Health Connection ---');
    const health = await api.checkHealth();
    assert(typeof health === 'object', 'checkHealth returns an object');
    assert(typeof health.healthy === 'boolean', 'healthy indicator is a boolean');
    if (health.healthy) {
      assert(health.message === 'Restaurant API is running', 'Health message matches backend contract');
    } else {
      assert(typeof health.message === 'string', 'Health error message is safe string');
    }
  } catch (err) {
    console.error('API test error:', err);
    failCount++;
  }

  console.log('\n====================================================');
  console.log(`TOTAL PASSED: ${passCount}`);
  console.log(`TOTAL FAILED: ${failCount}`);
  console.log('====================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();
