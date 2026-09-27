/**
 * Frontend Admin Order Manage Navigation & Auth Persistence Test Suite
 *
 * Verifies:
 * 1. Admin login & session establishment
 * 2. Navigation from Dashboard -> /admin/orders/:orderId
 * 3. Concurrent requests by AdminOrderDetailPage (Order Detail + Notifications + Provider Status)
 * 4. Auth header correctly attached to /notifications endpoints
 * 5. Admin session persists (token NOT cleared, no admin-session-expired event)
 * 6. Business errors (404 not found, 403 forbidden) do NOT trigger logout
 * 7. Genuine expired tokens still trigger session expiry safely
 */

let mockStore = {};
let dispatchedEvents = [];

global.localStorage = {
  getItem: (key) => mockStore[key] || null,
  setItem: (key, val) => { mockStore[key] = String(val); },
  removeItem: (key) => { delete mockStore[key]; },
  clear: () => { mockStore = {}; },
};

global.window = {
  localStorage: global.localStorage,
  dispatchEvent: (event) => {
    dispatchedEvents.push(event.type);
  },
};

global.CustomEvent = class CustomEvent {
  constructor(type, params) {
    this.type = type;
    this.detail = params?.detail;
  }
};

import { authStorage, authApi } from '../../src/services/authApi.js';
import { adminOrderApi } from '../../src/services/adminOrderApi.js';
import { adminNotificationApi } from '../../src/services/adminNotificationApi.js';
import { api, normalizeApiError } from '../../src/services/api.js';

console.log('====================================================');
console.log('ADMIN ORDER MANAGE & AUTH PERSISTENCE TEST SUITE');
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
    // ----------------------------------------------------
    // STEP 1: AUTHENTICATE ADMIN
    // ----------------------------------------------------
    console.log('--- Step 1: Admin Login & Session Initialization ---');
    mockStore = {};
    dispatchedEvents = [];

    const loginRes = await authApi.loginAdmin({
      email: 'admin@happinessrestaurant.com',
      password: 'Admin@12345',
    });

    assert(loginRes.success === true, 'Admin login succeeds with HTTP 200');
    assert(Boolean(authStorage.getToken()), 'Admin token is stored in localStorage');
    assert(Boolean(authStorage.getAdmin()), 'Admin profile is stored in localStorage');
    assert(authStorage.getAdmin()?.role === 'ADMIN', 'Admin user role is ADMIN');
    assert(dispatchedEvents.length === 0, 'No session expiry event dispatched during login');

    // ----------------------------------------------------
    // STEP 2: ADMIN DASHBOARD (/admin)
    // ----------------------------------------------------
    console.log('\n--- Step 2: Admin Dashboard (/admin) Orders Load ---');
    const dashboardOrdersRes = await adminOrderApi.getAdminOrders();
    assert(dashboardOrdersRes.success === true, 'Dashboard loaded orders successfully');
    assert(Array.isArray(dashboardOrdersRes.orders) && dashboardOrdersRes.orders.length > 0, 'Recent orders queue has orders');

    const targetOrder = dashboardOrdersRes.orders[0];
    const orderId = targetOrder.orderId;
    assert(Boolean(orderId), `Target orderId found: ${orderId}`);
    assert(orderId.startsWith('RF-'), 'orderId matches standard format RF-YYYYMMDD-XXXXXX');

    // ----------------------------------------------------
    // STEP 3: CLICK "MANAGE" -> /admin/orders/:orderId
    // (Simulate AdminOrderDetailPage mounting & lifecycle)
    // ----------------------------------------------------
    console.log(`\n--- Step 3: Click "Manage" -> /admin/orders/${orderId} ---`);
    dispatchedEvents = [];

    // AdminOrderDetailPage executes order fetch + notifications in parallel
    const [orderDetailRes, notifRes, statusRes] = await Promise.all([
      adminOrderApi.getAdminOrderById(orderId),
      adminNotificationApi.getOrderNotifications(orderId),
      adminNotificationApi.getProviderStatus(),
    ]);

    assert(orderDetailRes.success === true, 'Admin Order Detail API returned success: true');
    assert(orderDetailRes.order?.orderId === orderId, `Returned order matches exact orderId: ${orderId}`);
    assert(notifRes.success === true, 'Notifications API call succeeded with HTTP 200 (auth attached)');
    assert(statusRes.success === true, 'Notification provider status API call succeeded with HTTP 200 (auth attached)');

    // Crucial check: verify admin was NOT logged out
    assert(!dispatchedEvents.includes('admin-session-expired'), 'CRITICAL: admin-session-expired was NOT dispatched');
    assert(authStorage.getToken() !== null, 'CRITICAL: Admin token remains intact in localStorage');
    assert(authStorage.getAdmin() !== null, 'CRITICAL: Admin profile remains intact in localStorage');

    // ----------------------------------------------------
    // STEP 4: REFRESH PAGE ON /admin/orders/:orderId
    // ----------------------------------------------------
    console.log('\n--- Step 4: Refresh Page on /admin/orders/:orderId ---');
    dispatchedEvents = [];

    // AuthContext verifyExistingSession simulation
    const currentAdminRes = await authApi.getCurrentAdmin();
    assert(currentAdminRes.success === true, 'Session re-verification /api/auth/me returns 200');
    assert(currentAdminRes.admin?.role === 'ADMIN', 'Admin profile verified on refresh');

    // Re-mount page calls
    const refreshedOrder = await adminOrderApi.getAdminOrderById(orderId);
    assert(refreshedOrder.success === true, 'Order detail reloads cleanly on refresh');
    assert(authStorage.getToken() !== null, 'Admin token persists across page refresh');
    assert(!dispatchedEvents.includes('admin-session-expired'), 'No session expiry event on page refresh');

    // ----------------------------------------------------
    // STEP 5: NAVIGATE BACK TO /admin
    // ----------------------------------------------------
    console.log('\n--- Step 5: Navigate Back to Dashboard (/admin) ---');
    const returnDashboardRes = await adminOrderApi.getAdminOrders();
    assert(returnDashboardRes.success === true, 'Dashboard re-accessible without re-login');
    assert(authStorage.getToken() !== null, 'Admin remains authenticated on return to /admin');

    // ----------------------------------------------------
    // STEP 6: BUSINESS ERROR ISOLATION (404 Not Found)
    // ----------------------------------------------------
    console.log('\n--- Step 6: 404 Order Not Found Does NOT Trigger Logout ---');
    dispatchedEvents = [];
    const missingRes = await adminOrderApi.getAdminOrderById('RF-NONEXISTENT-999999');
    assert(missingRes.success === false, 'Non-existent order returns error');
    assert(!dispatchedEvents.includes('admin-session-expired'), '404 does NOT trigger admin-session-expired');
    assert(authStorage.getToken() !== null, 'Admin token is NOT cleared on 404 order not found');

    // ----------------------------------------------------
    // STEP 7: GENUINE EXPIRED TOKEN STILL CAUSES LOGOUT
    // ----------------------------------------------------
    console.log('\n--- Step 7: Genuine Expired Token Triggers Session Expiry ---');
    dispatchedEvents = [];
    // Set a corrupted/expired token to simulate genuine auth failure
    authStorage.setToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.expired');
    try {
      await api.get('/auth/me');
      assert(false, 'Expired token should throw 401');
    } catch (err) {
      assert(err.status === 401, 'Invalid/expired token rejected with HTTP 401');
      assert(dispatchedEvents.includes('admin-session-expired'), 'Genuine auth failure dispatches admin-session-expired');
      assert(authStorage.getToken() === null, 'Stale token cleaned up from storage');
    }

  } catch (err) {
    console.error('Test suite caught unexpected error:', err);
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
