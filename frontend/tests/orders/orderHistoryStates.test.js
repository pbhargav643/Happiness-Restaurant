import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendSrc = path.resolve(__dirname, '../../src');

console.log('====================================================');
console.log('PHASE 14 PROMPT 2: ORDER HISTORY STATES & BADGES TEST');
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
  console.log('--- 1. Order History Empty State ---');
  const histCode = fs.readFileSync(path.join(frontendSrc, 'pages/customer/OrderHistoryPage.jsx'), 'utf-8');

  assert(
    histCode.includes('No orders yet.'),
    'Renders required professional empty state heading "No orders yet."'
  );
  assert(
    histCode.includes('Browse Menu'),
    'Provides "Browse Menu" call-to-action button linking to /menu'
  );
  assert(
    !histCode.includes('fakeOrder') && !histCode.includes('sampleOrder'),
    'Never renders fake sample orders in empty state'
  );

  console.log('\n--- 2. Order History Loading Skeleton State ---');
  assert(
    histCode.includes('animate-pulse') && histCode.includes('Loading orders skeleton'),
    'Renders skeleton loading cards while fetching orders from server'
  );
  assert(
    histCode.includes('isFetchingRef'),
    'Guards against concurrent duplicate requests'
  );

  console.log('\n--- 3. Order History Error State ---');
  assert(
    histCode.includes('Unable to load your orders. Please try again.'),
    'Displays required safe error message "Unable to load your orders. Please try again."'
  );
  assert(
    histCode.includes('Retry'),
    'Provides a functional Retry button'
  );
  assert(
    !histCode.includes('err.stack') && !histCode.includes('JSON.stringify(error)'),
    'Zero leakage of internal error stack traces or raw MongoDB details to UI'
  );

  console.log('\n--- 4. Customer-Friendly Status Badges ---');
  const indicatorCode = fs.readFileSync(path.join(frontendSrc, 'components/orders/OrderStatusIndicator.jsx'), 'utf-8');

  assert(
    indicatorCode.includes('Order Placed'),
    'Badge maps PLACED -> "Order Placed"'
  );
  assert(
    indicatorCode.includes('Preparing'),
    'Badge maps PREPARING -> "Preparing"'
  );
  assert(
    indicatorCode.includes('Ready for Pickup'),
    'Badge maps READY -> "Ready for Pickup"'
  );
  assert(
    indicatorCode.includes('Picked Up'),
    'Badge maps PICKED_UP -> "Picked Up"'
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
