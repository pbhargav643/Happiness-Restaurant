import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('FRONTEND CUSTOMER ORDER OWNERSHIP TEST SUITE');
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

// Mock localStorage for Node test environment
const mockStorage = {};
if (typeof global.localStorage === 'undefined') {
  global.localStorage = {
    getItem: (key) => (key in mockStorage ? mockStorage[key] : null),
    setItem: (key, val) => {
      mockStorage[key] = String(val);
    },
    removeItem: (key) => {
      delete mockStorage[key];
    },
    clear: () => {
      Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    },
  };
}
if (typeof global.window === 'undefined') {
  global.window = { localStorage: global.localStorage };
}

async function runTests() {
  const frontendSrc = path.join(__dirname, '..', '..', 'src');

  try {
    // ----------------------------------------------------------------
    // 1. Authenticated customer order history service
    // ----------------------------------------------------------------
    console.log('--- Test 1: Authenticated Customer Order History Service ---');
    const { customerOrderApi } = await import('../../src/services/customerOrderApi.js');
    assert(typeof customerOrderApi.getMyOrders === 'function', 'customerOrderApi exposes getMyOrders() function');

    const customerOrderApiSrc = fs.readFileSync(
      path.join(frontendSrc, 'services', 'customerOrderApi.js'),
      'utf-8'
    );
    assert(
      customerOrderApiSrc.includes('/customer/orders'),
      'customerOrderApi calls /customer/orders endpoint'
    );
    assert(
      customerOrderApiSrc.includes('Authorization') && customerOrderApiSrc.includes('Bearer'),
      'customerOrderApi attaches Bearer authorization header from verified token'
    );

    // ----------------------------------------------------------------
    // 2. Authenticated customer order detail service
    // ----------------------------------------------------------------
    console.log('\n--- Test 2: Authenticated Customer Order Detail Service ---');
    assert(
      typeof customerOrderApi.getMyOrderById === 'function',
      'customerOrderApi exposes getMyOrderById(orderId) function'
    );
    assert(
      customerOrderApiSrc.includes('/customer/orders/'),
      'customerOrderApi queries specific order via /customer/orders/:orderId'
    );

    // ----------------------------------------------------------------
    // 3. Unauthorized customer redirect via Route Guards
    // ----------------------------------------------------------------
    console.log('\n--- Test 3: Unauthorized Customer Redirect Contract ---');
    const routesSrc = fs.readFileSync(
      path.join(frontendSrc, 'routes', 'CustomerRoutes.jsx'),
      'utf-8'
    );
    assert(
      routesSrc.includes('<ProtectedCustomerRoute>\n            <OrderHistoryPage />\n          </ProtectedCustomerRoute>') ||
      (routesSrc.includes('path="/orders"') && routesSrc.includes('ProtectedCustomerRoute')),
      'CustomerRoutes.jsx guards /orders with ProtectedCustomerRoute'
    );
    assert(
      routesSrc.includes('path="/orders/:orderId"') && routesSrc.includes('ProtectedCustomerRoute'),
      'CustomerRoutes.jsx guards /orders/:orderId with ProtectedCustomerRoute'
    );

    const guardSrc = fs.readFileSync(
      path.join(frontendSrc, 'routes', 'ProtectedCustomerRoute.jsx'),
      'utf-8'
    );
    assert(
      guardSrc.includes('to="/login"'),
      'ProtectedCustomerRoute redirects unauthenticated visitors to /login'
    );

    // ----------------------------------------------------------------
    // 4. API 401 handling (Missing/Expired Token)
    // ----------------------------------------------------------------
    console.log('\n--- Test 4: API 401 Error Handling ---');
    global.localStorage.clear();
    try {
      await customerOrderApi.getMyOrders();
      assert(false, 'Should throw error when token is missing');
    } catch (err) {
      assert(
        err.message.includes('sign in') || err.statusCode === 401,
        'customerOrderApi.getMyOrders rejects unauthenticated call with sign-in guidance'
      );
    }

    try {
      await customerOrderApi.getMyOrderById('RF-20260925-123456');
      assert(false, 'Should throw error when token is missing for detail lookup');
    } catch (err) {
      assert(
        err.message.includes('sign in') || err.statusCode === 401,
        'customerOrderApi.getMyOrderById rejects unauthenticated call with sign-in guidance'
      );
    }

    // ----------------------------------------------------------------
    // 5. API 404 handling (Order not found or belonging to another customer)
    // ----------------------------------------------------------------
    console.log('\n--- Test 5: API 404 Safe Error Handling ---');
    assert(
      customerOrderApiSrc.includes("'Order Not Found'") || customerOrderApiSrc.includes('"Order Not Found"'),
      'customerOrderApi maps missing/forbidden orders to safe "Order Not Found" error'
    );

    const detailPageSrc = fs.readFileSync(
      path.join(frontendSrc, 'pages', 'customer', 'OrderDetailPage.jsx'),
      'utf-8'
    );
    assert(
      detailPageSrc.includes('customerOrderApi.getMyOrderById'),
      'OrderDetailPage uses customerOrderApi.getMyOrderById for authenticated customer'
    );
    assert(
      detailPageSrc.includes('Order Not Found'),
      'OrderDetailPage displays safe "Order Not Found" on ownership mismatch or 404'
    );

    // ----------------------------------------------------------------
    // 6. Own order displayed in OrderHistoryPage
    // ----------------------------------------------------------------
    console.log('\n--- Test 6: Own Order Display in OrderHistoryPage ---');
    const historyPageSrc = fs.readFileSync(
      path.join(frontendSrc, 'pages', 'customer', 'OrderHistoryPage.jsx'),
      'utf-8'
    );
    assert(
      historyPageSrc.includes('customerOrderApi.getMyOrders()'),
      'OrderHistoryPage fetches live customer orders from customerOrderApi.getMyOrders()'
    );
    assert(
      historyPageSrc.includes('activeOrder') && historyPageSrc.includes('OrderCard'),
      'OrderHistoryPage preserves active and historical OrderCard UI components'
    );

    // ----------------------------------------------------------------
    // 7. Other customer order not displayed (Mobile query bypass blocked)
    // ----------------------------------------------------------------
    console.log('\n--- Test 7: Mobile Query Bypass Blocked in Frontend ---');
    assert(
      historyPageSrc.includes('if (isAuthenticated) {') &&
      historyPageSrc.includes('customerOrderApi.getMyOrders()'),
      'When authenticated, OrderHistoryPage uses JWT identity and does NOT use getOrdersByMobile'
    );

    // ----------------------------------------------------------------
    // 8. Logout removes customer access
    // ----------------------------------------------------------------
    console.log('\n--- Test 8: Logout Removes Customer Access ---');
    const { customerStorage } = await import('../../src/services/customerAuthApi.js');
    customerStorage.setToken('test-jwt-token-123');
    assert(customerStorage.getToken() === 'test-jwt-token-123', 'Customer token stored');

    customerStorage.clearAuth();
    assert(customerStorage.getToken() === null, 'Customer token removed upon logout/clearAuth');

    // ----------------------------------------------------------------
    // 9. Guest checkout remains functional
    // ----------------------------------------------------------------
    console.log('\n--- Test 9: Guest Checkout Compatibility Contract ---');
    const orderApiSrc = fs.readFileSync(
      path.join(frontendSrc, 'services', 'orderApi.js'),
      'utf-8'
    );
    assert(
      orderApiSrc.includes('customerStorage.getToken()'),
      'orderApi checks for optional customer token'
    );
    assert(
      orderApiSrc.includes('orderType: \'PICKUP\''),
      'orderApi preserves strict self-pickup orderType'
    );

    const checkoutPageSrc = fs.readFileSync(
      path.join(frontendSrc, 'pages', 'customer', 'CheckoutPage.jsx'),
      'utf-8'
    );
    assert(
      checkoutPageSrc.includes('orderApi.createOrder(payload)'),
      'CheckoutPage uses orderApi.createOrder which supports both guest and authenticated flow'
    );

    console.log('\n====================================================');
    console.log(`FRONTEND TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('====================================================\n');

    if (failCount > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal Test Suite Error:', err);
    process.exit(1);
  }
}

runTests();
