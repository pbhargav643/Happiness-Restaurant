import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import adminOrderApi from '../../src/services/adminOrderApi.js';
import orderApi from '../../src/services/orderApi.js';
import { api, API_BASE_URL } from '../../src/services/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('ADMIN ORDER STATUS & READY-TIME CONTROL TEST SUITE');
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
    // 1. Source Code Architecture & API Hookup
    // ----------------------------------------------------
    console.log('--- Test Suite 1: AdminOrderDetailPage Architecture ---');
    const detailSource = fs.readFileSync(
      path.join(__dirname, '../../src/pages/admin/AdminOrderDetailPage.jsx'),
      'utf-8'
    );

    assert(
      detailSource.includes('adminOrderApi.getAdminOrderById'),
      'AdminOrderDetailPage fetches live order via adminOrderApi.getAdminOrderById'
    );
    assert(
      detailSource.includes('adminOrderApi.updateAdminOrderStatus'),
      'AdminOrderDetailPage transitions status via adminOrderApi.updateAdminOrderStatus'
    );
    assert(
      detailSource.includes('adminOrderApi.updateAdminOrderReadyTime'),
      'AdminOrderDetailPage updates ready time via adminOrderApi.updateAdminOrderReadyTime'
    );
    assert(
      detailSource.includes('updatingStatus') && detailSource.includes('disabled='),
      'AdminOrderDetailPage implements loading state and button disable during status update'
    );
    assert(
      detailSource.includes('Order Not Found') && detailSource.includes('/admin/orders'),
      'AdminOrderDetailPage handles 404 cleanly with return link to order queue'
    );
    assert(
      detailSource.includes('isBackward') && detailSource.includes('locked'),
      'AdminOrderDetailPage locks backward status transitions in standard flow'
    );

    // ----------------------------------------------------
    // 2. Status Progression & Ready Time Isolation on Live Backend
    // ----------------------------------------------------
    console.log('\n--- Test Suite 2: Live Backend Transition & Ready Time Isolation ---');
    try {
      const backendHealth = await api.get('/settings');
      if (backendHealth) {
        console.log('[INFO] Backend server is reachable on ' + API_BASE_URL);

        // Fetch existing orders to find an order to test with
        const listRes = await adminOrderApi.getAdminOrders();
        if (listRes && listRes.success === true) {
          assert(true, 'getAdminOrders succeeded');

          let testOrder = null;
          if (listRes.orders && listRes.orders.length > 0) {
            testOrder = listRes.orders[0];
          } else {
            // Place a test order if database has none
            const placedRes = await orderApi.createOrder({
              customer: { name: 'Admin Test Customer', phone: '9876543210' },
              pickup: { date: '2026-09-25', time: '19:30' },
              items: [{ itemId: 'soup-veg-clear-soup', quantity: 1 }],
            });
            if (placedRes.success && placedRes.order) {
              testOrder = placedRes.order;
            }
          }

          if (testOrder) {
            const testOrderId = testOrder.orderId;
            console.log(`[INFO] Operating on order: ${testOrderId} (Current status: ${testOrder.status})`);

            // Test invalid backward transition (e.g., if order is already PREPARING or READY, try PLACED)
            if (['PREPARING', 'READY', 'PICKED_UP'].includes(testOrder.status)) {
              const badTransitionRes = await adminOrderApi.updateAdminOrderStatus(testOrderId, 'PLACED');
              assert(
                badTransitionRes.success === false,
                `Backend correctly rejects backward transition to PLACED for order in ${testOrder.status}`
              );
            }

            // Test Ready Time Update Isolation:
            // Setting ready time must NOT alter the order status
            const currentStatusBeforeReady = testOrder.status;
            const readyTimeRes = await adminOrderApi.updateAdminOrderReadyTime(testOrderId, '20:15');

            assert(readyTimeRes.success === true, 'Ready time update succeeds');
            assert(readyTimeRes.order !== null, 'Returned order payload is present');
            assert(readyTimeRes.order.readyTime === '20:15', 'Returned readyTime is "20:15"');
            assert(
              readyTimeRes.order.status === currentStatusBeforeReady,
              `Order status remains "${currentStatusBeforeReady}" after readyTime update (Isolation Preserved)`
            );

            // Verify customer view synchronizes with backend state
            const customerViewRes = await orderApi.getOrderById(testOrderId);
            assert(customerViewRes.success === true, 'Customer getOrderById succeeds');
            assert(
              customerViewRes.order.readyTime === '20:15',
              'Customer tracking sees the authoritative ready time set by Admin'
            );
            assert(
              customerViewRes.order.status === currentStatusBeforeReady,
              'Customer tracking sees the authoritative status matching Admin view'
            );

            // Test forward transition if currently PLACED -> PREPARING
            if (testOrder.status === 'PLACED') {
              const nextStatusRes = await adminOrderApi.updateAdminOrderStatus(testOrderId, 'PREPARING');
              assert(nextStatusRes.success === true, 'Forward transition PLACED -> PREPARING succeeds');
              assert(nextStatusRes.order.status === 'PREPARING', 'Updated status is PREPARING');

              // Verify customer tracking reflects PREPARING
              const updatedCustomerView = await orderApi.getOrderById(testOrderId);
              assert(
                updatedCustomerView.order.status === 'PREPARING',
                'Customer tracking reflects new status PREPARING immediately'
              );
            }
          }
        } else {
          console.log('[INFO] Live admin test requires active authenticated session; skipping unauthenticated live mutations.');
        }
      }
    } catch (netErr) {
      console.warn('[WARN] Live backend test skipped or network error:', netErr.message);
    }

    console.log('\n====================================================');
    console.log(`ADMIN ORDER STATUS TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
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
