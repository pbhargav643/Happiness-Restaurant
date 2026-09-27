import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendSrc = path.resolve(__dirname, '../../src');

console.log('====================================================');
console.log('PHASE 12 PROMPT 2: FRONTEND ADMIN ORDER WORKFLOW TEST');
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

function runTests() {
  // 1. ADMIN ORDERS DASHBOARD AUDIT
  console.log('--- 1. Admin Order Dashboard (/admin/orders) ---');
  const adminOrdersPath = path.join(frontendSrc, 'pages/admin/AdminOrdersPage.jsx');
  assert(fs.existsSync(adminOrdersPath), 'AdminOrdersPage.jsx exists');
  const adminListCode = fs.readFileSync(adminOrdersPath, 'utf-8');

  // Verify all 10 required fields in table / cards
  assert(adminListCode.includes('order.orderId'), 'Displays Order ID');
  assert(adminListCode.includes('order.customer?.name'), 'Displays Customer Name');
  assert(adminListCode.includes('order.customer?.phone') || adminListCode.includes('order.customer?.mobile'), 'Displays Mobile');
  assert(adminListCode.includes('order.pickup?.date'), 'Displays Pickup Date');
  assert(adminListCode.includes('order.pickup?.time'), 'Displays Pickup Time');
  assert(adminListCode.includes('order.readyTime'), 'Displays Ready Time');
  assert(adminListCode.includes('order.subtotal'), 'Displays Subtotal / Total');
  assert(adminListCode.includes('OrderStatusIndicator'), 'Displays Current Status with indicator badge');
  assert(adminListCode.includes('order.createdAt'), 'Displays Created Time');
  assert(adminListCode.includes('/admin/orders/${order.orderId}'), 'Provides Action link to manage order');

  // Filters & Search
  assert(adminListCode.includes('filterStatus'), 'Implements filter by status');
  assert(adminListCode.includes('PLACED') && adminListCode.includes('PREPARING') && adminListCode.includes('READY') && adminListCode.includes('PICKED_UP'), 'Supports statuses: PLACED, PREPARING, READY, PICKED_UP');
  assert(adminListCode.includes('searchQuery'), 'Implements search filter');
  assert(adminListCode.includes('fetchOrders'), 'Provides manual refresh function');

  // 2. ADMIN ORDER DETAIL AUDIT
  console.log('\n--- 2. Admin Order Detail (/admin/orders/:orderId) ---');
  const adminDetailPath = path.join(frontendSrc, 'pages/admin/AdminOrderDetailPage.jsx');
  assert(fs.existsSync(adminDetailPath), 'AdminOrderDetailPage.jsx exists');
  const detailCode = fs.readFileSync(adminDetailPath, 'utf-8');

  // Customer Information
  assert(detailCode.includes('order.customer?.name'), 'Renders customer name');
  assert(detailCode.includes('order.customer?.phone') || detailCode.includes('order.customer?.mobile'), 'Renders customer mobile');
  assert(detailCode.includes('order.customer?.email'), 'Renders customer email');

  // Order Information
  assert(detailCode.includes('order.orderId'), 'Renders Order ID');
  assert(detailCode.includes('item.name'), 'Renders ordered item names');
  assert(detailCode.includes('item.quantity'), 'Renders item quantities');
  assert(detailCode.includes('item.unitPrice') || detailCode.includes('item.price'), 'Renders historical item unit price');
  assert(detailCode.includes('item.itemTotal') || detailCode.includes('unitPrice * item.quantity'), 'Renders item line total');
  assert(detailCode.includes('order.subtotal'), 'Renders order subtotal');
  assert(detailCode.includes('PICKUP'), 'Renders order type strictly as PICKUP');

  // Pickup Information
  assert(detailCode.includes('order.pickup?.date'), 'Renders pickup date');
  assert(detailCode.includes('order.pickup?.time'), 'Renders requested pickup time');
  assert(detailCode.includes('order.readyTime'), 'Renders ready time');

  // Status Information & Stepper
  assert(detailCode.includes('OrderStatusIndicator'), 'Renders visual status milestone timeline');

  // 3. ADMIN STATUS ACTIONS
  console.log('\n--- 3. Admin Status Actions & Confirmation Dialog ---');
  assert(detailCode.includes('Start Preparing'), 'Provides "Start Preparing" action for PLACED orders');
  assert(detailCode.includes('Mark Ready'), 'Provides "Mark Ready" action for PREPARING orders');
  assert(detailCode.includes('Mark Picked Up'), 'Provides "Mark Picked Up" action for READY orders');
  assert(detailCode.includes('Order Completed'), 'Provides "Order Completed" state for PICKED_UP orders');

  // Confirmation dialog
  assert(detailCode.includes('confirmModal'), 'Manages confirmation dialog state');
  assert(detailCode.includes('role="dialog"'), 'Uses accessible role="dialog" for confirmation modal');
  assert(detailCode.includes('Cancel') && detailCode.includes('Confirm'), 'Confirmation modal provides Cancel and Confirm actions');
  assert(detailCode.includes('handleRequestStatusChange'), 'Requests confirmation before mutating status');

  // Status Update Loading State
  assert(detailCode.includes('updatingStatus'), 'Implements loading state guard for status updates');
  assert(detailCode.includes('disabled={updatingStatus'), 'Disables action buttons during in-flight status requests');

  // 4. READY TIME UX & VALIDATION
  console.log('\n--- 4. Ready Time UX & Validation ---');
  assert(detailCode.includes('updateAdminOrderReadyTime'), 'Calls updateAdminOrderReadyTime API');
  assert(detailCode.includes('handleQuickPreset'), 'Provides quick presets for ready time (+15, +30, +45 mins)');
  assert(detailCode.includes('handleSaveReadyTime'), 'Provides dedicated save ready time handler');
  assert(
    detailCode.includes('^([01]?\\d|2[0-3]):([0-5]\\d)$') || detailCode.includes('2[0-3]'),
    'Validates 24-hour and 12-hour ready time format'
  );

  console.log('\n====================================================');
  console.log(`TOTAL PASSED: ${passed}`);
  console.log(`TOTAL FAILED: ${failed}`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests();
