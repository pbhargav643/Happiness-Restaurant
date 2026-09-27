/**
 * Frontend Admin Login & Error Sanitization Test Suite
 */

let mockStore = {};
global.localStorage = {
  getItem: (key) => mockStore[key] || null,
  setItem: (key, val) => { mockStore[key] = String(val); },
  removeItem: (key) => { delete mockStore[key]; },
  clear: () => { mockStore = {}; },
};

global.window = {
  localStorage: global.localStorage,
  dispatchEvent: () => {},
};

import { authStorage } from '../../src/services/authApi.js';
import { normalizeApiError } from '../../src/services/api.js';

console.log('====================================================');
console.log('FRONTEND ADMIN LOGIN & SANITIZATION TEST SUITE');
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
    mockStore = {};

    // 1. Password Never Stored in Storage
    console.log('--- Test 1: Password Storage Immunity ---');
    const mockAuthPayload = {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      admin: {
        id: 'admin_id_999',
        name: 'Head Chef Admin',
        email: 'chef@happinessrestaurant.com',
        role: 'ADMIN',
        isActive: true,
      },
    };

    authStorage.setToken(mockAuthPayload.token);
    authStorage.setAdmin(mockAuthPayload.admin);

    const storedAdminRaw = global.localStorage.getItem('happiness_admin_user');
    assert(!storedAdminRaw.includes('password'), 'Stored admin JSON has no password property');
    assert(!storedAdminRaw.includes('passwordHash'), 'Stored admin JSON has no passwordHash property');

    // 2. 401 Error Sanitization
    console.log('\n--- Test 2: 401 Unauthorized Sanitization ---');
    const authError = normalizeApiError(new Error('Invalid email or password.'), { status: 401 });
    assert(authError.status === 401, 'Preserves status 401');
    assert(authError.isAuthError === true, 'Flags error as isAuthError: true');
    assert(authError.message === 'Invalid email or password.', 'Presents clean error message');
    assert(!authError.message.includes('Mongo'), 'Does not leak MongoDB details');
    assert(!authError.message.includes('passwordHash'), 'Does not leak passwordHash details');

    // 3. 403 Forbidden Sanitization
    console.log('\n--- Test 3: 403 Forbidden Sanitization ---');
    const forbiddenError = normalizeApiError(new Error('Your admin account is inactive.'), { status: 403 });
    assert(forbiddenError.status === 403, 'Preserves status 403');
    assert(forbiddenError.isForbidden === true, 'Flags error as isForbidden: true');
    assert(forbiddenError.message === 'Your admin account is inactive.', 'Presents clean inactive error');

    // 4. Rate Limiting 429 Error Presentation
    console.log('\n--- Test 4: Rate Limiting 429 Sanitization ---');
    const rateLimitError = normalizeApiError(new Error('Too many login attempts. Please try again after 15 minutes.'), { status: 429 });
    assert(rateLimitError.status === 429, 'Preserves status 429');
    assert(rateLimitError.message.includes('Too many login attempts'), 'Presents clean rate-limiting message');

    // 5. Network / Server Failure Sanitization
    console.log('\n--- Test 5: Server Crash / Database Failure Sanitization ---');
    const internalCrash = normalizeApiError(new Error('MongoNetworkTimeoutException at 127.0.0.1:27017: pool destroyed'), { status: 500 });
    assert(internalCrash.status === 500, '500 error mapped cleanly');
    assert(!internalCrash.message.includes('MongoNetworkTimeoutException'), 'Sanitizes internal database exception names');
    assert(!internalCrash.message.includes('27017'), 'Sanitizes internal ports and IP addresses');
    assert(internalCrash.message.includes('technical difficulties'), 'Presents polite user message');
  } catch (err) {
    console.error('Test error:', err);
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
