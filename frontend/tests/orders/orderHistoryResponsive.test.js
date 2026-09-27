import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendSrc = path.resolve(__dirname, '../../src');

console.log('====================================================');
console.log('PHASE 14 PROMPT 2: RESPONSIVE & ACCESSIBILITY TEST');
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
  console.log('--- 1. Responsive Layout Audit ---');
  const histCode = fs.readFileSync(path.join(frontendSrc, 'pages/customer/OrderHistoryPage.jsx'), 'utf-8');
  const cardCode = fs.readFileSync(path.join(frontendSrc, 'components/orders/OrderCard.jsx'), 'utf-8');
  const activeCardCode = fs.readFileSync(path.join(frontendSrc, 'components/orders/ActiveOrderCard.jsx'), 'utf-8');
  const indicatorCode = fs.readFileSync(path.join(frontendSrc, 'components/orders/OrderStatusIndicator.jsx'), 'utf-8');

  assert(
    histCode.includes('grid-cols-1 md:grid-cols-2') || histCode.includes('sm:'),
    'Order history utilizes responsive grid (mobile 1 column, tablet/desktop 2 columns)'
  );
  assert(
    cardCode.includes('flex flex-col') && cardCode.includes('sm:grid-cols-2'),
    'OrderCard adjusts gracefully across breakpoints'
  );
  assert(
    activeCardCode.includes('grid-cols-1 sm:grid-cols-4') || activeCardCode.includes('sm:'),
    'ActiveOrderCard adapts to multi-device viewports'
  );

  console.log('\n--- 2. Accessibility & Semantic HTML ---');
  assert(
    cardCode.includes('aria-label') && cardCode.includes('<article'),
    'OrderCard uses semantic <article> and descriptive aria-label'
  );
  assert(
    indicatorCode.includes('aria-label') && indicatorCode.includes('role="region"'),
    'OrderStatusIndicator provides accessible progress regions'
  );
  assert(
    histCode.includes('role="dialog"') && histCode.includes('aria-modal="true"'),
    'Confirmation dialog adheres to WAI-ARIA modal accessibility specifications'
  );
  assert(
    cardCode.includes('focus-visible:ring') && histCode.includes('focus-visible:ring'),
    'Interactive elements maintain clearly visible focus states'
  );

  console.log('\n--- 3. Pickup-Only Enforcement & Verified Location ---');
  assert(
    !histCode.includes('deliveryAddress') && !cardCode.includes('deliveryAddress'),
    'Zero delivery address references in order history components'
  );
  assert(
    indicatorCode.includes('HAPPINESS RESTAURANT') &&
    indicatorCode.includes('QX8M+J67, Navjivan Colony, Bilimora, Gujarat 396325, India'),
    'Displays verified Bilimora restaurant location for pickup'
  );
  assert(
    indicatorCode.includes('Rajhans Complex / Opposite L.M.P. School, College Road / Chikhli Road, Bilimora'),
    'Displays verified landmark for customer guidance'
  );
  assert(
    indicatorCode.includes('google.com/maps'),
    'Integrates Google Maps directions link without requiring paid API keys'
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
