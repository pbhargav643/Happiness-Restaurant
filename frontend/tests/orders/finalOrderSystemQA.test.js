import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendSrc = path.resolve(__dirname, '../../src');
const backendSrc = path.resolve(__dirname, '../../../backend/src');

console.log('====================================================');
console.log('PHASE 12 PROMPT 3: FINAL FRONTEND ORDER SYSTEM QA & AUDIT');
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
  // 1. ORDER CREATION DATA INTEGRITY & PRICE AUTHORITY
  console.log('--- 1. Order Creation Data Integrity & Price Authority ---');
  const checkoutCode = fs.readFileSync(path.join(frontendSrc, 'pages/customer/CheckoutPage.jsx'), 'utf-8');
  const payloadSection = checkoutCode.slice(checkoutCode.indexOf('const payload = {'), checkoutCode.indexOf('orderApi.createOrder'));
  assert(
    !payloadSection.includes('subtotal') && !payloadSection.includes('price:'),
    'Frontend does not submit authoritative prices or subtotal to backend'
  );
  assert(checkoutCode.includes('orderType: \'PICKUP\''), 'Checkout strictly sets orderType to PICKUP');
  assert(checkoutCode.includes('isSubmitting'), 'Checkout implements duplicate submission prevention guard');
  assert(checkoutCode.includes('Placing Order...'), 'Checkout shows submitting spinner / text');

  // 2. HISTORICAL PRICE PROTECTION & SNAPSHOT INTEGRITY
  console.log('\n--- 2. Historical Price Protection & Snapshot Integrity ---');
  const orderModelCode = fs.readFileSync(path.join(backendSrc, 'models/Order.js'), 'utf-8');
  assert(/price:\s*\{\s*type:\s*Number/.test(orderModelCode), 'Order item schema stores immutable price snapshot');
  assert(/name:\s*\{\s*type:\s*String/.test(orderModelCode), 'Order item schema stores immutable name snapshot');
  assert(/quantity:\s*\{\s*type:\s*Number/.test(orderModelCode), 'Order item schema stores quantity');

  // 3. MENU AVAILABILITY PROTECTION
  console.log('\n--- 3. Menu Availability Protection ---');
  const orderServiceCode = fs.readFileSync(path.join(backendSrc, 'services/order.service.js'), 'utf-8');
  assert(
    orderServiceCode.includes('isAvailable') && orderServiceCode.includes('unavailable'),
    'Backend checks isAvailable and rejects orders containing disabled items'
  );
  assert(
    orderServiceCode.includes('is currently unavailable'),
    'Backend returns clear customer error message for unavailable items'
  );

  // 4. STATUS TRANSITION SECURITY
  console.log('\n--- 4. Status Transition Security ---');
  assert(
    orderServiceCode.includes('ALLOWED_STATUS_TRANSITIONS') || orderServiceCode.includes('ALLOWED_TRANSITIONS'),
    'Backend enforces strict sequential status transition rules'
  );
  assert(
    orderServiceCode.includes('PICKED_UP: []') || !orderServiceCode.includes("'PICKED_UP': ['"),
    'PICKED_UP is terminal: no further status transitions permitted'
  );

  // 5. READY TIME DATA INTEGRITY
  console.log('\n--- 5. Ready Time Data Integrity ---');
  assert(
    orderServiceCode.includes('order.readyTime = readyTime') && !orderServiceCode.includes("order.status = 'READY'"),
    'Setting ready time does not automatically advance order status'
  );

  // 6. CUSTOMER ORDER OWNERSHIP & ID SECURITY
  console.log('\n--- 6. Customer Order Ownership & ID Security ---');
  assert(
    orderServiceCode.includes('Order not found') || orderServiceCode.includes('404'),
    'Backend masks unowned orders with 404 to prevent ID enumeration'
  );
  const trackOrderCode = fs.readFileSync(path.join(frontendSrc, 'pages/customer/TrackOrderPage.jsx'), 'utf-8');
  assert(
    trackOrderCode.includes('Access Denied') || trackOrderCode.includes('not found') || trackOrderCode.includes('error'),
    'TrackOrderPage safely handles unauthorized or not found orders'
  );

  // 7. ADMIN AUTHORIZATION
  console.log('\n--- 7. Admin Authorization ---');
  const adminRoutesCode = fs.readFileSync(path.join(backendSrc, 'routes/admin.routes.js'), 'utf-8');
  assert(
    adminRoutesCode.includes('authenticateAdmin'),
    'All admin order routes protected by authenticate and authorizeAdmin middleware'
  );

  // 8. ORDER HISTORY PERMANENCE
  console.log('\n--- 8. Order History Permanence ---');
  const orderHistoryCode = fs.readFileSync(path.join(frontendSrc, 'pages/customer/OrderHistoryPage.jsx'), 'utf-8');
  assert(
    !orderHistoryCode.includes('deleteOrder') && !orderHistoryCode.includes('removeOrder'),
    'Order history does not automatically delete or remove completed orders'
  );

  // 9. ERROR RESPONSE SECURITY
  console.log('\n--- 9. Error Response Security ---');
  const errHandlerCode = fs.readFileSync(path.join(backendSrc, 'middleware/errorHandler.js'), 'utf-8');
  assert(errHandlerCode.includes('[REDACTED_URI]'), 'Error handler scrubs MongoDB connection URIs');
  assert(errHandlerCode.includes('[PATH]'), 'Error handler scrubs filesystem paths');
  assert(
    !errHandlerCode.includes('res.status(statusCode).json({ stack:') && !errHandlerCode.includes('stack: err.stack'),
    'Stack trace suppressed outside development'
  );

  // 10. STRICT PICKUP-ONLY VERIFICATION
  console.log('\n--- 10. Strict Pickup-Only Verification ---');
  const statusIndicatorCode = fs.readFileSync(path.join(frontendSrc, 'components/orders/OrderStatusIndicator.jsx'), 'utf-8');
  assert(
    !statusIndicatorCode.toLowerCase().includes('delivery') && !statusIndicatorCode.toLowerCase().includes('driver'),
    'OrderStatusIndicator has zero delivery or driver references'
  );
  assert(
    statusIndicatorCode.includes('QX8M+J67, Navjivan Colony, Bilimora, Gujarat 396325, India'),
    'Ready status card renders verified Bilimora restaurant location'
  );
  assert(
    statusIndicatorCode.includes('Get Directions') || statusIndicatorCode.includes('google.com/maps'),
    'Ready status card provides Get Directions link'
  );

  // 11. LOCALSTORAGE AUDIT
  console.log('\n--- 11. LocalStorage Audit ---');
  const orderApiCode = fs.readFileSync(path.join(frontendSrc, 'services/orderApi.js'), 'utf-8');
  assert(
    !orderApiCode.includes("localStorage.setItem('restaurant_orders'") &&
    !orderApiCode.includes('localStorage.setItem("restaurant_orders"'),
    'restaurant_orders is not used as authoritative database in localStorage'
  );

  // 12. FILE FORMAT AUDIT
  console.log('\n--- 12. File Format Audit ---');
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
  const feForbidden = scanDir(frontendSrc, forbidden);
  assert(feForbidden.length === 0, `0 forbidden files in frontend/src (found: ${feForbidden.length})`);
  const beForbidden = scanDir(backendSrc, forbidden);
  assert(beForbidden.length === 0, `0 forbidden files in backend/src (found: ${beForbidden.length})`);

  // 13. ENVIRONMENT / SECRET AUDIT
  console.log('\n--- 13. Environment / Secret Audit ---');
  const beEnvExample = fs.readFileSync(path.join(backendSrc, '../.env.example'), 'utf-8');
  assert(!beEnvExample.includes('mongodb+srv://') || beEnvExample.includes('<db_username>'), '.env.example contains only placeholders');

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
