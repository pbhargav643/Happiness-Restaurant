import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendSrc = path.resolve(__dirname, '../../src');

console.log('====================================================');
console.log('PHASE 12 PROMPT 2: CUSTOMER ORDER TRACKING TEST');
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
  console.log('--- 1. Order Status Indicator & Milestones ---');
  const indicatorPath = path.join(frontendSrc, 'components/orders/OrderStatusIndicator.jsx');
  assert(fs.existsSync(indicatorPath), 'OrderStatusIndicator.jsx exists');
  const indicatorCode = fs.readFileSync(indicatorPath, 'utf-8');

  // Verify the 4 stages
  assert(indicatorCode.includes('PLACED'), 'Includes PLACED step');
  assert(indicatorCode.includes('PREPARING'), 'Includes PREPARING step');
  assert(indicatorCode.includes('READY'), 'Includes READY step');
  assert(indicatorCode.includes('PICKED UP') || indicatorCode.includes('PICKED_UP'), 'Includes PICKED UP step');

  // READY FOR PICKUP UI Requirements
  console.log('\n--- 2. READY FOR PICKUP State UI Audit ---');
  assert(indicatorCode.includes('READY FOR PICKUP'), 'Displays "READY FOR PICKUP" title');
  assert(
    indicatorCode.includes('Your parcel is ready for pickup.'),
    'Displays "Your parcel is ready for pickup."'
  );
  assert(
    indicatorCode.includes('Please collect your parcel from HAPPINESS RESTAURANT.'),
    'Displays "Please collect your parcel from HAPPINESS RESTAURANT."'
  );
  assert(indicatorCode.includes('HAPPINESS RESTAURANT'), 'Displays HAPPINESS RESTAURANT branding');
  assert(
    indicatorCode.includes('QX8M+J67, Navjivan Colony, Bilimora, Gujarat 396325, India'),
    'Displays verified restaurant address'
  );
  assert(
    indicatorCode.includes('Rajhans Complex / Opposite L.M.P. School, College Road / Chikhli Road, Bilimora'),
    'Displays verified restaurant landmark'
  );
  assert(indicatorCode.includes('Get Directions'), 'Provides "Get Directions" action');
  assert(indicatorCode.includes('View Order Details'), 'Provides "View Order Details" action');

  // PICKED UP / ORDER COMPLETED UI Requirements
  console.log('\n--- 3. ORDER COMPLETED State UI Audit ---');
  assert(indicatorCode.includes('ORDER COMPLETED'), 'Displays "ORDER COMPLETED" title');

  // Zero Delivery Features
  console.log('\n--- 4. Strict Self-Pickup Enforcement (Zero Delivery) ---');
  assert(!indicatorCode.includes('driver'), 'Zero delivery driver tracking');
  assert(!indicatorCode.includes('delivery partner'), 'Zero delivery partner tracking');
  assert(!indicatorCode.includes('out for delivery'), 'Zero out for delivery status');

  // Track Order Page Audit
  console.log('\n--- 5. Track Order Page (/track-order) ---');
  const trackPath = path.join(frontendSrc, 'pages/customer/TrackOrderPage.jsx');
  assert(fs.existsSync(trackPath), 'TrackOrderPage.jsx exists');
  const trackCode = fs.readFileSync(trackPath, 'utf-8');

  assert(
    trackCode.includes('orderApi.getOrderById') || trackCode.includes('customerOrderApi.getMyOrderById'),
    'Fetches live order from backend'
  );
  assert(trackCode.includes('handleClearTracking'), 'Provides clear tracking option');
  assert(trackCode.includes('clearActiveOrder'), 'Clears active tracking UI reference without deleting backend order');

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
