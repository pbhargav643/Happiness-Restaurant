import adminOrderApi from '../../src/services/adminOrderApi.js';
import { api, API_BASE_URL } from '../../src/services/api.js';

console.log('====================================================');
console.log('ADMIN ORDER API SERVICE AUTOMATED TEST SUITE');
console.log('====================================================\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

async function runTests() {
  try {
    // ----------------------------------------------------
    // 1. Service Definition & Methods
    // ----------------------------------------------------
    console.log('--- Test Suite 1: Admin Order API Service Structure ---');
    assert(typeof adminOrderApi.getAdminOrders === 'function', 'adminOrderApi.getAdminOrders is a function');
    assert(typeof adminOrderApi.getAdminOrderById === 'function', 'adminOrderApi.getAdminOrderById is a function');
    assert(typeof adminOrderApi.updateAdminOrderStatus === 'function', 'adminOrderApi.updateAdminOrderStatus is a function');
    assert(typeof adminOrderApi.updateAdminOrderReadyTime === 'function', 'adminOrderApi.updateAdminOrderReadyTime is a function');

    // ----------------------------------------------------
    // 2. Pre-Validation & Parameter Guards
    // ----------------------------------------------------
    console.log('\n--- Test Suite 2: Client-Side Input Guards ---');

    // getAdminOrderById invalid arguments
    const emptyIdRes = await adminOrderApi.getAdminOrderById('');
    assert(emptyIdRes.success === false && emptyIdRes.order === null, 'getAdminOrderById rejects empty ID');

    // updateAdminOrderStatus invalid arguments
    const emptyStatusRes = await adminOrderApi.updateAdminOrderStatus('ORD-1', '');
    assert(emptyStatusRes.success === false, 'updateAdminOrderStatus rejects empty status');

    const invalidStatusRes = await adminOrderApi.updateAdminOrderStatus('ORD-1', 'COMPLETED_MOCK_STATUS');
    assert(invalidStatusRes.success === false && invalidStatusRes.error.includes('Invalid status'), 'updateAdminOrderStatus rejects invalid status enum');

    // updateAdminOrderReadyTime format validation
    const invalidTimeRes = await adminOrderApi.updateAdminOrderReadyTime('ORD-1', 'invalid-time-format-12345');
    assert(invalidTimeRes.success === false && invalidTimeRes.error.includes('Invalid ready time format'), 'updateAdminOrderReadyTime rejects malformed time');

    const emptyOrderIdReadyRes = await adminOrderApi.updateAdminOrderReadyTime('', '20:15');
    assert(emptyOrderIdReadyRes.success === false, 'updateAdminOrderReadyTime rejects empty orderId');

    // ----------------------------------------------------
    // 3. Live Backend Endpoints Interaction
    // ----------------------------------------------------
    console.log('\n--- Test Suite 3: Live Backend API Operations ---');
    try {
      const backendHealth = await api.get('/settings');
      if (backendHealth) {
        console.log('[INFO] Backend server is reachable on ' + API_BASE_URL);

        // Test GET /api/admin/orders
        const listRes = await adminOrderApi.getAdminOrders();
        if (listRes && listRes.success) {
          assert(listRes.success === true, 'GET /api/admin/orders returns success: true');
          assert(Array.isArray(listRes.orders), 'GET /api/admin/orders returns orders array');

          if (listRes.orders.length > 0) {
            const sample = listRes.orders[0];
            assert(typeof sample.orderId === 'string', 'Order has valid orderId string');
            assert(sample.orderType === 'PICKUP', 'Order type is strictly PICKUP');
            assert(['PLACED', 'PREPARING', 'READY', 'PICKED_UP', 'PICKED UP'].includes(sample.status), 'Order has valid status');
            assert(sample.customer && typeof sample.customer.name === 'string', 'Order includes customer name');

            // Test GET /api/admin/orders/:orderId
            const singleRes = await adminOrderApi.getAdminOrderById(sample.orderId);
            assert(singleRes.success === true, `GET /api/admin/orders/${sample.orderId} succeeds`);
            assert(singleRes.order !== null && singleRes.order.orderId === sample.orderId, 'Order details match requested ID');
            assert(Array.isArray(singleRes.order.items), 'Order details include items list');
          }
        } else {
          console.log('[INFO] Live Admin orders test skipped (requires authenticated admin session)');
          assert(listRes.orders === null || Array.isArray(listRes.orders), 'GET /api/admin/orders handles unauthenticated session safely');
        }

        // Test GET with non-existent order ID (404)
        const notFoundRes = await adminOrderApi.getAdminOrderById('RF-99999999-NOTFOUND');
        assert(notFoundRes.success === false, 'Non-existent order returns success: false');
        assert(notFoundRes.order === null, 'Non-existent order returns null order');
        assert(typeof notFoundRes.error === 'string', 'Non-existent order returns friendly error message');
      }
    } catch (netErr) {
      console.warn('[WARN] Live backend test skipped or network error:', netErr.message);
    }

    console.log('\n====================================================');
    console.log(`ADMIN ORDER API TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('[UNHANDLED TEST ERROR]:', err);
    process.exit(1);
  }
}

runTests();
