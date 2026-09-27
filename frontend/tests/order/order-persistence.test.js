import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  ORDERS_STORAGE_KEY,
  ACTIVE_ORDER_STORAGE_KEY,
  ORDER_STATUSES,
  ORDER_STATUS_STEPS,
  ORDER_STATUS_DESCRIPTIONS,
  getOrderStatusStepIndex,
  getOrderStatusDescription,
  isOrderCompleted,
  getAllOrders,
  getOrderById,
  getActiveOrder,
  createOrder,
} from '../../src/services/orderService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('CUSTOMER ORDER PERSISTENCE & INTEGRATION TEST SUITE');
console.log('====================================================\n');

// Mock localStorage for Node environment
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

// 1. COMPLETE ORDER DATA FLOW & PERSISTENCE
console.log('--- 1. COMPLETE ORDER DATA FLOW ---');
localStorage.clear();

const initialPayload = {
  customer: {
    name: 'Vikram Mehta',
    phone: '9811223344',
    email: 'vikram@example.com',
  },
  pickup: {
    date: '2026-09-18',
    time: '19:45',
  },
  items: [
    { itemId: 'starter-veg-manchurian', quantity: 2, unitPrice: 130 },
    { itemId: 'soup-cream-of-tomato-soup', quantity: 1, unitPrice: 120 },
  ],
};

const creation = createOrder(initialPayload);
assert(creation.success === true, 'Order created successfully from checkout flow');
const placedOrderId = creation.order.orderId;

assert(typeof placedOrderId === 'string' && placedOrderId.startsWith('RF-'), 'Order ID follows RF-YYYYMMDD-XXXXXX format');
assert(creation.order.subtotal === 380, 'Subtotal correctly computed (2x130 + 1x120 = 380)');
assert(creation.order.totalCount === 3, 'Total items count is 3');
assert(creation.order.orderType === 'PICKUP', 'Order type is strictly "PICKUP"');
assert(creation.order.status === 'PLACED', 'Initial order status is "PLACED"');
assert(creation.order.customer.phone === '9811223344', 'Customer phone normalized');
assert(creation.order.pickup.serviceMode === 'Restaurant Self-Pickup', 'Service mode is "Restaurant Self-Pickup"');

// 2. ACTIVE ORDER PERSISTENCE
console.log('\n--- 2. ACTIVE ORDER PERSISTENCE ---');
const activeOrder = getActiveOrder();
assert(activeOrder !== null, 'getActiveOrder() returns active order from restaurant_active_order');
assert(activeOrder.orderId === placedOrderId, 'Active order ID matches placed order ID');
assert(activeOrder.pickup.date === '2026-09-18', 'Active order pickup date matches');
assert(activeOrder.pickup.time === '19:45', 'Active order pickup time matches');
assert(activeOrder.subtotal === 380, 'Active order subtotal matches');
assert(activeOrder.status === 'PLACED', 'Active order status matches');

// Empty active order handling
localStorage.removeItem(ACTIVE_ORDER_STORAGE_KEY);
assert(getActiveOrder() === null, 'getActiveOrder() returns null when active order key removed (no fake order)');
// Restore active order
localStorage.setItem(ACTIVE_ORDER_STORAGE_KEY, JSON.stringify(creation.order));

// 3. ORDER HISTORY PERSISTENCE & ORDER LOOKUP
console.log('\n--- 3. ORDER HISTORY PERSISTENCE & LOOKUP ---');
const historyOrders = getAllOrders();
assert(historyOrders.length === 1, 'getAllOrders() returns placed order in history');
assert(historyOrders[0].orderId === placedOrderId, 'Order in history matches placed order');

const lookup = getOrderById(placedOrderId);
assert(lookup.success === true, 'getOrderById finds order in persistence');
assert(lookup.order.orderId === placedOrderId, 'Looked up order ID matches');
assert(lookup.order.customer.name === 'Vikram Mehta', 'Customer name intact');
assert(lookup.order.items.length === 2, 'All 2 item line items intact');
assert(lookup.order.items[0].name === 'VEG. MANCHURIAN', 'Item name hydrated correctly');
assert(lookup.order.items[1].name === 'CREAM OF TOMATO SOUP', 'Item name hydrated correctly');

// 4. DUPLICATE ORDER PROTECTION
console.log('\n--- 4. DUPLICATE ORDER PROTECTION ---');
// Simulate navigation: Confirmation -> Details -> History -> Tracking
getOrderById(placedOrderId);
getAllOrders();
getActiveOrder();
getOrderById(placedOrderId);
getAllOrders();

const afterNavOrders = getAllOrders();
assert(afterNavOrders.length === 1, 'Order count remains strictly 1 after multiple navigation reads');

// 5. ORDER HISTORY SORTING (NEWEST FIRST)
console.log('\n--- 5. ORDER HISTORY SORTING ---');
// Insert an older order and a newer order with specific timestamps
const olderOrder = {
  ...creation.order,
  orderId: 'RF-20260910-111111',
  createdAt: '2026-09-10T10:00:00.000Z',
};
const newerOrder = {
  ...creation.order,
  orderId: 'RF-20260920-999999',
  createdAt: new Date(Date.now() + 86400000).toISOString(),
};
const invalidDateOrder = {
  ...creation.order,
  orderId: 'RF-20260901-000000',
  createdAt: 'invalid-date-format',
};

// Store out-of-order in localStorage
localStorage.setItem(
  ORDERS_STORAGE_KEY,
  JSON.stringify([olderOrder, invalidDateOrder, newerOrder, creation.order])
);

const sortedOrders = getAllOrders();
assert(sortedOrders.length === 4, 'All 4 orders retrieved safely');
assert(sortedOrders[0].orderId === 'RF-20260920-999999', 'Newest order appears first');
assert(sortedOrders[sortedOrders.length - 1].orderId === 'RF-20260901-000000', 'Invalid date order handled safely at end without crash');

// 6. STATUS & TIMELINE CONSISTENCY ACROSS ALL 4 STATUSES
console.log('\n--- 6. STATUS & TIMELINE CONSISTENCY ---');
const statusesToTest = ['PLACED', 'PREPARING', 'READY', 'PICKED UP'];

statusesToTest.forEach((st) => {
  const stepIdx = getOrderStatusStepIndex(st);
  const desc = getOrderStatusDescription(st);
  const completed = isOrderCompleted(st);

  if (st === 'PLACED') {
    assert(stepIdx === 0, 'PLACED is step index 0');
    assert(desc === 'Your order has been placed.', 'PLACED description correct');
    assert(completed === false, 'PLACED is not completed');
  } else if (st === 'PREPARING') {
    assert(stepIdx === 1, 'PREPARING is step index 1');
    assert(desc === 'Your order is being prepared.', 'PREPARING description correct');
    assert(completed === false, 'PREPARING is not completed');
  } else if (st === 'READY') {
    assert(stepIdx === 2, 'READY is step index 2');
    assert(desc === 'Your parcel is ready for pickup.', 'READY description correct');
    assert(completed === false, 'READY is not completed');
  } else if (st === 'PICKED UP') {
    assert(stepIdx === 3, 'PICKED UP is step index 3');
    assert(desc === 'Your order has been completed.', 'PICKED UP description correct');
    assert(completed === true, 'PICKED UP is completed');
  }
});

// 7. INVALID & CORRUPTED DATA ERROR RESILIENCE
console.log('\n--- 7. INVALID DATA HANDLING ---');
// Empty localStorage
localStorage.clear();
assert(getAllOrders().length === 0, 'Empty storage returns empty array');
assert(getActiveOrder() === null, 'Empty storage returns null for active order');

// Missing key
localStorage.removeItem(ORDERS_STORAGE_KEY);
assert(getAllOrders().length === 0, 'Missing key returns empty array');

// Invalid JSON string
localStorage.setItem(ORDERS_STORAGE_KEY, '{not-valid-json');
assert(getAllOrders().length === 0, 'Invalid JSON string returns empty array without crash');

// Array with corrupted items (null, string, object without orderId)
localStorage.setItem(
  ORDERS_STORAGE_KEY,
  JSON.stringify([null, undefined, 'bad string', { noId: 123 }, { orderId: 'RF-20260917-888888', subtotal: 100 }])
);
const filteredCorrupted = getAllOrders();
assert(filteredCorrupted.length === 1, 'Corrupted items filtered out safely');
assert(filteredCorrupted[0].orderId === 'RF-20260917-888888', 'Valid item extracted safely');

// Lookup invalid ID
const notFoundLookup = getOrderById('RF-DOES-NOT-EXIST');
assert(notFoundLookup.success === false, 'Invalid order lookup returns success: false');
assert(notFoundLookup.order === null, 'Invalid order lookup returns order: null');

const nullLookup = getOrderById(null);
assert(nullLookup.success === false, 'Null order lookup returns success: false');

// 8. STRICT PICKUP-ONLY COMPLIANCE & ARCHITECTURE
console.log('\n--- 8. STRICT PICKUP-ONLY & NAVIGATION AUDIT ---');
const customerOrderFiles = [
  path.resolve(__dirname, '../../src/pages/customer/OrderConfirmationPage.jsx'),
  path.resolve(__dirname, '../../src/pages/customer/OrderHistoryPage.jsx'),
  path.resolve(__dirname, '../../src/pages/customer/OrderDetailPage.jsx'),
  path.resolve(__dirname, '../../src/pages/customer/TrackOrderPage.jsx'),
  path.resolve(__dirname, '../../src/components/orders/OrderStatusIndicator.jsx'),
  path.resolve(__dirname, '../../src/components/orders/ActiveOrderCard.jsx'),
  path.resolve(__dirname, '../../src/components/orders/OrderCard.jsx'),
];

const forbiddenTerms = [
  'delivery address',
  'delivery fee',
  'delivery charge',
  'delivery partner',
  'delivery option',
  'delivery status',
  'home delivery',
  'delivery tracking',
  'doorstep',
  'free delivery',
  'cash on delivery',
];

let termViolations = 0;
customerOrderFiles.forEach((filePath) => {
  if (fs.existsSync(filePath)) {
    const code = fs.readFileSync(filePath, 'utf8').toLowerCase();
    forbiddenTerms.forEach((term) => {
      const occurrences = code.split(term).length - 1;
      const allowedNegations = code.split(`no ${term}`).length - 1;
      if (occurrences > allowedNegations) {
        console.error(`[FAIL] Forbidden delivery term "${term}" in ${filePath}`);
        termViolations++;
      }
    });
  }
});
assert(termViolations === 0, 'Zero forbidden delivery terms across all customer order components');

// Verify OrderConfirmationPage navigation links
const confirmationFile = path.resolve(__dirname, '../../src/pages/customer/OrderConfirmationPage.jsx');
const confirmationCode = fs.readFileSync(confirmationFile, 'utf8');
assert(confirmationCode.includes('/orders'), 'OrderConfirmationPage links to /orders (My Orders)');
assert(confirmationCode.includes('/menu'), 'OrderConfirmationPage links to /menu (Continue Shopping)');

// 9. FILE FORMAT RULE VERIFICATION
console.log('\n--- 9. FILE FORMAT AUDIT (JS/JSX ONLY) ---');
function checkDirForInvalidExtensions(dir) {
  let invalidCount = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name.startsWith('vite.config.js.timestamp')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      invalidCount += checkDirForInvalidExtensions(fullPath);
    } else if (/\.(mjs|ts|tsx)$/i.test(entry.name)) {
      console.error(`[FAIL] Forbidden file format: ${fullPath}`);
      invalidCount++;
    }
  }
  return invalidCount;
}

const rootDir = path.resolve(__dirname, '../../');
const invalidFiles = checkDirForInvalidExtensions(rootDir);
assert(invalidFiles === 0, `Zero .mjs, .ts, or .tsx files in project (found: ${invalidFiles})`);

// SUMMARY
console.log('\n====================================================');
console.log(`TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log('====================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
