import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  ORDERS_STORAGE_KEY,
  ACTIVE_ORDER_STORAGE_KEY,
  getAllOrders,
  createOrder,
  updateOrderStatus,
} from '../../src/services/orderService.js';
import { MENU_ITEMS } from '../../src/data/menuData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('ADMIN DASHBOARD AUTOMATED QA TEST SUITE');
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

// 1. EMPTY STORAGE STATISTICS & ZERO RECORD INTEGRITY
console.log('--- 1. EMPTY STORAGE DASHBOARD STATISTICS ---');
global.localStorage.clear();

const emptyOrders = getAllOrders();
assert(Array.isArray(emptyOrders) && emptyOrders.length === 0, 'getAllOrders returns empty array when storage has no orders');

function computeDashboardStats(ordersList) {
  let placed = 0;
  let preparing = 0;
  let ready = 0;
  let pickedUp = 0;

  ordersList.forEach((o) => {
    const st = (o.status || 'PLACED').toUpperCase();
    if (st === 'PLACED') placed++;
    else if (st === 'PREPARING') preparing++;
    else if (st === 'READY') ready++;
    else if (st === 'PICKED UP' || st === 'PICKED_UP') pickedUp++;
  });

  return {
    total: ordersList.length,
    placed,
    preparing,
    ready,
    pickedUp,
  };
}

const statsEmpty = computeDashboardStats(emptyOrders);
assert(statsEmpty.total === 0, 'Dashboard total orders is 0 on empty storage');
assert(statsEmpty.placed === 0, 'Dashboard placed orders is 0 on empty storage');
assert(statsEmpty.preparing === 0, 'Dashboard preparing orders is 0 on empty storage');
assert(statsEmpty.ready === 0, 'Dashboard ready orders is 0 on empty storage');
assert(statsEmpty.pickedUp === 0, 'Dashboard pickedUp orders is 0 on empty storage');

// Confirm no records were created in storage merely by reading/computing stats
const rawAfterEmpty = global.localStorage.getItem(ORDERS_STORAGE_KEY);
assert(rawAfterEmpty === null, 'No fake records were auto-created in localStorage');

// 2. LIVE STATISTICS AGGREGATION ACROSS MULTIPLE STATUSES
console.log('\n--- 2. LIVE STATISTICS AGGREGATION ACROSS STATUSES ---');
const testItem = MENU_ITEMS[0];

// Create Order 1 -> will remain PLACED
const ord1 = createOrder({
  customer: { name: 'Customer One', phone: '9876543211' },
  pickup: { date: '2026-09-18', time: '12:00', time12h: '12:00 PM' },
  items: [{ itemId: testItem.id, quantity: 1 }],
}).order;

// Create Order 2 -> will become PREPARING
const ord2 = createOrder({
  customer: { name: 'Customer Two', phone: '9876543212' },
  pickup: { date: '2026-09-18', time: '12:30', time12h: '12:30 PM' },
  items: [{ itemId: testItem.id, quantity: 2 }],
}).order;
updateOrderStatus(ord2.orderId, 'PREPARING');

// Create Order 3 -> will become READY
const ord3 = createOrder({
  customer: { name: 'Customer Three', phone: '9876543213' },
  pickup: { date: '2026-09-18', time: '13:00', time12h: '1:00 PM' },
  items: [{ itemId: testItem.id, quantity: 1 }],
}).order;
updateOrderStatus(ord3.orderId, 'READY', '1:00 PM');

// Create Order 4 -> will become PICKED UP
const ord4 = createOrder({
  customer: { name: 'Customer Four', phone: '9876543214' },
  pickup: { date: '2026-09-18', time: '13:30', time12h: '1:30 PM' },
  items: [{ itemId: testItem.id, quantity: 3 }],
}).order;
updateOrderStatus(ord4.orderId, 'PREPARING');
updateOrderStatus(ord4.orderId, 'READY');
updateOrderStatus(ord4.orderId, 'PICKED UP');

const populatedOrders = getAllOrders();
assert(populatedOrders.length === 4, 'Total 4 orders present in storage');

const statsPopulated = computeDashboardStats(populatedOrders);
assert(statsPopulated.total === 4, 'Total orders count matches exactly 4');
assert(statsPopulated.placed === 1, 'Placed orders count matches exactly 1');
assert(statsPopulated.preparing === 1, 'Preparing orders count matches exactly 1');
assert(statsPopulated.ready === 1, 'Ready orders count matches exactly 1');
assert(statsPopulated.pickedUp === 1, 'Picked Up orders count matches exactly 1');

// 3. RECENT QUEUE SLICE INTEGRITY
console.log('\n--- 3. RECENT QUEUE SLICE INTEGRITY ---');
const recentFive = populatedOrders.slice(0, 5);
assert(recentFive.length === 4, 'Recent orders slice returns all 4 when <= 5');
assert(recentFive[0].orderId === ord4.orderId, 'Most recently placed/updated order is first');

// 4. STORAGE SAFETY AGAINST CORRUPTED STORAGE
console.log('\n--- 4. STORAGE SAFETY AGAINST CORRUPTION ---');
global.localStorage.setItem(ORDERS_STORAGE_KEY, 'corrupted_json_string{');
const safeOrders = getAllOrders();
assert(Array.isArray(safeOrders) && safeOrders.length === 0, 'Corrupted JSON string safely returns empty array');
const safeStats = computeDashboardStats(safeOrders);
assert(safeStats.total === 0, 'Dashboard safely calculates 0 stats when storage is corrupted');

// SUMMARY
console.log('\n====================================================');
console.log(`TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
console.log('====================================================');

if (failCount > 0) {
  process.exit(1);
}
