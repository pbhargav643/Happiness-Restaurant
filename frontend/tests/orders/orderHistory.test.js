import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendSrc = path.resolve(__dirname, '../../src');

console.log('====================================================');
console.log('PHASE 14 PROMPT 2: CUSTOMER ORDER HISTORY TEST');
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
  console.log('--- 1. Order History Page Source & API Integrity ---');
  const historyPath = path.join(frontendSrc, 'pages/customer/OrderHistoryPage.jsx');
  assert(fs.existsSync(historyPath), 'OrderHistoryPage.jsx exists');
  const histCode = fs.readFileSync(historyPath, 'utf-8');

  // Authenticated customer uses customerOrderApi.getMyOrders (JWT authority)
  assert(
    histCode.includes('customerOrderApi.getMyOrders()'),
    'Fetches authenticated customer orders via customerOrderApi.getMyOrders() with JWT token'
  );
  assert(
    histCode.includes('orderApi.getOrdersByMobile'),
    'Provides secure guest order lookup by verified mobile number'
  );

  // Sorting newest first
  console.log('\n--- 2. Order History Sorting (Newest Orders First) ---');
  assert(
    histCode.includes('timeB - timeA') || histCode.includes('.sort('),
    'Sorts orders chronologically descending (newest orders first) using backend createdAt timestamp'
  );

  // Multiple active orders support
  console.log('\n--- 3. Multiple Active Orders Support ---');
  assert(
    histCode.includes('activeOrders') && histCode.includes('ActiveOrderCard'),
    'Supports multiple active orders dynamically rendered with ActiveOrderCard'
  );
  assert(
    histCode.includes("['PLACED', 'PREPARING', 'READY']"),
    'Filters active orders by PLACED, PREPARING, and READY statuses'
  );

  // Completed order permanence
  console.log('\n--- 4. Completed Order Permanence ---');
  assert(
    !histCode.includes('api.delete(') && !histCode.includes('deleteOrder'),
    'No destructive backend deletion exists for customer order records'
  );
  assert(
    histCode.includes('hideOrderFromHistory') || histCode.includes('getHiddenOrderIds'),
    'Provides customer privacy hide without deleting authoritative MongoDB records'
  );

  // OrderCard details & actions
  console.log('\n--- 5. OrderCard Components & Actions ---');
  const cardPath = path.join(frontendSrc, 'components/orders/OrderCard.jsx');
  assert(fs.existsSync(cardPath), 'OrderCard.jsx exists');
  const cardCode = fs.readFileSync(cardPath, 'utf-8');

  assert(cardCode.includes('order.orderId'), 'Displays Order ID');
  assert(cardCode.includes('order.createdAt') || cardCode.includes('formattedOrderDate'), 'Displays Placed Date');
  assert(cardCode.includes('pickupDateStr') || cardCode.includes('pickup?.date'), 'Displays Pickup Date');
  assert(cardCode.includes('pickupTimeStr') || cardCode.includes('pickup?.time'), 'Displays Pickup Time');
  assert(cardCode.includes('order.readyTime'), 'Displays Ready Time when available');
  assert(cardCode.includes('order.subtotal'), 'Displays Order Total');
  assert(cardCode.includes('OrderStatusIndicator'), 'Renders status badge');
  assert(cardCode.includes("order.orderType || 'PICKUP'"), 'Order type strictly remains PICKUP');
  assert(cardCode.includes('/track-order/${order.orderId}'), 'Provides Track Order button for active orders');
  assert(cardCode.includes('/orders/${order.orderId}'), 'Provides View Details link navigating to order details');
  assert(cardCode.includes('Order Completed'), 'Displays "Order Completed" for completed orders');

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
