import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendSrc = path.resolve(__dirname, '../../src');

console.log('====================================================');
console.log('PHASE 14: ORDER TRACKING CORE VERIFICATION');
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
  console.log('--- 1. File Integrity & Code Base Structure ---');
  const trackOrderPath = path.join(frontendSrc, 'pages/customer/TrackOrderPage.jsx');
  assert(fs.existsSync(trackOrderPath), 'TrackOrderPage.jsx exists');
  const trackCode = fs.readFileSync(trackOrderPath, 'utf-8');

  // Authoritative Backend Synchronization
  console.log('\n--- 2. Real Backend Synchronization (Zero Mock Status) ---');
  assert(
    trackCode.includes('customerOrderApi.getMyOrderById') && trackCode.includes('orderApi.getOrderById'),
    'Fetches live order from backend APIs (customerOrderApi and orderApi)'
  );
  assert(!trackCode.includes('localStorage.setItem(ACTIVE_ORDER_STORAGE_KEY, JSON.stringify(updatedOrder))'), 'Does not write fake status updates to localStorage');
  assert(trackCode.includes('trackedOrder.status'), 'Renders status directly from backend response');

  // Controlled Refresh & Polling
  console.log('\n--- 3. Controlled Polling & Safe Refresh Verification ---');
  assert(trackCode.includes('POLLING_INTERVAL_MS = 30000'), 'Uses controlled 30-second polling interval (never aggressive 1s or 5s)');
  assert(trackCode.includes('isOrderCompleted(trackedOrder.status)'), 'Stops polling when order status is PICKED_UP / completed');
  assert(trackCode.includes('clearInterval(pollingTimerRef.current)'), 'Cleans up polling interval on completion and unmount');
  assert(trackCode.includes("window.addEventListener('focus'"), 'Implements safe refresh on window focus');
  assert(trackCode.includes('isFetchingRef.current'), 'Includes request deduplication guard to prevent overlapping calls');
  assert(trackCode.includes('handleManualRefresh'), 'Provides manual Refresh button for on-demand customer refresh');

  // Status Progression & Order Indicator
  console.log('\n--- 4. Status Progression & Component Integration ---');
  assert(trackCode.includes('<OrderStatusIndicator'), 'Integrates OrderStatusIndicator component');
  assert(trackCode.includes('readyTime={trackedOrder.readyTime}'), 'Passes backend readyTime to OrderStatusIndicator');

  // Compact Order Summary Details
  console.log('\n--- 5. Compact Order Summary (Section 9) ---');
  assert(trackCode.includes('Parcel Items & Pickup Schedule'), 'Displays parcel items and pickup schedule section');
  assert(trackCode.includes('trackedOrder.items?.map'), 'Renders itemized list of ordered items');
  assert(trackCode.includes('item.unitPrice ?? item.price'), 'Uses historical item price snapshot from order');
  assert(trackCode.includes('item.quantity'), 'Displays item quantity');
  assert(trackCode.includes('trackedOrder.subtotal'), 'Displays subtotal directly from backend order snapshot');
  assert(trackCode.includes('trackedOrder.pickup?.date'), 'Displays pickup date');
  assert(trackCode.includes('trackedOrder.pickup?.time'), 'Displays pickup time slot');

  // Ready Time Display
  console.log('\n--- 6. Ready Time Display ---');
  assert(trackCode.includes('trackedOrder.readyTime'), 'Inspects backend readyTime');
  assert(trackCode.includes('Ready around'), 'Displays "Ready around" prefix with readyTime');

  // Pickup-Only Enforcement
  console.log('\n--- 7. Strict Pickup-Only Enforcement (Zero Delivery) ---');
  assert(!trackCode.toLowerCase().includes('delivery partner'), 'Zero delivery partner mentions');
  assert(!trackCode.toLowerCase().includes('delivery driver'), 'Zero delivery driver mentions');
  assert(!trackCode.toLowerCase().includes('delivery fee'), 'Zero delivery fee mentions');
  assert(!trackCode.toLowerCase().includes('delivery tracking'), 'Zero delivery tracking mentions');
  assert(trackCode.includes('Counter Parcel Pickup') || trackCode.includes('Counter Takeaway'), 'Explicitly notes Counter Takeaway pickup');

  // Completed Order Permanence
  console.log('\n--- 8. Completed Order & Clear Tracking UI ---');
  assert(trackCode.includes('handleClearTracking'), 'Provides "Clear" action for tracking view UI');
  assert(trackCode.includes('clearActiveOrder()'), 'Clears active tracking reference without mutating backend orders');

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
