/**
 * Frontend Customer Auth API, Storage & Isolation Test Suite
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

// Mock fetch for customerAuthApi tests
let lastFetchCall = null;
global.fetch = async (url, options = {}) => {
  lastFetchCall = { url, options };

  if (url.includes('/auth/customer/register')) {
    return {
      ok: true,
      status: 201,
      headers: { get: () => 'application/json' },
      json: async () => ({
        success: true,
        message: 'Registration successful',
        token: 'mock.customer.register.jwt',
        customer: {
          id: 'cust_001',
          name: 'Rahul Sharma',
          mobile: '9876543210',
          email: 'rahul@example.com',
          role: 'CUSTOMER',
          isActive: true,
        },
      }),
    };
  }

  if (url.includes('/auth/customer/login')) {
    return {
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        success: true,
        message: 'Login successful',
        token: 'mock.customer.login.jwt',
        customer: {
          id: 'cust_001',
          name: 'Rahul Sharma',
          mobile: '9876543210',
          email: 'rahul@example.com',
          role: 'CUSTOMER',
          isActive: true,
        },
      }),
    };
  }

  if (url.includes('/auth/customer/me')) {
    const authHeader = options.headers?.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer mock.customer')) {
      return {
        ok: false,
        status: 401,
        headers: { get: () => 'application/json' },
        json: async () => ({ success: false, message: 'Authentication required' }),
      };
    }
    return {
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        success: true,
        customer: {
          id: 'cust_001',
          name: 'Rahul Sharma',
          mobile: '9876543210',
          email: 'rahul@example.com',
          role: 'CUSTOMER',
          isActive: true,
        },
      }),
    };
  }

  if (url.includes('/auth/customer/logout')) {
    return {
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ success: true, message: 'Logged out successfully' }),
    };
  }

  return {
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => ({ success: true }),
  };
};

import { customerStorage, customerAuthApi } from '../../src/services/customerAuthApi.js';
import { authStorage } from '../../src/services/authApi.js';

console.log('====================================================');
console.log('FRONTEND CUSTOMER AUTH STORAGE & ISOLATION TEST SUITE');
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

    // ----------------------------------------------------------------
    // 1. Customer Token Storage
    // ----------------------------------------------------------------
    console.log('--- Test 1: Customer Token Storage ---');
    assert(customerStorage.getToken() === null, 'customerStorage.getToken() returns null when empty');
    customerStorage.setToken('cust.sample.token');
    assert(customerStorage.getToken() === 'cust.sample.token', 'customerStorage.getToken() returns stored token');
    assert(mockStore['happiness_customer_token'] === 'cust.sample.token', 'Uses happiness_customer_token storage key');
    assert(mockStore['happiness_admin_token'] === undefined, 'Admin token key remains untouched');
    customerStorage.removeToken();
    assert(customerStorage.getToken() === null, 'customerStorage.removeToken() removes customer token');

    // ----------------------------------------------------------------
    // 2. Customer Profile Storage & Sanitization
    // ----------------------------------------------------------------
    console.log('\n--- Test 2: Customer Profile Storage & Sanitization ---');
    const customerWithSensitiveData = {
      id: 'cust_999',
      name: 'Priya Patel',
      mobile: '9876543211',
      email: 'priya@example.com',
      role: 'CUSTOMER',
      isActive: true,
      password: 'PlaintextPasswordNeverSaved',
      passwordHash: 'PBKDF2HashNeverSaved',
    };
    customerStorage.setCustomer(customerWithSensitiveData);
    const storedCustomer = customerStorage.getCustomer();
    assert(storedCustomer !== null, 'getCustomer() returns parsed profile');
    assert(storedCustomer.name === 'Priya Patel', 'Customer name is preserved');
    assert(storedCustomer.mobile === '9876543211', 'Customer mobile is preserved');
    assert(storedCustomer.email === 'priya@example.com', 'Customer email is preserved');
    assert(storedCustomer.role === 'CUSTOMER', 'Customer role is CUSTOMER');
    assert(storedCustomer.password === undefined, 'Plaintext password is stripped before storage');
    assert(storedCustomer.passwordHash === undefined, 'passwordHash is stripped before storage');
    assert(mockStore['happiness_customer_user'] !== undefined, 'Stored under happiness_customer_user key');
    assert(mockStore['happiness_admin_user'] === undefined, 'happiness_admin_user is not affected');

    // ----------------------------------------------------------------
    // 3. Clear Customer Auth
    // ----------------------------------------------------------------
    console.log('\n--- Test 3: Clear Customer Auth ---');
    customerStorage.setToken('test_tok');
    customerStorage.clearAuth();
    assert(customerStorage.getToken() === null, 'Token cleared after clearAuth()');
    assert(customerStorage.getCustomer() === null, 'Profile cleared after clearAuth()');

    // ----------------------------------------------------------------
    // 4. API Register & Login Flow
    // ----------------------------------------------------------------
    console.log('\n--- Test 4: API Register & Login Flow ---');
    const regResult = await customerAuthApi.register({
      name: 'Rahul Sharma',
      mobile: '9876543210',
      email: 'rahul@example.com',
      password: 'SecurePassword@123',
    });
    assert(regResult.success === true, 'customerAuthApi.register() completes successfully');
    assert(customerStorage.getToken() === 'mock.customer.register.jwt', 'Sets token in customerStorage after registration');
    assert(customerStorage.getCustomer()?.name === 'Rahul Sharma', 'Sets customer in customerStorage after registration');

    const loginResult = await customerAuthApi.login({
      identifier: '9876543210',
      password: 'SecurePassword@123',
    });
    assert(loginResult.success === true, 'customerAuthApi.login() completes successfully');
    assert(customerStorage.getToken() === 'mock.customer.login.jwt', 'Sets updated token in customerStorage after login');

    // ----------------------------------------------------------------
    // 5. Protected Profile (/me) Call
    // ----------------------------------------------------------------
    console.log('\n--- Test 5: Customer Profile API (/me) ---');
    const meResult = await customerAuthApi.getCurrentCustomer();
    assert(meResult.success === true && meResult.customer.name === 'Rahul Sharma', 'getCurrentCustomer() fetches customer profile');
    assert(lastFetchCall.options.headers.Authorization === 'Bearer mock.customer.login.jwt', 'Sends Bearer customer token');

    // ----------------------------------------------------------------
    // 6. Two-Way Storage Coexistence
    // ----------------------------------------------------------------
    console.log('\n--- Test 6: Admin & Customer Storage Coexistence ---');
    // Simulate Admin logged in alongside Customer
    authStorage.setToken('admin.super.secret.token');
    authStorage.setAdmin({
      id: 'admin_1',
      name: 'Counter Admin',
      email: 'admin@restaurant.com',
      role: 'ADMIN',
      isActive: true,
    });

    assert(customerStorage.getToken() === 'mock.customer.login.jwt', 'Customer token is intact');
    assert(authStorage.getToken() === 'admin.super.secret.token', 'Admin token is intact simultaneously');

    // Customer logs out
    await customerAuthApi.logout();
    assert(customerStorage.getToken() === null, 'Customer token removed after logout');
    assert(customerStorage.getCustomer() === null, 'Customer profile removed after logout');
    assert(authStorage.getToken() === 'admin.super.secret.token', 'Admin token remains completely intact after customer logout');
    assert(authStorage.getAdmin()?.role === 'ADMIN', 'Admin profile remains completely intact after customer logout');

    console.log('\n====================================================');
    console.log(`FRONTEND CUSTOMER AUTH RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('====================================================\n');

    if (failCount > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal Frontend Test Error:', err);
    process.exit(1);
  }
}

runTests();
