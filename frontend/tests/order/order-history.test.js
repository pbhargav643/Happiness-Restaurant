import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  ORDERS_STORAGE_KEY,
  ACTIVE_ORDER_STORAGE_KEY,
  ORDER_STATUSES,
  ORDER_STATUS_STEPS,
  getOrderStatusStepIndex,
  getAllOrders,
  getOrderById,
  getActiveOrder,
  createOrder,
} from '../../src/services/orderService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('CUSTOMER ORDER HISTORY & STATUS AUTOMATED TEST SUITE');
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

// 1. ORDER STATUSES & PROGRESSION
console.log('--- 1. ORDER STATUSES & PROGRESSION DEFINITIONS ---');
assert(ORDER_STATUSES.PLACED === 'PLACED', 'ORDER_STATUSES includes PLACED');
assert(ORDER_STATUSES.PREPARING === 'PREPARING', 'ORDER_STATUSES includes PREPARING');
assert(ORDER_STATUSES.READY === 'READY', 'ORDER_STATUSES includes READY');
assert(ORDER_STATUSES.PICKED_UP === 'PICKED UP', 'ORDER_STATUSES includes PICKED UP');

assert(ORDER_STATUS_STEPS.length === 4, 'ORDER_STATUS_STEPS has exactly 4 steps');
assert(ORDER_STATUS_STEPS[0] === 'PLACED', 'Step 0 is PLACED');
assert(ORDER_STATUS_STEPS[1] === 'PREPARING', 'Step 1 is PREPARING');
assert(ORDER_STATUS_STEPS[2] === 'READY', 'Step 2 is READY');
assert(ORDER_STATUS_STEPS[3] === 'PICKED UP', 'Step 3 is PICKED UP');

assert(getOrderStatusStepIndex('PLACED') === 0, 'getOrderStatusStepIndex("PLACED") returns 0');
assert(getOrderStatusStepIndex('PREPARING') === 1, 'getOrderStatusStepIndex("PREPARING") returns 1');
assert(getOrderStatusStepIndex('READY') === 2, 'getOrderStatusStepIndex("READY") returns 2');
assert(getOrderStatusStepIndex('PICKED UP') === 3, 'getOrderStatusStepIndex("PICKED UP") returns 3');
assert(getOrderStatusStepIndex('UNKNOWN') === 0, 'getOrderStatusStepIndex defaults safely to 0');

// 2. LOCALSTORAGE EMPTY & CORRUPTED DATA HANDLING
console.log('\n--- 2. LOCALSTORAGE ERROR RESILIENCE ---');
localStorage.clear();
assert(getAllOrders().length === 0, 'getAllOrders() returns [] when localStorage is empty');
assert(getActiveOrder() === null, 'getActiveOrder() returns null when localStorage is empty');

// Corrupted JSON resilience
localStorage.setItem(ORDERS_STORAGE_KEY, 'invalid-json{{{');
assert(getAllOrders().length === 0, 'getAllOrders() handles corrupted JSON gracefully without crash');

localStorage.setItem(ACTIVE_ORDER_STORAGE_KEY, '{corrupted-object');
assert(getActiveOrder() === null, 'getActiveOrder() handles corrupted JSON gracefully without crash');

// 3. ORDER CREATION & PERSISTENCE
console.log('\n--- 3. ORDER CREATION & HISTORY RETRIEVAL ---');
localStorage.clear();

const testOrderPayload1 = {
  customer: {
    name: 'Rajesh Sharma',
    phone: '9876543210',
    email: 'rajesh@example.com',
  },
  pickup: {
    date: '2026-09-17',
    time: '19:30',
  },
  items: [
    { itemId: 'starter-paneer-chilly', quantity: 2, unitPrice: 200 },
    { itemId: 'soup-veg-clear-soup', quantity: 1, unitPrice: 100 },
  ],
};

const result1 = createOrder(testOrderPayload1);
assert(result1.success === true, 'Order 1 created successfully');
assert(result1.order.status === 'PLACED', 'New order starts with status "PLACED"');
assert(result1.order.orderType === 'PICKUP', 'Order type is strictly "PICKUP"');
assert(result1.order.subtotal === 500, 'Subtotal correctly computed (2x200 + 1x100 = 500)');

const testOrderPayload2 = {
  customer: {
    name: 'Priya Patel',
    phone: '9822334455',
  },
  pickup: {
    date: '2026-09-18',
    time: '20:15',
  },
  items: [
    { itemId: 'tandoori-starter-paneer-tikka-dry', quantity: 1, unitPrice: 260 },
  ],
};

const result2 = createOrder(testOrderPayload2);
assert(result2.success === true, 'Order 2 created successfully');

const storedOrders = getAllOrders();
assert(storedOrders.length === 2, 'getAllOrders() returns 2 stored orders');
assert(storedOrders[0].orderId === result2.order.orderId, 'Orders sorted latest first');

const activeOrder = getActiveOrder();
assert(activeOrder !== null, 'getActiveOrder() returns the active order');
assert(activeOrder.orderId === result2.order.orderId, 'Active order ID matches latest created order');

// 4. LOOKUP INDIVIDUAL ORDER BY ID
console.log('\n--- 4. ORDER LOOKUP BY ID ---');
const lookupSuccess = getOrderById(result1.order.orderId);
assert(lookupSuccess.success === true, 'getOrderById finds order 1 successfully');
assert(lookupSuccess.order.customer.name === 'Rajesh Sharma', 'Customer details preserved');
assert(lookupSuccess.order.items.length === 2, 'All items preserved');
assert(lookupSuccess.order.subtotal === 500, 'Subtotal preserved');

const lookupNotFound = getOrderById('RF-NON-EXISTENT-ID');
assert(lookupNotFound.success === false, 'getOrderById returns success: false for unknown order');
assert(lookupNotFound.order === null, 'Unknown order returns null for privacy');

// 5. COMPONENT & ROUTE ARCHITECTURE AUDIT
console.log('\n--- 5. ARCHITECTURE & ROUTE AUDIT ---');
const customerRoutesFile = path.resolve(__dirname, '../../src/routes/CustomerRoutes.jsx');
const routesContent = fs.readFileSync(customerRoutesFile, 'utf8');
assert(routesContent.includes('/orders'), 'CustomerRoutes registers /orders route');
assert(routesContent.includes('/orders/:orderId'), 'CustomerRoutes registers /orders/:orderId route');
assert(routesContent.includes('OrderHistoryPage'), 'CustomerRoutes imports OrderHistoryPage');
assert(routesContent.includes('OrderDetailPage'), 'CustomerRoutes imports OrderDetailPage');

const navbarFile = path.resolve(__dirname, '../../src/components/layout/Navbar.jsx');
const navbarContent = fs.readFileSync(navbarFile, 'utf8');
assert(navbarContent.includes('/orders'), 'Navbar provides direct link to /orders');

const mobileMenuFile = path.resolve(__dirname, '../../src/components/layout/MobileMenu.jsx');
const mobileMenuContent = fs.readFileSync(mobileMenuFile, 'utf8');
assert(mobileMenuContent.includes('/orders'), 'MobileMenu provides direct link to /orders');

const footerFile = path.resolve(__dirname, '../../src/components/layout/Footer.jsx');
const footerContent = fs.readFileSync(footerFile, 'utf8');
assert(footerContent.includes('/orders'), 'Footer provides link to /orders');

const confirmationFile = path.resolve(__dirname, '../../src/pages/customer/OrderConfirmationPage.jsx');
const confirmationContent = fs.readFileSync(confirmationFile, 'utf8');
assert(confirmationContent.includes('/orders'), 'OrderConfirmationPage links to /orders');

// 6. STRICT PICKUP-ONLY COMPLIANCE (ZERO DELIVERY WORDS)
console.log('\n--- 6. STRICT PICKUP-ONLY VERIFICATION ---');
const filesToCheck = [
  path.resolve(__dirname, '../../src/pages/customer/OrderHistoryPage.jsx'),
  path.resolve(__dirname, '../../src/pages/customer/OrderDetailPage.jsx'),
  path.resolve(__dirname, '../../src/components/orders/OrderStatusIndicator.jsx'),
  path.resolve(__dirname, '../../src/components/orders/OrderCard.jsx'),
  path.resolve(__dirname, '../../src/components/orders/ActiveOrderCard.jsx'),
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
filesToCheck.forEach((file) => {
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
assert(deliveryIssues === 0, 'Zero forbidden delivery terms across all new order history components');

// 7. FILE FORMAT RULE VERIFICATION
console.log('\n--- 7. FILE FORMAT AUDIT (JS/JSX ONLY) ---');
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
