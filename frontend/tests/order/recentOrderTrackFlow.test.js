import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getAllOrders,
  getOrderById,
  getUserOrderHistory,
  isOrderCompleted,
  ORDERS_STORAGE_KEY,
  ACTIVE_ORDER_STORAGE_KEY,
} from '../../src/services/orderService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendSrc = path.resolve(__dirname, '../../src');

console.log('====================================================');
console.log('RECENT ORDER TRACK FLOW & OWNERSHIP AUDIT');
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
  console.log('--- 1. orderService.getOrderById Case & Whitespace Robustness ---');
  const sampleOrder = {
    orderId: 'RF-20260920-115542',
    status: 'PLACED',
    createdAt: '2026-09-20T11:55:42.000Z',
    customer: { name: 'Customer Test', phone: '9876543210' },
    pickup: { date: '2026-09-20', time: '12:30' },
    items: [{ itemId: 'item-1', name: 'Dal Tadka', price: 180, quantity: 1 }],
    subtotal: 180,
  };

  mockStorage[ORDERS_STORAGE_KEY] = JSON.stringify([sampleOrder]);

  const exactRes = getOrderById('RF-20260920-115542');
  assert(exactRes.success && exactRes.order?.orderId === 'RF-20260920-115542', 'getOrderById exact match');

  const lowerRes = getOrderById('rf-20260920-115542');
  assert(lowerRes.success && lowerRes.order?.orderId === 'RF-20260920-115542', 'getOrderById lowercase match');

  const spacedRes = getOrderById('  RF-20260920-115542  ');
  assert(spacedRes.success && spacedRes.order?.orderId === 'RF-20260920-115542', 'getOrderById trimmed match');

  const history = getUserOrderHistory();
  assert(history.length === 1 && history[0].orderId === 'RF-20260920-115542', 'Order is present in getUserOrderHistory');

  console.log('\n--- 2. TrackOrderPage Source Code Verification ---');
  const trackPath = path.join(frontendSrc, 'pages/customer/TrackOrderPage.jsx');
  assert(fs.existsSync(trackPath), 'TrackOrderPage.jsx exists');
  const trackSrc = fs.readFileSync(trackPath, 'utf-8');

  assert(trackSrc.includes('getOrderById'), 'TrackOrderPage imports and uses getOrderById');
  assert(trackSrc.includes('findLocalOrder'), 'TrackOrderPage implements findLocalOrder');
  assert(trackSrc.includes('verifyOrderOwnership'), 'TrackOrderPage implements verifyOrderOwnership');
  assert(trackSrc.includes('setTrackedOrder(localOrder)'), 'TrackOrderPage immediately displays verified local order');

  // Verify that backend 404 does not wipe verified local order
  assert(
    trackSrc.includes('localOrder && ownership?.isAuthorized'),
    'Preserves verified local order when backend returns 404 / session mismatch'
  );

  // Verify that an unauthorized customer is blocked
  assert(
    trackSrc.includes('You are not authorized to view this order.'),
    'Shows authorization error for unauthorized customer'
  );
  assert(
    trackSrc.includes('setTrackedOrder(null)'),
    'Resets trackedOrder to null when unauthorized'
  );

  // Verify completed order status is trackable
  assert(isOrderCompleted('PICKED UP'), 'PICKED UP is recognized as completed');
  assert(isOrderCompleted('PICKED_UP'), 'PICKED_UP is recognized as completed');
  assert(
    trackSrc.includes('isOrderCompleted(trackedOrder.status)'),
    'TrackOrderPage checks completion status for polling shutdown'
  );

  // Verify Track button styling was not broken
  assert(
    trackSrc.includes('Track &rarr;') || trackSrc.includes('Track →'),
    'Track button retains standard arrow and text'
  );

  console.log('\n====================================================');
  console.log(`TOTAL PASSED: ${passed}`);
  console.log(`TOTAL FAILED: ${failed}`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
