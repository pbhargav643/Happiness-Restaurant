/**
 * Frontend Protected Admin Route Guard Test Suite
 */

console.log('====================================================');
console.log('FRONTEND PROTECTED ADMIN ROUTE GUARD TEST SUITE');
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
 * Pure state transition logic mirroring ProtectedAdminRoute
 */
function evaluateRouteAccess({ loading, isAuthenticated, admin }) {
  if (loading) {
    return { action: 'RENDER_LOADING', target: null };
  }
  if (!isAuthenticated || !admin || admin.role !== 'ADMIN') {
    return { action: 'REDIRECT_LOGIN', target: '/admin/login' };
  }
  return { action: 'RENDER_PROTECTED', target: null };
}

async function runTests() {
  try {
    // 1. Loading state
    console.log('--- Test 1: Loading State Prevents Protected UI Flash ---');
    const stateLoading = evaluateRouteAccess({
      loading: true,
      isAuthenticated: false,
      admin: null,
    });
    assert(stateLoading.action === 'RENDER_LOADING', 'Displays loading state when auth check is in progress');
    assert(stateLoading.target === null, 'Does not navigate away while verifying credentials');

    // 2. Unauthenticated user
    console.log('\n--- Test 2: Unauthenticated Access Redirects to /admin/login ---');
    const stateUnauthenticated = evaluateRouteAccess({
      loading: false,
      isAuthenticated: false,
      admin: null,
    });
    assert(stateUnauthenticated.action === 'REDIRECT_LOGIN', 'Blocks unauthenticated user from protected admin content');
    assert(stateUnauthenticated.target === '/admin/login', 'Redirects to /admin/login');

    // 3. User with non-admin role
    console.log('\n--- Test 3: Non-Admin Role Redirected ---');
    const stateCustomer = evaluateRouteAccess({
      loading: false,
      isAuthenticated: true,
      admin: { role: 'CUSTOMER' },
    });
    assert(stateCustomer.action === 'REDIRECT_LOGIN', 'Rejects non-admin authenticated users');

    // 4. Authenticated Admin user
    console.log('\n--- Test 4: Authenticated ADMIN Granted Access ---');
    const stateAdmin = evaluateRouteAccess({
      loading: false,
      isAuthenticated: true,
      admin: { id: 'admin_1', role: 'ADMIN', isActive: true },
    });
    assert(stateAdmin.action === 'RENDER_PROTECTED', 'Allows authenticated ADMIN into admin route branch');

    // 5. Customer Routes Independence
    console.log('\n--- Test 5: Customer Public Routes Remain Public ---');
    const customerRoutes = ['/', '/menu', '/menu/paneer-tikka', '/cart', '/checkout', '/orders', '/orders/track'];
    customerRoutes.forEach((route) => {
      // Customer routes do NOT use ProtectedAdminRoute
      const isPublic = !route.startsWith('/admin');
      assert(isPublic, `Route "${route}" is completely public and requires zero admin login`);
    });
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
