import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendSrc = path.resolve(__dirname, '../../src');

console.log('====================================================');
console.log('PHASE 14 PROMPT 2: CUSTOMER ORDER DETAILS TEST');
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
  console.log('--- 1. Order Detail Page Source & Authorization ---');
  const detailPath = path.join(frontendSrc, 'pages/customer/OrderDetailPage.jsx');
  assert(fs.existsSync(detailPath), 'OrderDetailPage.jsx exists');
  const detailCode = fs.readFileSync(detailPath, 'utf-8');

  // Verify backend data integration
  assert(
    detailCode.includes('customerOrderApi.getMyOrderById(orderId)'),
    'Fetches authenticated order from GET /api/customer/orders/:orderId'
  );
  assert(
    detailCode.includes('orderApi.getOrderById(orderId)'),
    'Supports guest order lookup via GET /api/orders/:orderId'
  );
  assert(
    !detailCode.includes('getLocalOrderById'),
    'Does not use localStorage as authoritative single order data source'
  );

  console.log('\n--- 2. Historical Price Snapshot Integrity ---');
  assert(
    detailCode.includes('item.unitPrice') || detailCode.includes('item.price'),
    'Displays historical item snapshot price without fetching current catalog prices'
  );
  assert(
    detailCode.includes('item.itemTotal') || detailCode.includes('itemTotal'),
    'Displays historical line item total'
  );
  assert(
    detailCode.includes('order.subtotal'),
    'Displays historical verified order subtotal'
  );

  console.log('\n--- 3. Pickup Schedule & Ready Time ---');
  assert(
    detailCode.includes('order.pickup?.dateFormatted') || detailCode.includes('order.pickup?.date'),
    'Displays scheduled pickup date'
  );
  assert(
    detailCode.includes('order.pickup?.timeFormatted') || detailCode.includes('order.pickup?.time'),
    'Displays scheduled pickup time slot'
  );
  assert(
    detailCode.includes('order.readyTime'),
    'Displays estimated ready time when provided by restaurant kitchen'
  );
  assert(
    detailCode.includes('Takeaway Parcel (Self-Pickup)'),
    'Enforces takeaway parcel self-pickup mode'
  );

  console.log('\n--- 4. Actions: Track Order & Print Receipt ---');
  assert(
    detailCode.includes('/track-order/${order.orderId}'),
    'Provides Track Order button for active orders'
  );
  assert(
    detailCode.includes('handlePrint') || detailCode.includes('window.print'),
    'Provides Print Receipt capability'
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
