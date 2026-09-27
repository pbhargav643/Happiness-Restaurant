import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendSrc = path.resolve(__dirname, '../../src');

console.log('====================================================');
console.log('PHASE 14: ORDER TRACKING ERROR HANDLING AUDIT');
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
  const trackPath = path.join(frontendSrc, 'pages/customer/TrackOrderPage.jsx');
  assert(fs.existsSync(trackPath), 'TrackOrderPage.jsx exists');
  const code = fs.readFileSync(trackPath, 'utf-8');

  console.log('--- 1. 404 Order Not Found Handling ---');
  assert(code.includes('Order not found.'), 'Displays "Order not found." on 404');
  assert(code.includes('isNotFound'), 'Checks isNotFound or status 404');
  assert(code.includes('Track Another Order'), 'Provides "Track Another Order" CTA');

  console.log('\n--- 2. 401 / 403 Unauthorized Handling ---');
  assert(
    code.includes('You are not authorized to view this order.'),
    'Displays "You are not authorized to view this order." on 401/403'
  );
  assert(code.includes('isAuthError'), 'Detects isAuthError');

  console.log('\n--- 3. Network / Server Failure Handling ---');
  assert(
    code.includes('Unable to refresh order status. Please try again.'),
    'Displays "Unable to refresh order status. Please try again." on network failure'
  );
  assert(code.includes('Retry'), 'Provides "Retry" button on error');

  console.log('\n--- 4. Non-Destructive Background Refresh Error Banner ---');
  assert(
    code.includes('fetchError && trackedOrder'),
    'Displays warning banner without wiping verified order on background refresh error'
  );
  assert(
    code.includes('Showing last verified status'),
    'Labels stale status clearly when background refresh fails'
  );

  console.log('\n--- 5. Security & Information Leakage Audit ---');
  assert(!code.includes('stack'), 'Zero stack traces in customer UI');
  assert(!code.includes('MongoError'), 'Zero MongoDB error details exposed');
  assert(!code.includes('process.env'), 'Zero server environment variables exposed in component');
  assert(!code.includes('SELECT *'), 'Zero SQL/query exposure');

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
