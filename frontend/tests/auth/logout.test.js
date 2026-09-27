/**
 * Frontend Admin Logout & Customer State Preservation Test Suite
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
console.log('FRONTEND LOGOUT & DATA ISOLATION TEST SUITE');
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

    // 1. Setup simulated customer data and admin credentials
    console.log('--- Test 1: Setup Mixed Session State ---');
    global.localStorage.setItem('restaurant_cart', JSON.stringify([{ id: 'paneer_tikka', qty: 2 }]));
    global.localStorage.setItem('restaurant_customer_mobile', '9876543210');
    global.localStorage.setItem('restaurant_active_order', JSON.stringify({ orderId: 'ORD-2026-001' }));
    global.localStorage.setItem('restaurant_orders', JSON.stringify([{ orderId: 'ORD-2026-001' }]));

    authStorage.setToken('admin.jwt.secret.token');
    authStorage.setAdmin({ id: 'admin_1', email: 'admin@restaurant.com', role: 'ADMIN' });

    assert(global.localStorage.getItem('happiness_admin_token') !== null, 'Admin token is initially stored');
    assert(global.localStorage.getItem('restaurant_cart') !== null, 'Customer cart is initially stored');

    // 2. Perform Admin Logout
    console.log('\n--- Test 2: Admin Logout Cleanup ---');
    await authApi.logoutAdmin();

    // 3. Verify Admin State Cleared
    console.log('\n--- Test 3: Admin Auth State Cleared ---');
    assert(authStorage.getToken() === null, 'Admin JWT token is cleared from localStorage');
    assert(authStorage.getAdmin() === null, 'Admin user profile is cleared from localStorage');

    // 4. Verify Customer State Is NOT Cleared
    console.log('\n--- Test 4: Customer Data Isolation (NOT Cleared) ---');
    const customerCart = global.localStorage.getItem('restaurant_cart');
    assert(customerCart !== null, 'Customer cart is completely preserved across Admin logout');
    assert(JSON.parse(customerCart).length === 1, 'Customer cart contents remain intact');

    const customerMobile = global.localStorage.getItem('restaurant_customer_mobile');
    assert(customerMobile === '9876543210', 'Customer mobile identity is preserved');

    const activeOrder = global.localStorage.getItem('restaurant_active_order');
    assert(activeOrder !== null, 'Customer active order tracking is preserved');

    const ordersHistory = global.localStorage.getItem('restaurant_orders');
    assert(ordersHistory !== null, 'Customer orders history list is preserved');
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
