import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendSrc = path.resolve(__dirname, '../../src');

console.log('====================================================');
console.log('PHASE 14: ORDER CONFIRMATION PAGE AUDIT');
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
  const confPath = path.join(frontendSrc, 'pages/customer/OrderConfirmationPage.jsx');
  assert(fs.existsSync(confPath), 'OrderConfirmationPage.jsx exists');
  const code = fs.readFileSync(confPath, 'utf-8');

  console.log('--- 1. Live Backend Order Retrieval ---');
  assert(code.includes('orderApi.getOrderById(orderId)'), 'Fetches authoritative order from backend via orderApi.getOrderById');
  assert(code.includes('setOrder(result.order)'), 'Sets order state directly from backend response');
  assert(!code.includes('localStorage.getItem(ACTIVE_ORDER_STORAGE_KEY)'), 'Does not use localStorage as authoritative source for order');

  console.log('\n--- 2. Required Confirmation Fields (Section 12) ---');
  assert(code.includes('order.orderId'), 'Displays Order ID');
  assert(code.includes('order.status'), 'Displays Order Status');
  assert(code.includes('order.items'), 'Displays itemized order items');
  assert(code.includes('order.pickup?.date'), 'Displays Pickup Date');
  assert(code.includes('order.pickup?.time'), 'Displays Pickup Time Slot');
  assert(code.includes('order.readyTime'), 'Displays Ready Time when available');
  assert(code.includes('order.subtotal'), 'Displays Total / Subtotal');

  console.log('\n--- 3. Strict Self-Pickup Notice ---');
  assert(code.includes('Restaurant Self-Pickup'), 'Displays "Restaurant Self-Pickup" service mode');
  assert(code.includes('Parcel Reception Desk'), 'Specifies Parcel Reception Desk collection counter');
  assert(code.includes('No home delivery is available.'), 'Explicitly warns that no home delivery is available');

  console.log('\n--- 4. Zero Delivery Language ---');
  assert(!code.toLowerCase().includes('delivery driver'), 'Zero delivery driver mentions');
  assert(!code.toLowerCase().includes('delivery fee'), 'Zero delivery fee mentions');
  assert(!code.toLowerCase().includes('delivery partner'), 'Zero delivery partner mentions');
  assert(!code.toLowerCase().includes('delivery eta'), 'Zero delivery ETA mentions');

  console.log('\n--- 5. Navigation CTAs ---');
  assert(code.includes('/track-order/'), 'Provides direct link to /track-order/:orderId');
  assert(code.includes('/orders'), 'Provides link to My Orders (/orders)');
  assert(code.includes('/menu'), 'Provides link to Menu (/menu)');

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
