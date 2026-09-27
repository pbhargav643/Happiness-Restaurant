/**
 * Frontend Auth API & Storage Test Suite
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

import { authStorage, authApi } from '../../src/services/authApi.js';

console.log('====================================================');
console.log('FRONTEND AUTH API & STORAGE TEST SUITE');
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

    // 1. Token storage helpers
    console.log('--- Test 1: Token Storage Helpers ---');
    assert(authStorage.getToken() === null, 'getToken() returns null when empty');
    authStorage.setToken('sample.jwt.token');
    assert(authStorage.getToken() === 'sample.jwt.token', 'getToken() returns stored token');
    authStorage.removeToken();
    assert(authStorage.getToken() === null, 'removeToken() removes token');

    // 2. Admin user storage helpers
    console.log('\n--- Test 2: Admin Profile Storage Helpers ---');
    const sampleAdmin = {
      id: 'admin_123',
      name: 'Manager Admin',
      email: 'admin@happinessrestaurant.com',
      role: 'ADMIN',
      isActive: true,
      password: 'PlaintextShouldBeIgnored',
      passwordHash: 'HashShouldBeIgnored',
    };
    authStorage.setAdmin(sampleAdmin);
    const stored = authStorage.getAdmin();
    assert(stored !== null, 'getAdmin() returns admin object');
    assert(stored.email === 'admin@happinessrestaurant.com', 'Admin email preserved');
    assert(stored.role === 'ADMIN', 'Admin role preserved');
    assert(stored.password === undefined, 'Plaintext password is stripped before storage');
    assert(stored.passwordHash === undefined, 'passwordHash is stripped before storage');

    // 3. Clear auth
    console.log('\n--- Test 3: Clear Auth ---');
    authStorage.setToken('test_token');
    authStorage.setAdmin(sampleAdmin);
    authStorage.clearAuth();
    assert(authStorage.getToken() === null, 'clearAuth() removes token');
    assert(authStorage.getAdmin() === null, 'clearAuth() removes admin profile');

    // 4. authApi Interface
    console.log('\n--- Test 4: Auth API Service Interface ---');
    assert(typeof authApi.loginAdmin === 'function', 'authApi.loginAdmin is a function');
    assert(typeof authApi.getCurrentAdmin === 'function', 'authApi.getCurrentAdmin is a function');
    assert(typeof authApi.logoutAdmin === 'function', 'authApi.logoutAdmin is a function');

    // 5. Logout cleanup verification
    console.log('\n--- Test 5: Logout Local Cleanup ---');
    authStorage.setToken('active_token');
    authStorage.setAdmin({ id: '123', email: 'admin@test.com', role: 'ADMIN' });
    await authApi.logoutAdmin();
    assert(authStorage.getToken() === null, 'logoutAdmin() reliably clears stored token');
    assert(authStorage.getAdmin() === null, 'logoutAdmin() reliably clears stored admin');
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
