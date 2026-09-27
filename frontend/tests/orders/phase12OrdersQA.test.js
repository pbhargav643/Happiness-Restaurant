import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendSrc = path.resolve(__dirname, '../../src');

console.log('====================================================');
console.log('PHASE 12 PROMPT 1: REAL ORDERS & ADMIN QA SUITE');
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
  // 1. CHECKOUT SOURCE AUDIT
  console.log('--- 1. Customer Checkout & Real API Submission ---');
  const checkoutPath = path.join(frontendSrc, 'pages/customer/CheckoutPage.jsx');
  assert(fs.existsSync(checkoutPath), 'CheckoutPage.jsx exists');
  const checkoutCode = fs.readFileSync(checkoutPath, 'utf-8');

  assert(checkoutCode.includes('orderApi.createOrder'), 'Checkout calls centralized orderApi.createOrder');
  assert(checkoutCode.includes('Placing Order...'), 'Checkout shows "Placing Order..." loading state');
  assert(checkoutCode.includes('isSubmitting'), 'Checkout implements isSubmitting duplicate-click guard');
  assert(checkoutCode.includes('clearCart()'), 'Checkout clears cart upon successful order placement');
  assert(
    checkoutCode.includes('navigate(`/order-confirmation/${result.order.orderId}`)'),
    'Checkout navigates to /order-confirmation/:orderId using backend orderId'
  );
  assert(
    !checkoutCode.includes('subtotal: subtotal') && !checkoutCode.includes('price: item.price'),
    'Checkout payload does NOT send frontend prices or subtotals as authoritative'
  );

  // 2. ORDER CONFIRMATION AUDIT
  console.log('\n--- 2. Order Confirmation Page Audit ---');
  const confirmationPath = path.join(frontendSrc, 'pages/customer/OrderConfirmationPage.jsx');
  assert(fs.existsSync(confirmationPath), 'OrderConfirmationPage.jsx exists');
  const confCode = fs.readFileSync(confirmationPath, 'utf-8');

  assert(confCode.includes('orderApi.getOrderById'), 'Fetches live order from backend orderApi.getOrderById');
  assert(
    !confCode.includes('getLocalOrderById'),
    'Does NOT use getLocalOrderById from localStorage as order authority'
  );
  assert(confCode.includes('HAPPINESS RESTAURANT'), 'Displays HAPPINESS RESTAURANT branding');
  assert(confCode.includes('order.orderId'), 'Displays real Order ID');
  assert(confCode.includes('order.subtotal'), 'Displays subtotal');
  assert(confCode.includes('order.status'), 'Displays current status');
  assert(confCode.includes('/track-order'), 'Provides Track Order navigation CTA');
  assert(confCode.includes('/orders'), 'Provides Order History navigation CTA');
  assert(confCode.includes('/menu'), 'Provides Continue Shopping navigation CTA');

  // 3. CUSTOMER ORDER HISTORY AUDIT
  console.log('\n--- 3. Customer Order History Page Audit ---');
  const historyPath = path.join(frontendSrc, 'pages/customer/OrderHistoryPage.jsx');
  assert(fs.existsSync(historyPath), 'OrderHistoryPage.jsx exists');
  const histCode = fs.readFileSync(historyPath, 'utf-8');

  assert(
    histCode.includes('customerOrderApi.getMyOrders()'),
    'Authenticated customers fetch orders via customerOrderApi.getMyOrders()'
  );
  assert(
    histCode.includes('orderApi.getOrdersByMobile'),
    'Guest customers fetch orders via orderApi.getOrdersByMobile(mobile)'
  );

  // 4. REAL ORDER TRACKING AUDIT
  console.log('\n--- 4. Real Order Tracking Audit ---');
  const trackingPath = path.join(frontendSrc, 'pages/customer/TrackOrderPage.jsx');
  assert(fs.existsSync(trackingPath), 'TrackOrderPage.jsx exists');
  const trackCode = fs.readFileSync(trackingPath, 'utf-8');

  assert(
    trackCode.includes('orderApi.getOrderById') || trackCode.includes('customerOrderApi.getMyOrderById'),
    'Fetches authoritative order status from backend'
  );
  assert(
    !trackCode.includes('getLocalOrderById'),
    'Does NOT read from localStorage getLocalOrderById'
  );

  // 5. ADMIN ORDERS & STATUS MANAGEMENT AUDIT
  console.log('\n--- 5. Admin Order Queue & Status Controls ---');
  const adminOrdersPath = path.join(frontendSrc, 'pages/admin/AdminOrdersPage.jsx');
  assert(fs.existsSync(adminOrdersPath), 'AdminOrdersPage.jsx exists');
  const adminListCode = fs.readFileSync(adminOrdersPath, 'utf-8');

  assert(adminListCode.includes('adminOrderApi.getAdminOrders()'), 'Admin orders page calls getAdminOrders()');
  assert(adminListCode.includes('/admin/orders/'), 'Links to individual order ticket /admin/orders/:orderId');

  const adminDetailPath = path.join(frontendSrc, 'pages/admin/AdminOrderDetailPage.jsx');
  assert(fs.existsSync(adminDetailPath), 'AdminOrderDetailPage.jsx exists');
  const adminDetailCode = fs.readFileSync(adminDetailPath, 'utf-8');

  assert(
    adminDetailCode.includes('adminOrderApi.updateAdminOrderStatus'),
    'Admin calls updateAdminOrderStatus for status progression'
  );
  assert(
    adminDetailCode.includes('adminOrderApi.updateAdminOrderReadyTime'),
    'Admin calls updateAdminOrderReadyTime for estimated/actual pickup ready time'
  );
  assert(
    adminDetailCode.includes('targetStepIndex !== currentStepIndex + 1'),
    'Frontend strictly validates that status progression only advances exactly 1 step'
  );
  assert(
    adminDetailCode.includes('disabled={updatingStatus || !isNext}'),
    'Frontend disables invalid status transitions and future skipped steps'
  );

  // 6. LOCALSTORAGE AUDIT
  console.log('\n--- 6. LocalStorage Audit ---');
  const orderApiPath = path.join(frontendSrc, 'services/orderApi.js');
  const orderApiCode = fs.readFileSync(orderApiPath, 'utf-8');

  assert(
    !orderApiCode.includes("localStorage.setItem(ORDERS_STORAGE_KEY"),
    'orderApi does NOT write complete authoritative order records to restaurant_orders in localStorage'
  );

  // 7. FILE FORMAT AUDIT (0 .mjs, 0 .ts, 0 .tsx in frontend/src and frontend/tests)
  console.log('\n--- 7. Source File Format Audit ---');
  function scanDir(dir, forbiddenExts) {
    let found = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name !== 'node_modules' && ent.name !== '.git') {
          found = found.concat(scanDir(full, forbiddenExts));
        }
      } else if (ent.isFile()) {
        const ext = path.extname(ent.name).toLowerCase();
        if (forbiddenExts.includes(ext)) {
          found.push(full);
        }
      }
    }
    return found;
  }

  const forbidden = ['.mjs', '.ts', '.tsx'];
  const srcForbidden = scanDir(frontendSrc, forbidden);
  assert(srcForbidden.length === 0, `No forbidden files in frontend/src (found: ${srcForbidden.length})`);

  const testsForbidden = scanDir(path.resolve(__dirname, '..'), forbidden);
  assert(testsForbidden.length === 0, `No forbidden files in frontend/tests (found: ${testsForbidden.length})`);

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
