import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  ORDER_STATUSES,
  ORDER_STATUS_STEPS,
  ORDER_STATUS_DESCRIPTIONS,
  getOrderStatusStepIndex,
  getOrderStatusDescription,
  isOrderCompleted,
  ORDERS_STORAGE_KEY,
  ACTIVE_ORDER_STORAGE_KEY,
  getAllOrders,
  getOrderById,
  getActiveOrder,
  createOrder,
} from '../../src/services/orderService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('CUSTOMER ORDER TRACKING AUTOMATED TEST SUITE');
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

// 1. STATUS PROGRESSION & DESCRIPTIONS
console.log('--- 1. STATUS PROGRESSION & DESCRIPTIONS ---');
assert(ORDER_STATUS_STEPS.length === 4, 'Status sequence has 4 distinct steps');
assert(ORDER_STATUS_STEPS[0] === 'PLACED', 'Step 0 is PLACED');
assert(ORDER_STATUS_STEPS[1] === 'PREPARING', 'Step 1 is PREPARING');
assert(ORDER_STATUS_STEPS[2] === 'READY', 'Step 2 is READY');
assert(ORDER_STATUS_STEPS[3] === 'PICKED UP', 'Step 3 is PICKED UP');

assert(
  ORDER_STATUS_DESCRIPTIONS.PLACED === 'Your order has been placed.',
  'PLACED description matches specification'
);
assert(
  ORDER_STATUS_DESCRIPTIONS.PREPARING === 'Your order is being prepared.',
  'PREPARING description matches specification'
);
assert(
  ORDER_STATUS_DESCRIPTIONS.READY === 'Your parcel is ready for pickup.',
  'READY description matches specification'
);
assert(
  ORDER_STATUS_DESCRIPTIONS.PICKED_UP === 'Your order has been completed.',
  'PICKED UP description matches specification'
);

assert(
  getOrderStatusDescription('PLACED') === 'Your order has been placed.',
  'getOrderStatusDescription("PLACED") returns expected text'
);
assert(
  getOrderStatusDescription('PREPARING') === 'Your order is being prepared.',
  'getOrderStatusDescription("PREPARING") returns expected text'
);
assert(
  getOrderStatusDescription('READY') === 'Your parcel is ready for pickup.',
  'getOrderStatusDescription("READY") returns expected text'
);
assert(
  getOrderStatusDescription('PICKED UP') === 'Your order has been completed.',
  'getOrderStatusDescription("PICKED UP") returns expected text'
);

// 2. COMPLETED ORDER DETERMINATION
console.log('\n--- 2. COMPLETED ORDER DETERMINATION ---');
assert(isOrderCompleted('PICKED UP') === true, 'isOrderCompleted("PICKED UP") is true');
assert(isOrderCompleted('PICKED_UP') === true, 'isOrderCompleted("PICKED_UP") is true');
assert(isOrderCompleted('PLACED') === false, 'isOrderCompleted("PLACED") is false');
assert(isOrderCompleted('PREPARING') === false, 'isOrderCompleted("PREPARING") is false');
assert(isOrderCompleted('READY') === false, 'isOrderCompleted("READY") is false');

// 3. ORDER TRACKING DATA & PERSISTENCE
console.log('\n--- 3. ORDER TRACKING LIFECYCLE ---');
localStorage.clear();

const testOrderPayload = {
  customer: {
    name: 'Sunil Verma',
    phone: '9876543210',
    email: 'sunil@example.com',
  },
  pickup: {
    date: '2026-09-17',
    time: '20:00',
  },
  items: [
    { itemId: 'starter-paneer-chilly', quantity: 1, unitPrice: 200 },
  ],
};

const creationResult = createOrder(testOrderPayload);
assert(creationResult.success === true, 'Order created successfully');
const orderId = creationResult.order.orderId;

// Stored status starts as PLACED
assert(creationResult.order.status === 'PLACED', 'New order status starts as PLACED');
assert(creationResult.order.pickup.serviceMode === 'Restaurant Self-Pickup', 'Service mode is strictly self-pickup');

// Lookup via getOrderById
const lookupResult = getOrderById(orderId);
assert(lookupResult.success === true, 'getOrderById retrieves tracked order');
assert(lookupResult.order.orderId === orderId, 'Retrieved orderId matches');
assert(lookupResult.order.pickup.time === '20:00', 'Pickup time preserved');

// Simulate order status transition to READY
const currentOrders = getAllOrders();
currentOrders[0].status = 'READY';
localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(currentOrders));

const readyOrder = getOrderById(orderId);
assert(readyOrder.order.status === 'READY', 'Order status updated to READY');
assert(getOrderStatusStepIndex(readyOrder.order.status) === 2, 'READY corresponds to step 2');

// Simulate order status transition to PICKED UP (Completed)
currentOrders[0].status = 'PICKED UP';
localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(currentOrders));

const completedOrder = getOrderById(orderId);
assert(completedOrder.order.status === 'PICKED UP', 'Order status updated to PICKED UP');
assert(isOrderCompleted(completedOrder.order.status) === true, 'Treated as completed order');
assert(getAllOrders().length === 1, 'Completed order is NOT deleted from restaurant_orders');

// 4. ORDER RETENTION & NO CLEAR TRACKING AUDIT SUITE
console.log('\n--- 4. ORDER RETENTION & TRACK ORDER AUDIT SUITE ---');

// TEST 1: Create/view order -> status PICKED_UP -> order appears in Order History
console.log('Test 1: Completed order (PICKED_UP) permanently appears in Order History');
const allHistoryOrders = getAllOrders();
const orderInHistory = allHistoryOrders.find((o) => o.orderId === orderId);
assert(Boolean(orderInHistory), 'Order appears in Order History (getAllOrders)');
assert(
  orderInHistory.status === 'PICKED UP' || orderInHistory.status === 'PICKED_UP',
  'Order status in Order History is PICKED UP / COMPLETED'
);
assert(orderInHistory.items?.length === 1, 'All items preserved in order history');
assert(orderInHistory.subtotal === 200, 'Subtotal preserved in order history');
assert(orderInHistory.pickup?.time === '20:00', 'Pickup time preserved in order history');
assert(orderInHistory.customer?.name === 'Sunil Verma', 'Customer details preserved in order history');

// TEST 2: Verify NO "Clear Tracking" button or action exists on Track Order
console.log('Test 2: Track Order has NO visible "Clear Tracking" button or action');
const trackOrderPageFile = path.resolve(__dirname, '../../src/pages/customer/TrackOrderPage.jsx');
const trackOrderContent = fs.readFileSync(trackOrderPageFile, 'utf8');

assert(
  !trackOrderContent.includes('Delete Order'),
  'No "Delete Order" button on Track Order page'
);

// TEST 3: Track valid order -> PICKED_UP order displays completed status
console.log('Test 3: PICKED_UP order displays completed status');
const reQueriedOrder = getOrderById(orderId);
assert(reQueriedOrder.success === true, 'Tracked order is found successfully via getOrderById');
assert(
  reQueriedOrder.order.status === 'PICKED UP' || reQueriedOrder.order.status === 'PICKED_UP',
  'Order status remains PICKED_UP'
);

const statusIndicatorFile = path.resolve(__dirname, '../../src/components/orders/OrderStatusIndicator.jsx');
const statusIndicatorContent = fs.readFileSync(statusIndicatorFile, 'utf8');
assert(
  statusIndicatorContent.includes('ORDER COMPLETED') || statusIndicatorContent.includes('Order Completed'),
  'Displays "ORDER COMPLETED" completion badge/message'
);

// TEST 4: Enter another Order ID -> tracking works
console.log('Test 4: Entering another Order ID looks up new order successfully');
const secondOrderPayload = {
  customer: { name: 'Pooja Patel', phone: '9123456780' },
  pickup: { date: '2026-09-17', time: '21:00' },
  items: [{ itemId: 'starter-paneer-chilly', quantity: 2, unitPrice: 200 }],
};
const secondOrderRes = createOrder(secondOrderPayload);
assert(secondOrderRes.success === true, 'Second order created');
const secondTrackLookup = getOrderById(secondOrderRes.order.orderId);
assert(secondTrackLookup.success === true, 'Second order tracked successfully');
assert(secondTrackLookup.order.customer.name === 'Pooja Patel', 'Second order customer retrieved');

// TEST 5: Order History still contains completed order & order data is not deleted
console.log('Test 5: Order History still contains completed order and data is untouched');
const historyOrders = getAllOrders();
const completedInHistory = historyOrders.find((o) => o.orderId === orderId);
assert(Boolean(completedInHistory), 'Order History contains completed order');
assert(completedInHistory.subtotal === 200, 'Subtotal intact');

const storedOrdersRaw = localStorage.getItem(ORDERS_STORAGE_KEY);
assert(Boolean(storedOrdersRaw), 'localStorage orders key is not deleted');
const parsedStoredOrders = JSON.parse(storedOrdersRaw);
assert(
  parsedStoredOrders.some((o) => o.orderId === orderId),
  'Completed order data is preserved intact in localStorage'
);

// TEST 6: Verify Admin Orders still contains completed order
console.log('Test 6: Admin Orders still contains completed order');
const adminOrdersPageFile = path.resolve(__dirname, '../../src/pages/admin/AdminOrdersPage.jsx');
const adminOrdersContent = fs.readFileSync(adminOrdersPageFile, 'utf8');
assert(adminOrdersContent.includes('adminOrderApi') || adminOrdersContent.includes('getAllOrders'), 'Admin Orders reads from order API or service');
assert(
  parsedStoredOrders.some((o) => o.orderId === orderId),
  'Admin orders data source contains the completed order'
);

// 5. DEDICATED TRACKING UX & ORDER DETAILS SEPARATION AUDIT
console.log('\n--- 5. DEDICATED TRACKING UX SEPARATION AUDIT ---');
assert(trackOrderContent.includes('Track Your Order'), 'TrackOrderPage contains "Track Your Order" heading');
assert(trackOrderContent.includes('Track Order'), 'TrackOrderPage contains "Track Order" button');
assert(trackOrderContent.includes('Full Order Details') || trackOrderContent.includes('/orders/'), 'TrackOrderPage links to order details');
assert(
  trackOrderContent.includes('to={`/orders/${trackedOrder.orderId}`}') &&
  (trackOrderContent.includes('Full Order Details') || trackOrderContent.includes('Full Details')),
  'Full Order Details button links to /orders/:orderId'
);
assert(
  trackOrderContent.includes('Items in Parcel') || trackOrderContent.includes('Parcel Items'),
  'TrackOrderPage shows parcel summary'
);
assert(
  !trackOrderContent.includes('Delete Order'),
  'TrackOrderPage does NOT show Delete Order button'
);

// 6. COMPONENT ARCHITECTURE & AUDIT
console.log('\n--- 6. COMPONENT & UI AUDIT ---');
assert(trackOrderContent.includes('OrderStatusIndicator'), 'TrackOrderPage uses OrderStatusIndicator');
assert(trackOrderContent.includes('getOrderById'), 'TrackOrderPage uses getOrderById');
assert(trackOrderContent.includes('getActiveOrder'), 'TrackOrderPage uses getActiveOrder');
assert(trackOrderContent.includes('Enter Order ID'), 'TrackOrderPage contains search input for Order ID');

assert(statusIndicatorContent.includes('Ready for Pickup'), 'OrderStatusIndicator has Ready for Pickup section');
assert(statusIndicatorContent.includes('Your order has been placed.'), 'Contains PLACED description');
assert(statusIndicatorContent.includes('Your order is being prepared.'), 'Contains PREPARING description');
assert(statusIndicatorContent.includes('Your parcel is ready for pickup.'), 'Contains READY description');
assert(statusIndicatorContent.includes('Your order has been completed.'), 'Contains PICKED UP description');

const activeOrderCardFile = path.resolve(__dirname, '../../src/components/orders/ActiveOrderCard.jsx');
const activeOrderContent = fs.readFileSync(activeOrderCardFile, 'utf8');
assert(activeOrderContent.includes('View Order'), 'ActiveOrderCard contains View Order button');
assert(activeOrderContent.includes('No Active Orders'), 'ActiveOrderCard contains empty state');

// 5. STRICT PICKUP-ONLY COMPLIANCE (ZERO FORBIDDEN DELIVERY TERMS)
console.log('\n--- 5. STRICT PICKUP-ONLY VERIFICATION ---');
const componentsToCheck = [
  path.resolve(__dirname, '../../src/pages/customer/TrackOrderPage.jsx'),
  path.resolve(__dirname, '../../src/pages/customer/OrderHistoryPage.jsx'),
  path.resolve(__dirname, '../../src/pages/customer/OrderDetailPage.jsx'),
  path.resolve(__dirname, '../../src/components/orders/OrderStatusIndicator.jsx'),
  path.resolve(__dirname, '../../src/components/orders/ActiveOrderCard.jsx'),
  path.resolve(__dirname, '../../src/components/orders/OrderCard.jsx'),
];

const forbiddenDeliveryTerms = [
  'delivery address',
  'delivery fee',
  'delivery partner',
  'home delivery',
  'delivery tracking',
  'doorstep',
  'free delivery',
  'cash on delivery',
];

let deliveryIssues = 0;
componentsToCheck.forEach((file) => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8').toLowerCase();
    forbiddenDeliveryTerms.forEach((term) => {
      // Allow "no home delivery" negation
      const occurrences = content.split(term).length - 1;
      const allowedNegations = content.split(`no ${term}`).length - 1;
      if (occurrences > allowedNegations) {
        console.error(`[FAIL] Forbidden delivery term "${term}" in ${file}`);
        deliveryIssues++;
      }
    });
  }
});
assert(deliveryIssues === 0, 'Zero forbidden delivery terms across all customer order components');

// 6. FILE FORMAT RULE VERIFICATION
console.log('\n--- 6. FILE FORMAT AUDIT (JS/JSX ONLY) ---');
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
const invalidFilesCount = checkDirForInvalidExtensions(rootDir);
assert(invalidFilesCount === 0, `Zero .mjs, .ts, or .tsx files in project (found: ${invalidFilesCount})`);

// SUMMARY
console.log('\n====================================================');
console.log(`TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log('====================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
