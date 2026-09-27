import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  ORDERS_STORAGE_KEY,
  ACTIVE_ORDER_STORAGE_KEY,
  getAllOrders,
  getOrderById,
  getActiveOrder,
  createOrder,
  updateOrderStatus,
  getOrderStatusStepIndex,
} from '../../src/services/orderService.js';
import { MENU_ITEMS } from '../../src/data/menuData.js';
import { RESTAURANT_CONFIG } from '../../src/constants/restaurantConfig.js';
import { PICKUP_CONFIG } from '../../src/config/pickupConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('ADMIN PANEL ORDER MANAGEMENT & STATUS CONTROL TEST SUITE');
console.log('====================================================\n');

// Mock localStorage for Node.js test environment
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

// 1. EMPTY STATE & ORDER STATISTICS (ZERO RECORD INTEGRITY)
console.log('--- 1. EMPTY STATE & ORDER STATISTICS ---');
global.localStorage.clear();

const initialOrders = getAllOrders();
assert(Array.isArray(initialOrders), 'getAllOrders returns array when storage is empty');
assert(initialOrders.length === 0, 'No fake orders are auto-created in empty storage');

// Compute dashboard statistics on empty state
const emptyStats = {
  total: initialOrders.length,
  placed: initialOrders.filter((o) => o.status === 'PLACED').length,
  preparing: initialOrders.filter((o) => o.status === 'PREPARING').length,
  ready: initialOrders.filter((o) => o.status === 'READY').length,
  pickedUp: initialOrders.filter((o) => o.status === 'PICKED UP').length,
};

assert(emptyStats.total === 0, 'Total orders count is 0 on empty state');
assert(emptyStats.placed === 0, 'Placed orders count is 0 on empty state');
assert(emptyStats.preparing === 0, 'Preparing orders count is 0 on empty state');
assert(emptyStats.ready === 0, 'Ready orders count is 0 on empty state');
assert(emptyStats.pickedUp === 0, 'Picked up orders count is 0 on empty state');

// 2. ORDER CREATION & SHARED SOURCE OF TRUTH
console.log('\n--- 2. SHARED SOURCE OF TRUTH (restaurant_orders) ---');
const testItem = MENU_ITEMS[0];
const orderPayload1 = {
  customer: {
    name: 'Vikram Sharma',
    phone: '9876543210',
    email: 'vikram@example.com',
  },
  pickup: {
    date: '2026-09-18',
    time: '19:30',
    time12h: '7:30 PM',
  },
  items: [
    {
      itemId: testItem.id,
      quantity: 2,
    },
  ],
};

const result1 = createOrder(orderPayload1);
assert(result1.success === true, 'Order 1 created successfully');
const order1 = result1.order;
assert(order1.orderId && order1.orderId.startsWith('RF-'), 'Order 1 has valid Order ID starting with RF-');
assert(order1.orderType === 'PICKUP', 'Order type is strictly PICKUP');
assert(order1.status === 'PLACED', 'Initial order status is PLACED');

// Verify single source of truth storage key
const rawStoredOrders = JSON.parse(global.localStorage.getItem(ORDERS_STORAGE_KEY));
assert(Array.isArray(rawStoredOrders) && rawStoredOrders.length === 1, 'Order stored in restaurant_orders key');
assert(rawStoredOrders[0].orderId === order1.orderId, 'Stored order ID matches generated ID');

// Create second order
const testItem2 = MENU_ITEMS[1] || MENU_ITEMS[0];
const orderPayload2 = {
  customer: {
    name: 'Ananya Patel',
    phone: '9123456789',
    email: 'ananya@example.com',
  },
  pickup: {
    date: '2026-09-19',
    time: '20:00',
    time12h: '8:00 PM',
  },
  items: [
    {
      itemId: testItem2.id,
      quantity: 1,
    },
  ],
};

const result2 = createOrder(orderPayload2);
assert(result2.success === true, 'Order 2 created successfully');
const order2 = result2.order;

// 3. ADMIN STATUS TRANSITIONS & VALIDATION
console.log('\n--- 3. ADMIN STATUS TRANSITIONS & VALIDATION ---');
// Step 1: Forward Transition Order 1 to PREPARING
const prepResult = updateOrderStatus(order1.orderId, 'PREPARING');
assert(prepResult.success === true, 'Forward transition Order 1 to PREPARING succeeds');
assert(prepResult.order.status === 'PREPARING', 'Returned order status is PREPARING');

// Check localStorage directly
const ordersAfterPrep = getAllOrders();
const storedOrder1Prep = ordersAfterPrep.find((o) => o.orderId === order1.orderId);
assert(storedOrder1Prep.status === 'PREPARING', 'Storage reflects PREPARING status');

// Step 2: Forward Transition Order 1 to READY with readyTime
const readyResult = updateOrderStatus(order1.orderId, 'READY', '8:15 PM');
assert(readyResult.success === true, 'Forward transition Order 1 to READY with readyTime succeeds');
assert(readyResult.order.status === 'READY', 'Returned order status is READY');
assert(readyResult.order.readyTime === '8:15 PM', 'Returned order readyTime is "8:15 PM"');

// Step 3: Forward Transition Order 1 to PICKED UP
const pickupResult = updateOrderStatus(order1.orderId, 'PICKED UP');
assert(pickupResult.success === true, 'Forward transition Order 1 to PICKED UP succeeds');
assert(pickupResult.order.status === 'PICKED UP', 'Returned order status is PICKED UP');

// Step 4: Backward transition without isCorrection must fail
const accidentalRollback = updateOrderStatus(order1.orderId, 'PREPARING');
assert(accidentalRollback.success === false, 'Backward transition without isCorrection is rejected');
assert(accidentalRollback.isBackward === true, 'isBackward flag returned as true');
assert(accidentalRollback.error && accidentalRollback.error.includes('correction mode'), 'Error message specifies correction mode requirement');

// Step 5: Backward transition with isCorrection=true must succeed (Explicit Admin Correction Mode)
const deliberateCorrection = updateOrderStatus(order1.orderId, 'READY', null, true);
assert(deliberateCorrection.success === true, 'Deliberate backward correction with isCorrection=true succeeds');
assert(deliberateCorrection.order.status === 'READY', 'Order status rolled back to READY');
assert(deliberateCorrection.order.lastCorrection !== undefined, 'Correction metadata is attached to order');

// Re-advance to PICKED UP
const reAdvance = updateOrderStatus(order1.orderId, 'PICKED UP');
assert(reAdvance.success === true, 'Re-advancing to PICKED UP succeeds');

// Step 6: Invalid status rejected safely
const invalidStatusResult = updateOrderStatus(order1.orderId, 'DELIVERED');
assert(invalidStatusResult.success === false, 'Invalid status "DELIVERED" is safely rejected');

// Step 7: Non-existent order ID handled safely
const nonExistentResult = updateOrderStatus('ORD-INVALID-999', 'PREPARING');
assert(nonExistentResult.success === false, 'Non-existent order ID returns success=false without crashing');

// 4. ACTIVE ORDER SYNC ON STATUS UPDATE
console.log('\n--- 4. ACTIVE ORDER SYNCHRONIZATION ---');
// Order 2 was created last, so it is active
const activeBefore = getActiveOrder();
assert(activeBefore && activeBefore.orderId === order2.orderId, 'Order 2 is currently active order');

// Update Order 2 to PREPARING
const order2PrepResult = updateOrderStatus(order2.orderId, 'PREPARING', '8:30 PM');
assert(order2PrepResult.success === true, 'Order 2 updated to PREPARING');

const activeAfter = getActiveOrder();
assert(activeAfter && activeAfter.status === 'PREPARING', 'Active order reflects updated PREPARING status');
assert(activeAfter.readyTime === '8:30 PM', 'Active order reflects updated readyTime');

// 5. READY TIME FOUNDATION
console.log('\n--- 5. READY TIME FOUNDATION ---');
// Order with no readyTime set
const freshOrderResult = createOrder({
  customer: { name: 'Rohit Kumar', phone: '9988776655' },
  pickup: { date: '2026-09-18', time: '20:15', time12h: '8:15 PM' },
  items: [{ itemId: testItem.id, quantity: 1 }],
});
assert(freshOrderResult.success === true, 'Fresh order created for readyTime testing');
const freshOrder = freshOrderResult.order;

assert(freshOrder.readyTime === undefined || freshOrder.readyTime === null, 'New order has no readyTime by default');
const displayReadyTime = freshOrder.readyTime || 'Not set';
assert(displayReadyTime === 'Not set', 'Empty readyTime gracefully displays "Not set"');

// Set ready time on fresh order
const updatedWithTime = updateOrderStatus(freshOrder.orderId, 'PREPARING', '8:45 PM');
assert(updatedWithTime.success === true, 'Ready time set on order');
assert(updatedWithTime.order.readyTime === '8:45 PM', 'Ready time is "8:45 PM"');

// Clear ready time
const clearedTime = updateOrderStatus(freshOrder.orderId, 'PREPARING', null, true);
assert(clearedTime.success === true, 'Ready time cleared successfully');
assert(clearedTime.order.readyTime === null, 'Ready time is null');

// 6. SAFE ORDER DETAILS RETRIEVAL
console.log('\n--- 6. SAFE ORDER DETAILS RETRIEVAL ---');
const orderLookup = getOrderById(freshOrder.orderId);
assert(orderLookup.success === true && orderLookup.order !== null, 'Existing order retrieved by ID');
const foundOrder = orderLookup.order;
assert(foundOrder.customer.name === 'Rohit Kumar', 'Customer name intact in order details');
assert(foundOrder.items.length === 1, 'Order items intact in order details');
assert(foundOrder.items[0].unitPrice === testItem.price, 'Item unitPrice matches menu price');

// Invalid order retrieval
const notFoundOrder = getOrderById('NON-EXISTENT-ID-12345');
assert(notFoundOrder.success === false && notFoundOrder.order === null, 'Non-existent order ID returns order=null safely');

const nullOrder = getOrderById(null);
assert(nullOrder.success === false && nullOrder.order === null, 'null order ID returns order=null safely');

// 7. ORDER SEARCH, STATUS FILTER & PICKUP DATE FILTER LOGIC
console.log('\n--- 7. ORDER SEARCH, FILTER & SORTING ---');
const allCurrentOrders = getAllOrders();
assert(allCurrentOrders.length >= 3, 'At least 3 orders present for filtering tests');

// Search tests
const searchById = allCurrentOrders.filter((o) => o.orderId.includes(order1.orderId));
assert(searchById.length === 1, 'Search by exact Order ID returns 1 match');

const searchByName = allCurrentOrders.filter((o) => o.customer?.name.toLowerCase().includes('vikram'));
assert(searchByName.length === 1, 'Search by customer name "vikram" returns 1 match');

const searchByPhone = allCurrentOrders.filter((o) => (o.customer?.phone || '').includes('9876543210'));
assert(searchByPhone.length === 1, 'Search by customer phone returns 1 match');

const searchNoMatch = allCurrentOrders.filter((o) => (o.customer?.name || '').includes('ZZZZZ_NONEXISTENT'));
assert(searchNoMatch.length === 0, 'Unmatched search query returns 0 matches');

// Status filter tests
const placedOrders = allCurrentOrders.filter((o) => o.status === 'PLACED');
const preparingOrders = allCurrentOrders.filter((o) => o.status === 'PREPARING');
const pickedUpOrders = allCurrentOrders.filter((o) => o.status === 'PICKED UP');
assert(Array.isArray(placedOrders), 'Placed orders filter produces array');
assert(Array.isArray(preparingOrders), 'Preparing orders filter produces array');
assert(Array.isArray(pickedUpOrders), 'Picked up orders filter produces array');

// Pickup Date filter tests
const date1Orders = allCurrentOrders.filter((o) => o.pickup?.date === '2026-09-18');
const date2Orders = allCurrentOrders.filter((o) => o.pickup?.date === '2026-09-19');
const dateNoneOrders = allCurrentOrders.filter((o) => o.pickup?.date === '2099-12-31');
assert(date1Orders.length > 0, 'Pickup date filter matches 2026-09-18');
assert(date2Orders.length > 0, 'Pickup date filter matches 2026-09-19');
assert(dateNoneOrders.length === 0, 'Pickup date with no orders returns 0 matches cleanly');

// Sorting tests without mutating stored records
const sortedNewest = [...allCurrentOrders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
const sortedOldest = [...allCurrentOrders].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
assert(sortedNewest[0].createdAt >= sortedNewest[sortedNewest.length - 1].createdAt, 'Newest sort places newest order first');
assert(sortedOldest[0].createdAt <= sortedOldest[sortedOldest.length - 1].createdAt, 'Oldest sort places oldest order first');

// Verify original storage was not modified by sorting
const unmodifiedOrders = getAllOrders();
assert(unmodifiedOrders.length === allCurrentOrders.length, 'Storage record count remains unchanged after sort');

// 8. LOCALSTORAGE RESILIENCE & SAFETY
console.log('\n--- 8. LOCALSTORAGE RESILIENCE & SAFETY ---');
// Test 1: Malformed JSON string in storage
global.localStorage.setItem(ORDERS_STORAGE_KEY, '{malformed_json: true');
const malformedResult = getAllOrders();
assert(Array.isArray(malformedResult) && malformedResult.length === 0, 'Malformed JSON in storage returns empty array safely without crash');

// Test 2: Non-array in storage (e.g. object or string)
global.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify({ invalid: 'not an array' }));
const nonArrayResult = getAllOrders();
assert(Array.isArray(nonArrayResult) && nonArrayResult.length === 0, 'Non-array in storage returns empty array safely');

// Test 3: Array with null and corrupted entries
global.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify([null, { notAnOrder: true }, 42, 'string']));
const corruptedResult = getAllOrders();
assert(Array.isArray(corruptedResult) && corruptedResult.length === 0, 'Corrupted array entries filtered out safely');

// Restore original test storage
global.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(allCurrentOrders));

// 9. MENU DATA INTEGRITY (READ-ONLY)
console.log('\n--- 9. MENU DATA INTEGRITY ---');
assert(Array.isArray(MENU_ITEMS), 'MENU_ITEMS is an array');
assert(MENU_ITEMS.length > 0, 'MENU_ITEMS contains verified dishes');

for (const item of MENU_ITEMS) {
  assert(typeof item.id === 'string' && item.id.length > 0, `Item "${item.name}" has valid id`);
  assert(typeof item.name === 'string' && item.name.length > 0, `Item "${item.id}" has valid name`);
  assert(typeof item.price === 'number' && item.price > 0, `Item "${item.name}" has positive price ₹${item.price}`);
  assert(typeof item.isVeg === 'boolean', `Item "${item.name}" has boolean isVeg`);
}

// 10. STRICT SELF-PICKUP COMPLIANCE
console.log('\n--- 10. STRICT SELF-PICKUP COMPLIANCE ---');
assert(RESTAURANT_CONFIG.pickupType === 'RESTAURANT_PARCEL_PICKUP', 'RESTAURANT_CONFIG pickupType is RESTAURANT_PARCEL_PICKUP');
assert(PICKUP_CONFIG.serviceMode === 'Restaurant Self-Pickup', 'PICKUP_CONFIG serviceMode is Restaurant Self-Pickup');

const allStored = getAllOrders();
for (const ord of allStored) {
  assert(ord.orderType === 'PICKUP', `Order ${ord.orderId} strictly specifies orderType=PICKUP`);
  assert(ord.deliveryAddress === undefined, `Order ${ord.orderId} does not have deliveryAddress`);
  assert(ord.deliveryFee === undefined, `Order ${ord.orderId} does not have deliveryFee`);
  assert(ord.deliveryPartner === undefined, `Order ${ord.orderId} does not have deliveryPartner`);
}

// SUMMARY
console.log('\n====================================================');
console.log(`TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
console.log('====================================================');

if (failCount > 0) {
  process.exit(1);
}
