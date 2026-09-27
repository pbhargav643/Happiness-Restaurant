import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendSrc = path.resolve(__dirname, '../../src');

console.log('====================================================');
console.log('PHASE 14: CUSTOMER OWNERSHIP & SECURITY AUDIT');
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
  console.log('--- 1. Customer Order API Security Audit ---');
  const custApiPath = path.join(frontendSrc, 'services/customerOrderApi.js');
  assert(fs.existsSync(custApiPath), 'customerOrderApi.js exists');
  const custApiCode = fs.readFileSync(custApiPath, 'utf-8');

  assert(custApiCode.includes('customerStorage.getToken()'), 'Reads token from customerStorage');
  assert(custApiCode.includes('Authorization: `Bearer ${token}`'), 'Attaches Bearer token to customer requests');
  assert(!custApiCode.includes('customerId='), 'Never passes arbitrary customerId as a URL query param');
  assert(!custApiCode.includes('mobile='), 'Never substitutes mobile number for JWT authority');
  assert(custApiCode.includes('You are not authorized to view this order.'), 'Normalizes auth errors safely');

  console.log('\n--- 2. Public Order API Security Audit ---');
  const orderApiPath = path.join(frontendSrc, 'services/orderApi.js');
  assert(fs.existsSync(orderApiPath), 'orderApi.js exists');
  const orderApiCode = fs.readFileSync(orderApiPath, 'utf-8');

  assert(orderApiCode.includes('customerStorage.getToken()'), 'Attaches customer token if present in public order API');
  assert(orderApiCode.includes('You are not authorized to view this order.'), 'Normalizes 401/403 status codes');

  console.log('\n--- 3. TrackOrderPage Ownership Protection Audit ---');
  const trackPath = path.join(frontendSrc, 'pages/customer/TrackOrderPage.jsx');
  assert(fs.existsSync(trackPath), 'TrackOrderPage.jsx exists');
  const trackCode = fs.readFileSync(trackPath, 'utf-8');

  assert(trackCode.includes('isAuthenticated'), 'Differentiates authenticated customer vs guest tracking');
  assert(trackCode.includes('customerOrderApi.getMyOrderById'), 'Uses secure getMyOrderById for authenticated customers');
  assert(trackCode.includes('fetchError?.isAuthError'), 'Checks for authorization failure');
  assert(
    trackCode.includes('You are not authorized to view this order.'),
    'Displays "You are not authorized to view this order." upon 401/403'
  );
  assert(
    trackCode.includes('Access Denied'),
    'Displays "Access Denied" title on authorization rejection'
  );

  // Data isolation check: when unauthorized, trackedOrder is reset to null
  assert(trackCode.includes('setTrackedOrder(null)'), 'Resets trackedOrder to null when unauthorized');
  assert(!trackCode.includes('renderCustomerDetails(unauthorizedOrder)'), 'Does not render unauthorized order details');

  console.log('\n--- 4. Zero Secret Leaks in Frontend Tracking ---');
  assert(!trackCode.includes('password'), 'Zero passwords');
  assert(!trackCode.includes('JWT_SECRET'), 'Zero JWT secrets');
  assert(!trackCode.includes('WHATSAPP_API_KEY'), 'Zero WhatsApp secrets');
  assert(!trackCode.includes('SMS_API_KEY'), 'Zero SMS secrets');

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
