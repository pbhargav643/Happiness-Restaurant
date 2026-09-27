import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  ORDERS_STORAGE_KEY,
  ACTIVE_ORDER_STORAGE_KEY,
  HIDDEN_ORDERS_STORAGE_KEY,
  ORDER_STATUSES,
  ORDER_STATUS_STEPS,
  getAllOrders,
  getOrderById,
  getActiveOrder,
  createOrder,
  hideOrderFromHistory,
  getUserOrderHistory,
  isOrderHiddenFromHistory,
} from '../../src/services/orderService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('================================================================');
console.log('TEST SUITE: ORDER HISTORY CLEAN SUMMARY & SEPARATE ORDER DETAILS');
console.log('================================================================\n');

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

// Read component files
const orderCardFile = path.resolve(__dirname, '../../src/components/orders/OrderCard.jsx');
const orderCardContent = fs.readFileSync(orderCardFile, 'utf8');

const activeOrderCardFile = path.resolve(__dirname, '../../src/components/orders/ActiveOrderCard.jsx');
const activeOrderCardContent = fs.readFileSync(activeOrderCardFile, 'utf8');

const orderHistoryPageFile = path.resolve(__dirname, '../../src/pages/customer/OrderHistoryPage.jsx');
const orderHistoryPageContent = fs.readFileSync(orderHistoryPageFile, 'utf8');

const orderDetailPageFile = path.resolve(__dirname, '../../src/pages/customer/OrderDetailPage.jsx');
const orderDetailPageContent = fs.readFileSync(orderDetailPageFile, 'utf8');

const customerRoutesFile = path.resolve(__dirname, '../../src/routes/CustomerRoutes.jsx');
const customerRoutesContent = fs.readFileSync(customerRoutesFile, 'utf8');

// -------------------------------------------------------------
// TEST 1: /orders loads order summaries
// -------------------------------------------------------------
console.log('--- TEST 1: ROUTING & ORDER SUMMARY PAGE LOADING ---');
assert(customerRoutesContent.includes("path=\"/orders\""), 'CustomerRoutes registers /orders route');
assert(customerRoutesContent.includes("element={<OrderHistoryPage />}"), 'CustomerRoutes routes /orders to OrderHistoryPage');
assert(orderHistoryPageContent.includes('getUserOrderHistory()'), 'OrderHistoryPage retrieves customer-visible order history');
assert(orderHistoryPageContent.includes('<OrderCard'), 'OrderHistoryPage renders OrderCard instances for orders');

// -------------------------------------------------------------
// TEST 2: Full item details are NOT displayed on Order History list
// -------------------------------------------------------------
console.log('\n--- TEST 2: ORDER HISTORY LIST EXCLUDES FULL ITEM DETAILS ---');
// OrderCard should NOT have nested map of individual items, images, or item breakdowns
assert(!orderCardContent.includes('order.items?.map'), 'OrderCard does NOT map over order.items');
assert(!orderCardContent.includes('FoodImage'), 'OrderCard does NOT render individual food item thumbnails');
assert(orderCardContent.includes('totalItemsCount'), 'OrderCard displays concise total item count summary');
assert(orderCardContent.includes('{totalItemsCount === 1 ? \'item\' : \'items\'}'), 'OrderCard formats item count properly');

// -------------------------------------------------------------
// TEST 3: Click Order ID -> navigates to /orders/:orderId
// -------------------------------------------------------------
console.log('\n--- TEST 3: ORDER ID IS A CLICKABLE INTERACTIVE LINK ---');
assert(
  orderCardContent.includes('to={`/orders/${order.orderId}`}') &&
  orderCardContent.includes('{order.orderId}') &&
  orderCardContent.includes('<Link'),
  'OrderCard renders order.orderId inside a Link targeting /orders/:orderId'
);
assert(
  orderCardContent.includes('aria-label={`View order details for ${order.orderId}`}') ||
  orderCardContent.includes('aria-label='),
  'OrderCard Order ID link has an accessible label'
);
assert(
  orderCardContent.includes('focus-visible:ring-2') || orderCardContent.includes('focus-visible:ring-accent'),
  'OrderCard Order ID link has an explicit keyboard focus state'
);

// Check ActiveOrderCard as well
assert(
  activeOrderCardContent.includes('to={`/orders/${order.orderId}`}') &&
  activeOrderCardContent.includes('{order.orderId}'),
  'ActiveOrderCard renders order.orderId as a clickable Link targeting /orders/:orderId'
);

// -------------------------------------------------------------
// TEST 4: Click View Order -> navigates to same Order Details route
// -------------------------------------------------------------
console.log('\n--- TEST 4: "VIEW ORDER →" BUTTON NAVIGATES TO /orders/:orderId ---');
assert(
  orderCardContent.includes('to={`/orders/${order.orderId}`}') &&
  orderCardContent.includes('View Order'),
  'OrderCard has "View Order" Link targeting /orders/:orderId'
);
assert(
  activeOrderCardContent.includes('to={`/orders/${order.orderId}`}') &&
  activeOrderCardContent.includes('View Order'),
  'ActiveOrderCard has "View Order" Link targeting /orders/:orderId'
);

// -------------------------------------------------------------
// TEST 5: Separate Order Details page at /orders/:orderId with complete info
// -------------------------------------------------------------
console.log('\n--- TEST 5: COMPLETE ORDER DETAILS ON DEDICATED PAGE ---');
assert(customerRoutesContent.includes("path=\"/orders/:orderId\""), 'CustomerRoutes registers /orders/:orderId route');
assert(customerRoutesContent.includes("element={<OrderDetailPage />}"), 'CustomerRoutes routes /orders/:orderId to OrderDetailPage');

// 5a. Order Information
assert(orderDetailPageContent.includes('ORDER INFORMATION'), 'OrderDetailPage contains ORDER INFORMATION section');
assert(orderDetailPageContent.includes('order.orderId'), 'OrderDetailPage displays Order ID');
assert(orderDetailPageContent.includes('Placed date/time') || orderDetailPageContent.includes('formattedTimestamp'), 'OrderDetailPage displays Placed date/time');

// 5b. Customer Information
assert(orderDetailPageContent.includes('CUSTOMER INFORMATION'), 'OrderDetailPage contains CUSTOMER INFORMATION section');
assert(orderDetailPageContent.includes('Customer Name') || orderDetailPageContent.includes('order.customer?.name'), 'OrderDetailPage displays Customer Name');
assert(orderDetailPageContent.includes('Mobile Number') || orderDetailPageContent.includes('order.customer?.phone'), 'OrderDetailPage displays Mobile Number');
assert(orderDetailPageContent.includes('Email') || orderDetailPageContent.includes('order.customer?.email'), 'OrderDetailPage displays Email');

// 5c. Pickup Details
assert(orderDetailPageContent.includes('PICKUP DETAILS'), 'OrderDetailPage contains PICKUP DETAILS section');
assert(orderDetailPageContent.includes('Pickup Date'), 'OrderDetailPage displays Pickup Date');
assert(orderDetailPageContent.includes('Pickup Time'), 'OrderDetailPage displays Pickup Time');
assert(orderDetailPageContent.includes('Order Type'), 'OrderDetailPage displays Order Type');
assert(orderDetailPageContent.includes('Takeaway Parcel'), 'OrderDetailPage states Takeaway Parcel');
assert(orderDetailPageContent.includes('readyTime'), 'OrderDetailPage supports Ready Time if available');

// 5d. Items in Parcel
assert(orderDetailPageContent.includes('ITEMS IN PARCEL'), 'OrderDetailPage contains ITEMS IN PARCEL section');
assert(orderDetailPageContent.includes('order.items?.map'), 'OrderDetailPage maps through complete items in parcel');
assert(orderDetailPageContent.includes('item.name'), 'OrderDetailPage displays Item Name');
assert(orderDetailPageContent.includes('Quantity') || orderDetailPageContent.includes('item.quantity'), 'OrderDetailPage displays Quantity');
assert(orderDetailPageContent.includes('Unit price') || orderDetailPageContent.includes('item.unitPrice'), 'OrderDetailPage displays Unit Price');
assert(orderDetailPageContent.includes('Subtotal') || orderDetailPageContent.includes('item.itemTotal'), 'OrderDetailPage displays Item Subtotal');
assert(orderDetailPageContent.includes('FoodImage'), 'OrderDetailPage displays item FoodImage');

// 5e. Order Summary
assert(orderDetailPageContent.includes('ORDER SUMMARY'), 'OrderDetailPage contains ORDER SUMMARY section');
assert(orderDetailPageContent.includes('Final Payable Amount') || orderDetailPageContent.includes('order.subtotal'), 'OrderDetailPage displays Final Payable Amount');

// 5f. Order Status Timeline
assert(orderDetailPageContent.includes('ORDER STATUS'), 'OrderDetailPage contains ORDER STATUS section');
assert(orderDetailPageContent.includes('OrderStatusIndicator'), 'OrderDetailPage renders OrderStatusIndicator timeline');

// -------------------------------------------------------------
// TEST 6 & 7: "Back to Order History" navigation action & browser back
// -------------------------------------------------------------
console.log('\n--- TEST 6 & 7: NAVIGATION ACTION & BROWSER COMPLIANCE ---');
assert(
  orderDetailPageContent.includes('Back to Order History'),
  'OrderDetailPage has prominent "Back to Order History" text'
);
assert(
  orderDetailPageContent.includes('to="/orders"'),
  'Back to Order History links directly back to /orders'
);
assert(
  orderDetailPageContent.includes('aria-label="Back to Order History"'),
  'Back to Order History has accessible aria-label'
);

// -------------------------------------------------------------
// TEST 8: Multiple orders display as separate compact summaries
// -------------------------------------------------------------
console.log('\n--- TEST 8: MULTIPLE ORDERS DISPLAY CLEANLY ---');
localStorage.clear();

// Create 3 separate orders
const sampleOrders = [
  {
    customer: { name: 'Ananya Roy', phone: '9876543210', email: 'ananya@example.com' },
    pickup: { date: '2026-09-17', time: '18:00' },
    items: [{ itemId: 'starter-paneer-chilly', quantity: 2, unitPrice: 200 }],
  },
  {
    customer: { name: 'Karan Mehra', phone: '9811223344' },
    pickup: { date: '2026-09-17', time: '19:30' },
    items: [{ itemId: 'soup-veg-clear-soup', quantity: 1, unitPrice: 100 }],
  },
  {
    customer: { name: 'Sunita Rao', phone: '9833445566' },
    pickup: { date: '2026-09-18', time: '20:00' },
    items: [{ itemId: 'tandoori-starter-paneer-tikka-dry', quantity: 3, unitPrice: 260 }],
  },
];

const created = sampleOrders.map((p) => createOrder(p).order);
assert(created.every((o) => o && o.orderId), 'Successfully created 3 sample orders');

const visibleOrders = getUserOrderHistory();
assert(visibleOrders.length === 3, 'getUserOrderHistory() retrieves all 3 orders');
assert(visibleOrders[0].orderId === created[2].orderId, 'Orders sorted chronological descending (newest first)');

// Verify OrderHistoryPage handles array of orders in grid
assert(
  orderHistoryPageContent.includes('filteredOrders.map((order) =>'),
  'OrderHistoryPage maps multiple orders to compact OrderCard components'
);
assert(
  orderHistoryPageContent.includes('grid-cols-1 md:grid-cols-2'),
  'OrderHistoryPage uses responsive multi-column grid layout for multiple orders'
);

// -------------------------------------------------------------
// TEST 9 & 10: Completed order supports Remove from History without deleting underlying order
// -------------------------------------------------------------
console.log('\n--- TEST 9 & 10: REMOVE FROM HISTORY PRESERVES UNDERLYING RECORD ---');
const orderToComplete = created[0]; // First created order

// Update its status to PICKED UP
const storedOrders = getAllOrders();
const targetIdx = storedOrders.findIndex((o) => o.orderId === orderToComplete.orderId);
storedOrders[targetIdx].status = 'PICKED UP';
localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(storedOrders));

// Verify it's completed
const foundCompleted = getOrderById(orderToComplete.orderId).order;
assert(foundCompleted.status === 'PICKED UP', 'Order status is PICKED UP');

// Hide from history
const hideRes = hideOrderFromHistory(orderToComplete.orderId);
assert(hideRes.success === true, 'hideOrderFromHistory succeeds for PICKED UP order');
assert(isOrderHiddenFromHistory(orderToComplete.orderId) === true, 'Order is marked hidden');

// Verify it disappeared from visible user history
const userHistoryAfterHide = getUserOrderHistory();
assert(
  !userHistoryAfterHide.some((o) => o.orderId === orderToComplete.orderId),
  'Order NO LONGER appears in getUserOrderHistory()'
);
assert(userHistoryAfterHide.length === 2, 'Visible count decreased to 2');

// TEST 10: Underlying record NOT deleted
const allUnderlyingOrders = getAllOrders();
assert(
  allUnderlyingOrders.some((o) => o.orderId === orderToComplete.orderId),
  'Underlying order is STILL INTACT in getAllOrders() / database storage'
);

// -------------------------------------------------------------
// TEST 11: Track Order can still find the completed/hidden order
// -------------------------------------------------------------
console.log('\n--- TEST 11: TRACK ORDER STILL FINDS COMPLETED / HIDDEN ORDER ---');
const trackLookup = getOrderById(orderToComplete.orderId);
assert(trackLookup.success === true, 'Track Order getOrderById successfully finds hidden order');
assert(trackLookup.order.orderId === orderToComplete.orderId, 'Track Order retrieves correct order payload');
assert(trackLookup.order.customer.name === 'Ananya Roy', 'Track Order preserves complete customer details');

// -------------------------------------------------------------
// TEST 12: Read-Only Audit (No customer edit fields)
// -------------------------------------------------------------
console.log('\n--- TEST 12: READ-ONLY AUDIT (ZERO MUTATION / EDIT INPUTS) ---');
assert(!orderDetailPageContent.includes('<input'), 'OrderDetailPage has zero <input> elements');
assert(!orderDetailPageContent.includes('<select'), 'OrderDetailPage has zero <select> elements');
assert(!orderDetailPageContent.includes('<textarea'), 'OrderDetailPage has zero <textarea> elements');
assert(!orderDetailPageContent.includes('Edit Order'), 'OrderDetailPage does not provide "Edit Order"');
assert(!orderDetailPageContent.includes('Update Quantity'), 'OrderDetailPage does not provide "Update Quantity"');

// -------------------------------------------------------------
// TEST 13: Strict Takeaway Pickup Compliance (Zero Forbidden Delivery Terms)
// -------------------------------------------------------------
console.log('\n--- TEST 13: STRICT PICKUP-ONLY COMPLIANCE ---');
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

const componentsToCheck = [
  orderCardContent,
  activeOrderCardContent,
  orderHistoryPageContent,
  orderDetailPageContent,
];

let deliveryViolations = 0;
componentsToCheck.forEach((content, i) => {
  forbiddenDeliveryTerms.forEach((term) => {
    const occurrences = content.toLowerCase().split(term).length - 1;
    const allowedNegations = content.toLowerCase().split(`no ${term}`).length - 1;
    if (occurrences > allowedNegations) {
      console.error(`[FAIL] Forbidden delivery term "${term}" found in component ${i}`);
      deliveryViolations++;
    }
  });
});
assert(deliveryViolations === 0, 'Zero forbidden delivery terms found across Order History & Details');

// -------------------------------------------------------------
// TEST 14: File Format Compliance (JS/JSX Only)
// -------------------------------------------------------------
console.log('\n--- TEST 14: FILE FORMAT COMPLIANCE (JS/JSX ONLY) ---');
function checkExtensions(dir) {
  let invalid = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      invalid += checkExtensions(full);
    } else if (/\.(mjs|ts|tsx)$/i.test(entry.name)) {
      invalid++;
    }
  }
  return invalid;
}
const invalidFormatCount = checkExtensions(path.resolve(__dirname, '../../src'));
assert(invalidFormatCount === 0, 'Zero .mjs, .ts, or .tsx files in src directory');

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log('\n================================================================');
console.log(`ORDER DETAILS & HISTORY SUITE: ${passCount} PASSED, ${failCount} FAILED`);
console.log('================================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
