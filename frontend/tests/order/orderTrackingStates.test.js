import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  ORDER_STATUS_DESCRIPTIONS,
  getOrderStatusDescription,
  getOrderStatusStepIndex,
  isOrderCompleted,
} from '../../src/services/orderService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendSrc = path.resolve(__dirname, '../../src');

console.log('====================================================');
console.log('PHASE 14: ORDER TRACKING STATES & TIMELINE TEST');
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
  console.log('--- 1. Order Status Messages (Section 4 Requirements) ---');
  assert(
    ORDER_STATUS_DESCRIPTIONS.PLACED === 'Your order has been placed.',
    'PLACED status message: "Your order has been placed."'
  );
  assert(
    ORDER_STATUS_DESCRIPTIONS.PREPARING === 'Your order is being prepared.',
    'PREPARING status message: "Your order is being prepared."'
  );
  assert(
    ORDER_STATUS_DESCRIPTIONS.READY === 'Your parcel is ready for pickup.',
    'READY status message: "Your parcel is ready for pickup."'
  );
  assert(
    ORDER_STATUS_DESCRIPTIONS.PICKED_UP === 'Your order has been completed.',
    'PICKED_UP status message: "Your order has been completed."'
  );

  console.log('\n--- 2. Helper Functions Verification ---');
  assert(getOrderStatusDescription('PLACED') === 'Your order has been placed.', 'getOrderStatusDescription("PLACED") works');
  assert(getOrderStatusDescription('PREPARING') === 'Your order is being prepared.', 'getOrderStatusDescription("PREPARING") works');
  assert(getOrderStatusDescription('READY') === 'Your parcel is ready for pickup.', 'getOrderStatusDescription("READY") works');
  assert(getOrderStatusDescription('PICKED_UP') === 'Your order has been completed.', 'getOrderStatusDescription("PICKED_UP") works');
  assert(getOrderStatusDescription('PICKED UP') === 'Your order has been completed.', 'getOrderStatusDescription("PICKED UP") works');

  assert(getOrderStatusStepIndex('PLACED') === 0, 'Step index 0 for PLACED');
  assert(getOrderStatusStepIndex('PREPARING') === 1, 'Step index 1 for PREPARING');
  assert(getOrderStatusStepIndex('READY') === 2, 'Step index 2 for READY');
  assert(getOrderStatusStepIndex('PICKED_UP') === 3, 'Step index 3 for PICKED_UP');
  assert(getOrderStatusStepIndex('PICKED UP') === 3, 'Step index 3 for PICKED UP');

  assert(!isOrderCompleted('PLACED'), 'PLACED is not completed');
  assert(!isOrderCompleted('PREPARING'), 'PREPARING is not completed');
  assert(!isOrderCompleted('READY'), 'READY is not completed');
  assert(isOrderCompleted('PICKED_UP'), 'PICKED_UP is completed');
  assert(isOrderCompleted('PICKED UP'), 'PICKED UP is completed');

  console.log('\n--- 3. OrderStatusIndicator Component Audit ---');
  const indicatorPath = path.join(frontendSrc, 'components/orders/OrderStatusIndicator.jsx');
  assert(fs.existsSync(indicatorPath), 'OrderStatusIndicator.jsx exists');
  const code = fs.readFileSync(indicatorPath, 'utf-8');

  // Check that all 4 statuses are represented
  assert(code.includes('PLACED'), 'Component handles PLACED');
  assert(code.includes('PREPARING'), 'Component handles PREPARING');
  assert(code.includes('READY'), 'Component handles READY');
  assert(code.includes('PICKED UP') || code.includes('PICKED_UP'), 'Component handles PICKED UP');

  // Checkmark logic for reached milestones
  assert(code.includes('idx <= currentStep'), 'Renders checkmark icon for reached milestones');

  // READY FOR PICKUP details
  console.log('\n--- 4. READY FOR PICKUP Section Audit ---');
  assert(code.includes('READY FOR PICKUP'), 'Renders prominent "READY FOR PICKUP" heading');
  assert(code.includes('Your parcel is ready for pickup.'), 'Renders parcel readiness message');
  assert(code.includes('HAPPINESS RESTAURANT'), 'Displays HAPPINESS RESTAURANT branding');
  assert(code.includes('QX8M+J67, Navjivan Colony, Bilimora, Gujarat 396325, India'), 'Displays verified Bilimora address');
  assert(code.includes('Rajhans Complex / Opposite L.M.P. School, College Road / Chikhli Road, Bilimora'), 'Displays verified landmark');
  assert(code.includes('Get Directions'), 'Provides "Get Directions" button');
  assert(code.includes('google.com/maps'), 'Directs customer to Google Maps without requiring an API key');

  // ORDER COMPLETED section
  console.log('\n--- 5. ORDER COMPLETED Section Audit ---');
  assert(code.includes('ORDER COMPLETED'), 'Renders "ORDER COMPLETED" banner for completed orders');
  assert(code.includes('Order History'), 'Notes permanent record in Order History');

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
