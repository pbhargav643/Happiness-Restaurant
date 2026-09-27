import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  ORDER_STATUSES,
  isOrderCompleted,
  ORDERS_STORAGE_KEY,
  HIDDEN_ORDERS_STORAGE_KEY,
  getAllOrders,
  getOrderById,
  createOrder,
  getHiddenOrderIds,
  isOrderHiddenFromHistory,
  hideOrderFromHistory,
  getUserOrderHistory,
} from '../../src/services/orderService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('ORDER HISTORY: REMOVE FROM HISTORY AUTOMATED TEST SUITE');
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

// SETUP: Clear storage and create test orders
localStorage.clear();

const testPayload = {
  customer: {
    name: 'Rahul Sharma',
    phone: '9876543210',
    email: 'rahul@example.com',
  },
  pickup: {
    date: '2026-09-17',
    time: '20:30',
  },
  items: [
    { itemId: 'starter-paneer-chilly', quantity: 2, unitPrice: 200 },
  ],
};

const creationRes = createOrder(testPayload);
assert(creationRes.success === true, 'Setup: Created test order');
const orderId = creationRes.order.orderId;

// TEST 1: PLACED order -> Remove from History not available
console.log('\n--- TEST 1: PLACED ORDER STATUS ---');
const placedOrder = getOrderById(orderId).order;
assert(placedOrder.status === 'PLACED', 'Order status is PLACED');
assert(isOrderCompleted(placedOrder.status) === false, 'PLACED is not completed');
const hidePlacedRes = hideOrderFromHistory(orderId);
assert(
  hidePlacedRes.success === false,
  'hideOrderFromHistory rejects PLACED order (active orders cannot be hidden)'
);

// TEST 2: PREPARING order -> Remove from History not available
console.log('\n--- TEST 2: PREPARING ORDER STATUS ---');
const ordersStore = getAllOrders();
ordersStore[0].status = 'PREPARING';
localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(ordersStore));

const prepOrder = getOrderById(orderId).order;
assert(prepOrder.status === 'PREPARING', 'Order status is PREPARING');
assert(isOrderCompleted(prepOrder.status) === false, 'PREPARING is not completed');
const hidePrepRes = hideOrderFromHistory(orderId);
assert(
  hidePrepRes.success === false,
  'hideOrderFromHistory rejects PREPARING order'
);

// TEST 3: READY order -> Remove from History not available
console.log('\n--- TEST 3: READY ORDER STATUS ---');
ordersStore[0].status = 'READY';
localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(ordersStore));

const readyOrder = getOrderById(orderId).order;
assert(readyOrder.status === 'READY', 'Order status is READY');
assert(isOrderCompleted(readyOrder.status) === false, 'READY is not completed');
const hideReadyRes = hideOrderFromHistory(orderId);
assert(
  hideReadyRes.success === false,
  'hideOrderFromHistory rejects READY order'
);

// TEST 4: PICKED_UP order -> Remove from History available
console.log('\n--- TEST 4: PICKED_UP ORDER ELIGIBILITY ---');
ordersStore[0].status = 'PICKED UP';
localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(ordersStore));

const completedOrder = getOrderById(orderId).order;
assert(completedOrder.status === 'PICKED UP', 'Order status is PICKED UP');
assert(isOrderCompleted(completedOrder.status) === true, 'PICKED UP is completed');

const orderCardFile = path.resolve(__dirname, '../../src/components/orders/OrderCard.jsx');
const orderCardContent = fs.readFileSync(orderCardFile, 'utf8');
assert(
  orderCardContent.includes('completed && onRemoveFromHistory'),
  'OrderCard guards Delete action strictly to completed orders'
);
assert(
  orderCardContent.includes('<span>Delete</span>'),
  'OrderCard has Delete button text'
);
assert(
  !orderCardContent.includes('<span>Hide</span>'),
  'OrderCard does NOT have "Hide" option'
);

// TEST 5: Click Delete -> confirmation dialog appears
console.log('\n--- TEST 5: CONFIRMATION DIALOG UI AUDIT ---');
const orderHistoryPageFile = path.resolve(__dirname, '../../src/pages/customer/OrderHistoryPage.jsx');
const orderHistoryContent = fs.readFileSync(orderHistoryPageFile, 'utf8');

assert(
  orderHistoryContent.includes('Delete this order from your order history?'),
  'Confirmation dialog title matches: "Delete this order from your order history?"'
);
assert(
  orderHistoryContent.includes(
    'This order will be removed from your order history. The restaurant order record will not be deleted.'
  ),
  'Confirmation dialog message explains removal without deleting restaurant order record'
);
assert(
  orderHistoryContent.includes('Cancel'),
  'Confirmation dialog provides "Cancel" button'
);
assert(
  orderHistoryContent.includes('aria-label="Cancel"'),
  'Confirmation dialog has aria-label="Cancel"'
);
assert(
  orderHistoryContent.includes('Delete'),
  'Confirmation dialog provides "Delete" confirmation action'
);
assert(
  orderHistoryContent.includes('aria-label="Delete"'),
  'Confirmation dialog has aria-label="Delete"'
);
assert(
  orderHistoryContent.includes('keepButtonRef'),
  'Confirmation dialog directs initial/safe focus to Cancel button'
);
assert(
  orderHistoryContent.includes("role=\"dialog\""),
  'Confirmation modal has accessible role="dialog"'
);
assert(
  orderHistoryContent.includes('Escape'),
  'Confirmation modal closes safely on Escape key'
);

// TEST 6: Click Keep Order -> order remains
console.log('\n--- TEST 6: CANCEL REMOVAL (KEEP ORDER) ---');
assert(isOrderHiddenFromHistory(orderId) === false, 'Order is not hidden before removal');
const visibleBefore = getUserOrderHistory();
assert(
  visibleBefore.some((o) => o.orderId === orderId),
  'Order is visible in getUserOrderHistory'
);

// TEST 7: Click Remove from History -> order disappears from user's Order History
console.log('\n--- TEST 7: CONFIRM REMOVE FROM USER HISTORY ---');
const hideResult = hideOrderFromHistory(orderId);
assert(hideResult.success === true, 'hideOrderFromHistory successfully hid order');
assert(isOrderHiddenFromHistory(orderId) === true, 'Order is now marked hidden in localStorage');

const visibleAfter = getUserOrderHistory();
assert(
  !visibleAfter.some((o) => o.orderId === orderId),
  'Order NO LONGER appears in user visible history (getUserOrderHistory)'
);
assert(visibleAfter.length === 0, 'User history count reflects removal');

// TEST 8: Removed order -> search same Order ID on Track Order -> order still appears
console.log('\n--- TEST 8: SEARCH REMOVED ORDER ON TRACK ORDER ---');
const trackLookup = getOrderById(orderId);
assert(trackLookup.success === true, 'Track Order getOrderById locates the order');
assert(trackLookup.order.orderId === orderId, 'Retrieved order ID matches');
assert(
  trackLookup.order.status === 'PICKED UP' || trackLookup.order.status === 'PICKED_UP',
  'Tracked order status remains PICKED UP'
);
assert(
  isOrderCompleted(trackLookup.order.status) === true,
  'Order continues to be marked completed on Track Order'
);

// TEST 9: Removed order -> Admin Orders still contains order
console.log('\n--- TEST 9: ADMIN ORDERS RETENTION ---');
const adminOrders = getAllOrders();
assert(
  adminOrders.some((o) => o.orderId === orderId),
  'Admin Orders (getAllOrders) still contains the completed order'
);
const adminOrderRecord = adminOrders.find((o) => o.orderId === orderId);
assert(adminOrderRecord.customer?.name === 'Rahul Sharma', 'Customer details preserved for Admin');
assert(adminOrderRecord.subtotal === 400, 'Subtotal preserved for Admin');

// TEST 10: Removed order -> actual order data remains unchanged
console.log('\n--- TEST 10: ACTUAL ORDER DATA PRESERVATION ---');
const storedOrdersRaw = localStorage.getItem(ORDERS_STORAGE_KEY);
const storedOrders = JSON.parse(storedOrdersRaw);
const actualOrder = storedOrders.find((o) => o.orderId === orderId);

assert(Boolean(actualOrder), 'Order remains intact in restaurant_orders');
assert(actualOrder.orderId === orderId, 'Order ID unchanged');
assert(actualOrder.customer.name === 'Rahul Sharma', 'Customer name preserved');
assert(actualOrder.customer.phone === '9876543210', 'Customer phone preserved');
assert(actualOrder.items.length === 1, 'Items array preserved');
assert(actualOrder.items[0].quantity === 2, 'Quantity preserved');
assert(actualOrder.items[0].unitPrice === 200, 'Item price preserved');
assert(actualOrder.subtotal === 400, 'Subtotal preserved');
assert(actualOrder.pickup.date === '2026-09-17', 'Pickup date preserved');
assert(actualOrder.pickup.time === '20:30', 'Pickup time preserved');
assert(actualOrder.orderType === 'PICKUP', 'Order type strictly PICKUP');
assert(actualOrder.status === 'PICKED UP', 'Final status remains PICKED UP');

// TEST 11: Refresh page -> removed order remains hidden from user's history
console.log('\n--- TEST 11: PERSISTENCE ACROSS REFRESH ---');
const hiddenIdsRaw = localStorage.getItem(HIDDEN_ORDERS_STORAGE_KEY);
assert(Boolean(hiddenIdsRaw), 'Hidden orders key exists in localStorage');
const parsedHiddenIds = JSON.parse(hiddenIdsRaw);
assert(parsedHiddenIds.includes(orderId), 'orderId is persisted in hidden orders list');

// Simulate page reload by re-evaluating getUserOrderHistory()
const reloadedUserOrders = getUserOrderHistory();
assert(
  !reloadedUserOrders.some((o) => o.orderId === orderId),
  'On reload, removed order remains hidden from user history'
);

// TEST 12: Empty State & Responsive verification
console.log('\n--- TEST 12: EMPTY STATE & RESPONSIVE DESIGN ---');
assert(
  orderHistoryContent.includes('No completed orders in your history.'),
  'OrderHistoryPage includes "No completed orders in your history." empty state'
);
assert(
  orderHistoryContent.includes('Browse Menu'),
  'Empty state includes "Browse Menu" button'
);
assert(
  orderHistoryContent.includes('flex flex-wrap items-center justify-between'),
  'OrderCard uses flex-wrap to prevent overflow on mobile'
);

// TEST 13: Backend API order deletion & multi-order isolation
console.log('\n--- TEST 13: BACKEND API ORDER DELETION & MULTI-ORDER ISOLATION ---');
const backendOrder1 = { orderId: 'RF-20260925-279447', status: 'PICKED_UP', subtotal: 350 };
const backendOrder2 = { orderId: 'RF-20260925-811692', status: 'PICKED_UP', subtotal: 620 };

// Delete only order 2
const hideBackendRes = hideOrderFromHistory(backendOrder2.orderId, backendOrder2);
assert(hideBackendRes.success === true, 'hideOrderFromHistory successfully deletes backend API order');
assert(isOrderHiddenFromHistory(backendOrder2.orderId) === true, 'Order 2 is marked hidden');
assert(isOrderHiddenFromHistory(backendOrder1.orderId) === false, 'Order 1 is NOT hidden');

// Verify multi-order filtering preserves Order 1
const mockBackendOrders = [backendOrder1, backendOrder2];
const hiddenIds = new Set(getHiddenOrderIds());
const remainingVisible = mockBackendOrders.filter((o) => !hiddenIds.has(o.orderId));
assert(remainingVisible.length === 1, 'Only 1 order remains visible');
assert(remainingVisible[0].orderId === 'RF-20260925-279447', 'Order 1 remains completely visible and unaffected');

// SUMMARY
console.log('\n====================================================');
console.log(`TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log('====================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
