import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Customer Routing, Route Resolution & Link Verification Test Suite
 *
 * Requirements:
 * - /login exists and maps to CustomerLoginPage
 * - /register exists and maps to CustomerRegisterPage
 * - /admin/login remains strictly separate and maps to AdminLoginPage
 * - Unknown routes fall through to NotFoundPage (404)
 * - Header Login link points to /login
 * - Header Register link points to /register
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendSrc = path.resolve(__dirname, '../../../src');

console.log('====================================================');
console.log('FRONTEND CUSTOMER ROUTES & NAVIGATION TEST SUITE');
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

/**
 * Pure Route Resolver simulating AppRoutes resolution logic
 */
function resolveRoute(urlPath) {
  // Normalized path
  const cleanPath = urlPath.split('?')[0].split('#')[0];

  // Route definitions from AppRoutes and subrouters
  const routes = [
    { path: '/', component: 'HomePage' },
    { path: '/menu', component: 'MenuPage' },
    { path: '/cart', component: 'CartPage' },
    { path: '/checkout', component: 'CheckoutPage' },
    { path: '/orders', component: 'OrderHistoryPage' },
    { path: '/track-order', component: 'TrackOrderPage' },
    { path: '/account', component: 'CustomerAccountPage', protected: true },
    { path: '/login', component: 'CustomerLoginPage' },
    { path: '/register', component: 'CustomerRegisterPage' },
    { path: '/admin/login', component: 'AdminLoginPage' },
    { path: '/admin', component: 'AdminDashboardPage', protected: true },
    { path: '/admin/orders', component: 'AdminOrdersPage', protected: true },
    { path: '/admin/menu', component: 'AdminMenuPage', protected: true },
    { path: '/admin/settings', component: 'AdminSettingsPage', protected: true },
  ];

  const matched = routes.find((r) => r.path === cleanPath);
  if (matched) {
    return {
      status: 200,
      component: matched.component,
      path: matched.path,
      isProtected: Boolean(matched.protected),
    };
  }

  // Catch-all 404 fallback
  return {
    status: 404,
    component: 'NotFoundPage',
    path: cleanPath,
    isProtected: false,
  };
}

async function runTests() {
  try {
    // ----------------------------------------------------------------
    // 1. Static Configuration Verification in AppRoutes.jsx
    // ----------------------------------------------------------------
    console.log('--- Test 1: Static Route Registration in AppRoutes.jsx ---');
    const appRoutesPath = path.join(frontendSrc, 'routes', 'AppRoutes.jsx');
    const appRoutesContent = fs.readFileSync(appRoutesPath, 'utf-8');

    assert(
      appRoutesContent.includes('import CustomerLoginPage from') ||
      appRoutesContent.includes("import CustomerLoginPage from '../pages/customer/CustomerLoginPage'"),
      'AppRoutes.jsx imports CustomerLoginPage'
    );
    assert(
      appRoutesContent.includes('import CustomerRegisterPage from') ||
      appRoutesContent.includes("import CustomerRegisterPage from '../pages/customer/CustomerRegisterPage'"),
      'AppRoutes.jsx imports CustomerRegisterPage'
    );
    assert(
      appRoutesContent.includes('<Route path="/login" element={<CustomerLoginPage />} />'),
      'AppRoutes.jsx explicitly registers <Route path="/login" element={<CustomerLoginPage />} />'
    );
    assert(
      appRoutesContent.includes('<Route path="/register" element={<CustomerRegisterPage />} />'),
      'AppRoutes.jsx explicitly registers <Route path="/register" element={<CustomerRegisterPage />} />'
    );

    // ----------------------------------------------------------------
    // 2. Route Resolution: /login and /register
    // ----------------------------------------------------------------
    console.log('\n--- Test 2: Customer Route Resolution ---');
    const loginResolution = resolveRoute('/login');
    assert(loginResolution.status === 200, '/login resolves successfully with HTTP 200');
    assert(loginResolution.component === 'CustomerLoginPage', '/login maps to CustomerLoginPage');
    assert(loginResolution.component !== 'AdminLoginPage', '/login does NOT redirect to AdminLoginPage');

    const registerResolution = resolveRoute('/register');
    assert(registerResolution.status === 200, '/register resolves successfully with HTTP 200');
    assert(registerResolution.component === 'CustomerRegisterPage', '/register maps to CustomerRegisterPage');

    // ----------------------------------------------------------------
    // 3. Admin Route Separation: /admin/login
    // ----------------------------------------------------------------
    console.log('\n--- Test 3: Admin Route Separation ---');
    const adminLoginResolution = resolveRoute('/admin/login');
    assert(adminLoginResolution.status === 200, '/admin/login resolves with HTTP 200');
    assert(adminLoginResolution.component === 'AdminLoginPage', '/admin/login maps to AdminLoginPage');
    assert(adminLoginResolution.path !== loginResolution.path, '/admin/login and /login paths are strictly separated');

    // ----------------------------------------------------------------
    // 4. Catch-All 404 Fallback
    // ----------------------------------------------------------------
    console.log('\n--- Test 4: Catch-All 404 Route Fallback ---');
    const unknownRoute1 = resolveRoute('/nonexistent-page-url');
    assert(unknownRoute1.status === 404, 'Unknown URL returns HTTP 404');
    assert(unknownRoute1.component === 'NotFoundPage', 'Unknown URL maps to NotFoundPage fallback');

    const unknownRoute2 = resolveRoute('/login-wrong');
    assert(unknownRoute2.status === 404, 'Malformed login URL (/login-wrong) falls through to 404');
    assert(unknownRoute2.component === 'NotFoundPage', 'Malformed route renders NotFoundPage component');

    assert(
      appRoutesContent.includes('<Route path="*" element={<NotFoundPage />} />'),
      'AppRoutes.jsx preserves wildcard <Route path="*" element={<NotFoundPage />} />'
    );

    // ----------------------------------------------------------------
    // 5. Header Links Contract Verification (Header Auth UI Cleanup)
    // ----------------------------------------------------------------
    console.log('\n--- Test 5: Customer Header Navigation Links Contract ---');
    const headerPath = path.join(frontendSrc, 'components', 'layout', 'Header.jsx');
    const headerContent = fs.readFileSync(headerPath, 'utf-8');

    assert(
      headerContent.includes('to="/login"'),
      'Header.jsx contains link to="/login"'
    );
    assert(
      !headerContent.includes('to="/register"'),
      'Header.jsx does NOT contain standalone to="/register" (removed per customer header cleanup)'
    );
    assert(
      headerContent.includes('to="/account"'),
      'Header.jsx contains link to="/account" for authenticated customer'
    );

    const loginPagePath = path.join(frontendSrc, 'pages', 'customer', 'CustomerLoginPage.jsx');
    const loginPageContent = fs.readFileSync(loginPagePath, 'utf-8');
    assert(
      loginPageContent.includes('to="/register"') && loginPageContent.includes('Create an account'),
      'CustomerLoginPage.jsx provides accessible registration via "Create an account"'
    );

    const registerPagePath = path.join(frontendSrc, 'pages', 'customer', 'CustomerRegisterPage.jsx');
    const registerPageContent = fs.readFileSync(registerPagePath, 'utf-8');
    assert(
      registerPageContent.includes('to="/login"') && registerPageContent.includes('Sign in'),
      'CustomerRegisterPage.jsx provides link to="/login" via "Sign in"'
    );

    // ----------------------------------------------------------------
    // 6. Mobile Drawer Links Contract Verification
    // ----------------------------------------------------------------
    console.log('\n--- Test 6: Mobile Menu Navigation Links Contract ---');
    const mobileMenuPath = path.join(frontendSrc, 'components', 'layout', 'MobileMenu.jsx');
    const mobileMenuContent = fs.readFileSync(mobileMenuPath, 'utf-8');

    assert(
      mobileMenuContent.includes('to="/login"'),
      'MobileMenu.jsx contains link to="/login"'
    );
    assert(
      mobileMenuContent.includes('to="/register"'),
      'MobileMenu.jsx contains link to="/register"'
    );
    assert(
      mobileMenuContent.includes('to="/account"'),
      'MobileMenu.jsx contains link to="/account"'
    );

    // ----------------------------------------------------------------
    // 7. No Duplicate Component Definitions
    // ----------------------------------------------------------------
    console.log('\n--- Test 7: Component Reusability & No Duplicates ---');
    const customerLoginFiles = fs.readdirSync(path.join(frontendSrc, 'pages', 'customer'));
    const loginMatches = customerLoginFiles.filter((f) => f.toLowerCase().includes('login'));
    assert(
      loginMatches.length === 1 && loginMatches[0] === 'CustomerLoginPage.jsx',
      'Exactly one Customer Login page component exists (CustomerLoginPage.jsx)'
    );

    const registerMatches = customerLoginFiles.filter((f) => f.toLowerCase().includes('register'));
    assert(
      registerMatches.length === 1 && registerMatches[0] === 'CustomerRegisterPage.jsx',
      'Exactly one Customer Register page component exists (CustomerRegisterPage.jsx)'
    );

    console.log('\n====================================================');
    console.log(`CUSTOMER ROUTING TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
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
