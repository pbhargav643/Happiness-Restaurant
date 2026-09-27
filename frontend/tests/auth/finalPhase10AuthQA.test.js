import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('FRONTEND FINAL PHASE 10 AUTHENTICATION QA TEST SUITE');
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

// Mock localStorage for Node test runner
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
  global.window = {
    localStorage: global.localStorage,
    dispatchEvent: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}

async function runTests() {
  const frontendSrc = path.join(__dirname, '..', '..', 'src');

  try {
    // ----------------------------------------------------------------
    // 1. Storage Isolation Audit (Admin vs Customer)
    // ----------------------------------------------------------------
    console.log('--- Test 1: Storage Isolation Audit ---');
    const { authStorage } = await import('../../src/services/authApi.js');
    const { customerStorage } = await import('../../src/services/customerAuthApi.js');

    authStorage.setToken('admin-jwt-999');
    authStorage.setAdmin({ id: 'admin1', name: 'Admin', role: 'ADMIN' });

    customerStorage.setToken('customer-jwt-111');
    customerStorage.setCustomer({ id: 'cust1', name: 'Customer', role: 'CUSTOMER' });

    assert(authStorage.getToken() === 'admin-jwt-999', 'Admin token stored in dedicated key');
    assert(customerStorage.getToken() === 'customer-jwt-111', 'Customer token stored in dedicated key');
    assert(authStorage.getToken() !== customerStorage.getToken(), 'Admin and Customer tokens strictly separated');

    // Customer logout does NOT clear Admin
    customerStorage.clearAuth();
    assert(customerStorage.getToken() === null, 'Customer auth cleared on customer logout');
    assert(authStorage.getToken() === 'admin-jwt-999', 'Admin token remains intact after customer logout');

    // Admin logout does NOT clear Customer
    customerStorage.setToken('customer-jwt-222');
    authStorage.clearAuth();
    assert(authStorage.getToken() === null, 'Admin auth cleared on admin logout');
    assert(customerStorage.getToken() === 'customer-jwt-222', 'Customer token remains intact after admin logout');

    // ----------------------------------------------------------------
    // 2. Sensitive Data Storage Audit (No Passwords or Secrets)
    // ----------------------------------------------------------------
    console.log('\n--- Test 2: Sensitive Data Storage Leak Check ---');
    const allStoredKeys = ['happiness_admin_token', 'happiness_admin_user', 'happiness_customer_token', 'happiness_customer_user'];
    for (const key of allStoredKeys) {
      const val = global.localStorage.getItem(key);
      if (val) {
        assert(!val.includes('passwordHash'), `${key} does NOT store passwordHash`);
        assert(!val.includes('password'), `${key} does NOT store plaintext password`);
        assert(!val.includes('JWT_SECRET'), `${key} does NOT store JWT_SECRET`);
        assert(!val.includes('mongodb'), `${key} does NOT store MongoDB connection strings`);
      }
    }

    // ----------------------------------------------------------------
    // 3. Auth Context Separation & Loading State
    // ----------------------------------------------------------------
    console.log('\n--- Test 3: Auth Context Separation & Loading State ---');
    const adminContextSrc = fs.readFileSync(path.join(frontendSrc, 'context', 'AuthContext.jsx'), 'utf-8');
    assert(adminContextSrc.includes('authStorage') && adminContextSrc.includes('getCurrentAdmin'), 'AuthContext manages Admin state via authApi');
    assert(adminContextSrc.includes('const [loading, setLoading] = useState(true)'), 'AuthContext initializes loading: true to prevent content flash');

    const custContextSrc = fs.readFileSync(path.join(frontendSrc, 'context', 'CustomerAuthContext.jsx'), 'utf-8');
    assert(custContextSrc.includes('customerStorage') && custContextSrc.includes('getCurrentCustomer'), 'CustomerAuthContext manages Customer state via customerAuthApi');
    assert(custContextSrc.includes('const [loading, setLoading] = useState(true)'), 'CustomerAuthContext initializes loading: true to prevent content flash');

    // ----------------------------------------------------------------
    // 4. Protected Route Guards & Direct URL Access
    // ----------------------------------------------------------------
    console.log('\n--- Test 4: Route Guards & Direct URL Access Protection ---');
    const adminGuardSrc = fs.readFileSync(path.join(frontendSrc, 'routes', 'ProtectedAdminRoute.jsx'), 'utf-8');
    assert(adminGuardSrc.includes('to="/admin/login"'), 'ProtectedAdminRoute redirects unauthenticated visitors to /admin/login');
    assert(adminGuardSrc.includes("admin?.role !== 'ADMIN'"), 'ProtectedAdminRoute rejects non-admin roles (e.g. Customers)');

    const custGuardSrc = fs.readFileSync(path.join(frontendSrc, 'routes', 'ProtectedCustomerRoute.jsx'), 'utf-8');
    assert(custGuardSrc.includes('to="/login"'), 'ProtectedCustomerRoute redirects unauthenticated visitors to /login');
    assert(custGuardSrc.includes("customer?.role !== 'CUSTOMER'"), 'ProtectedCustomerRoute rejects non-customer roles (e.g. Admins)');

    const custRoutesSrc = fs.readFileSync(path.join(frontendSrc, 'routes', 'CustomerRoutes.jsx'), 'utf-8');
    assert(custRoutesSrc.includes('path="/account"') && custRoutesSrc.includes('ProtectedCustomerRoute'), '/account is protected by ProtectedCustomerRoute');
    assert(custRoutesSrc.includes('path="/orders"') && custRoutesSrc.includes('ProtectedCustomerRoute'), '/orders is protected by ProtectedCustomerRoute');
    assert(custRoutesSrc.includes('path="/orders/:orderId"') && custRoutesSrc.includes('ProtectedCustomerRoute'), '/orders/:orderId is protected by ProtectedCustomerRoute');

    // ----------------------------------------------------------------
    // 5. Centralized API Client Token Routing
    // ----------------------------------------------------------------
    console.log('\n--- Test 5: Centralized API Client Role-Aware Token Routing ---');
    const apiSrc = fs.readFileSync(path.join(frontendSrc, 'services', 'api.js'), 'utf-8');
    assert(
      apiSrc.includes('isCustomerTarget') && apiSrc.includes('happiness_customer_token'),
      'api.js routes happiness_customer_token to customer target endpoints'
    );
    assert(
      apiSrc.includes('isAdminTarget') && apiSrc.includes('happiness_admin_token'),
      'api.js routes happiness_admin_token to admin target endpoints'
    );
    assert(
      apiSrc.includes('customer-session-expired') && apiSrc.includes('admin-session-expired'),
      'api.js differentiates 401 session expiration between customer and admin'
    );

    // ----------------------------------------------------------------
    // 6. Customer Order Ownership on Frontend
    // ----------------------------------------------------------------
    console.log('\n--- Test 6: Customer Order Ownership Frontend Contract ---');
    const historyPageSrc = fs.readFileSync(path.join(frontendSrc, 'pages', 'customer', 'OrderHistoryPage.jsx'), 'utf-8');
    assert(
      historyPageSrc.includes('customerOrderApi.getMyOrders()'),
      'OrderHistoryPage uses customerOrderApi.getMyOrders() as authority when authenticated'
    );

    const detailPageSrc = fs.readFileSync(path.join(frontendSrc, 'pages', 'customer', 'OrderDetailPage.jsx'), 'utf-8');
    assert(
      detailPageSrc.includes('customerOrderApi.getMyOrderById(orderId)'),
      'OrderDetailPage uses customerOrderApi.getMyOrderById(orderId) for authenticated lookup'
    );

    const trackPageSrc = fs.readFileSync(path.join(frontendSrc, 'pages', 'customer', 'TrackOrderPage.jsx'), 'utf-8');
    assert(
      trackPageSrc.includes('customerOrderApi.getMyOrderById(currentTrackingId)'),
      'TrackOrderPage uses customerOrderApi.getMyOrderById when authenticated'
    );

    // ----------------------------------------------------------------
    // 7. Guest Checkout Compatibility
    // ----------------------------------------------------------------
    console.log('\n--- Test 7: Guest Checkout Compatibility ---');
    const orderApiSrc = fs.readFileSync(path.join(frontendSrc, 'services', 'orderApi.js'), 'utf-8');
    assert(
      orderApiSrc.includes('orderType: \'PICKUP\''),
      'orderApi strictly enforces PICKUP orderType'
    );
    assert(
      orderApiSrc.includes('customerToken = customerStorage.getToken()'),
      'orderApi optionally attaches customer token without blocking guest orders'
    );

    console.log('\n====================================================');
    console.log(`FRONTEND FINAL QA RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
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
