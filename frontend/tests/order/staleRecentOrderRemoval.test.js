import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getAllOrders,
  getOrderById,
  removeStaleLocalOrder,
  ORDERS_STORAGE_KEY,
  ACTIVE_ORDER_STORAGE_KEY,
} from '../../src/services/orderService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendSrc = path.resolve(__dirname, '../../src');

console.log('====================================================');
console.log('STALE RECENT ORDER REMOVAL & CLEANUP AUDIT');
console.log('====================================================\n');

// Mock localStorage
const mockStorage = {};
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

function runTests() {
  console.log('--- 1. removeStaleLocalOrder Selective Cleanup ---');

  // Setup multi-order fixture: Order A (stale), Order B (valid), Order C (valid)
  const orderA = {
    orderId: 'RF-20260920-115542',
    status: 'PLACED',
    createdAt: '2026-09-20T11:55:42.000Z',
    customer: { name: 'Customer Stale', phone: '9876543210' },
    items: [{ itemId: 'item-1', name: 'Dal Tadka', price: 180, quantity: 1 }],
    subtotal: 180,
  };

  const orderB = {
    orderId: 'RF-20260925-100001',
    status: 'PREPARING',
    createdAt: '2026-09-25T10:00:01.000Z',
    customer: { name: 'Customer Valid 1', phone: '9876543210' },
    items: [{ itemId: 'item-2', name: 'Paneer Butter Masala', price: 260, quantity: 1 }],
    subtotal: 260,
  };

  const orderC = {
    orderId: 'RF-20260925-100002',
    status: 'READY',
    createdAt: '2026-09-25T10:00:02.000Z',
    customer: { name: 'Customer Valid 2', phone: '9876543210' },
    items: [{ itemId: 'item-3', name: 'Butter Naan', price: 50, quantity: 2 }],
    subtotal: 100,
  };

  mockStorage[ORDERS_STORAGE_KEY] = JSON.stringify([orderA, orderB, orderC]);
  mockStorage[ACTIVE_ORDER_STORAGE_KEY] = JSON.stringify(orderA);
  mockStorage['restaurant_cart'] = JSON.stringify([{ id: 'cart-1', quantity: 2 }]);
  mockStorage['happiness_customer_token'] = 'test-token-active';

  // Perform selective pruning of Order A
  const pruneSuccess = removeStaleLocalOrder('RF-20260920-115542');
  assert(pruneSuccess === true, 'removeStaleLocalOrder returns true on success');

  // Verify Order A is gone from restaurant_orders
  const remainingOrders = getAllOrders();
  assert(remainingOrders.length === 2, 'Exactly 2 orders remain in local storage');
  assert(!remainingOrders.some((o) => o.orderId === 'RF-20260920-115542'), 'Stale Order RF-20260920-115542 removed');

  // Verify Order B and Order C are fully preserved
  assert(remainingOrders.some((o) => o.orderId === 'RF-20260925-100001'), 'Valid Order B (RF-20260925-100001) preserved');
  assert(remainingOrders.some((o) => o.orderId === 'RF-20260925-100002'), 'Valid Order C (RF-20260925-100002) preserved');

  // Verify active order reference was cleared since it matched stale order
  assert(mockStorage[ACTIVE_ORDER_STORAGE_KEY] === undefined, 'Active order cleared because it matched stale order');

  // Verify non-order data was untouched (no localStorage.clear())
  assert(mockStorage['restaurant_cart'] !== undefined, 'Cart data strictly preserved');
  assert(mockStorage['happiness_customer_token'] === 'test-token-active', 'Customer auth token strictly preserved');

  console.log('\n--- 2. TrackOrderPage Stale Order Prevention Audit ---');
  const trackPath = path.join(frontendSrc, 'pages/customer/TrackOrderPage.jsx');
  assert(fs.existsSync(trackPath), 'TrackOrderPage.jsx exists');
  const trackSrc = fs.readFileSync(trackPath, 'utf-8');

  assert(trackSrc.includes('removeStaleLocalOrder'), 'TrackOrderPage imports removeStaleLocalOrder');
  assert(trackSrc.includes("removeStaleLocalOrder('RF-20260920-115542')"), 'Purges known stale test order on initialization');
  assert(trackSrc.includes("cleanId === 'RF-20260920-115542'"), 'findLocalOrder explicitly excludes stale order ID');
  assert(trackSrc.includes('validAuthOrders'), 'Uses authenticated server orders for recent orders');
  assert(trackSrc.includes('removeStaleLocalOrder(currentTrackingId)'), 'Prunes stale orders when backend confirms 404');

  // Verify no Admin Delete API was touched
  assert(!trackSrc.includes('/api/admin/orders/'), 'Does not invoke Admin Delete API');
  assert(!trackSrc.includes('deleteOrder'), 'Does not invoke database deletion logic');

  console.log('\n====================================================');
  console.log(`TOTAL PASSED: ${passed}`);
  console.log(`TOTAL FAILED: ${failed}`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
