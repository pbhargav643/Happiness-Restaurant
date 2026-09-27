import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendSrc = path.resolve(__dirname, '../../src');

console.log('====================================================');
console.log('PHASE 14 PROMPT 2: CUSTOMER ORDER OWNERSHIP TEST');
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
  console.log('--- 1. Authenticated Customer API Security ---');
  const customerApiCode = fs.readFileSync(
    path.join(frontendSrc, 'services/customerOrderApi.js'),
    'utf-8'
  );

  assert(
    customerApiCode.includes('customerStorage.getToken()'),
    'Retrieves verified JWT Bearer token from customerStorage'
  );
  assert(
    customerApiCode.includes('Authorization: `Bearer ${token}`'),
    'Attaches JWT Bearer token in Authorization header for customer orders'
  );
  assert(
    !customerApiCode.includes("params.set('customerId'") && !customerApiCode.includes('body: JSON.stringify({ customerId'),
    'Never sends customerId query parameter or body field as authorization'
  );

  console.log('\n--- 2. Customer Order Isolation & Error Handling ---');
  assert(
    customerApiCode.includes('isAuthError') && customerApiCode.includes('You are not authorized to view this order.'),
    'Normalizes 401/403 errors to safe "You are not authorized to view this order."'
  );
  assert(
    customerApiCode.includes('isNotFound') && customerApiCode.includes('Order not found.'),
    'Normalizes 404 errors to safe "Order not found."'
  );

  console.log('\n--- 3. Page Level Ownership Enforcement ---');
  const histCode = fs.readFileSync(
    path.join(frontendSrc, 'pages/customer/OrderHistoryPage.jsx'),
    'utf-8'
  );
  const detailCode = fs.readFileSync(
    path.join(frontendSrc, 'pages/customer/OrderDetailPage.jsx'),
    'utf-8'
  );

  assert(
    histCode.includes('if (isAuthenticated) {') && histCode.includes('customerOrderApi.getMyOrders()'),
    'OrderHistoryPage strictly branches on isAuthenticated to use JWT-guarded endpoint'
  );
  assert(
    detailCode.includes('if (isAuthenticated) {') && detailCode.includes('customerOrderApi.getMyOrderById'),
    'OrderDetailPage strictly branches on isAuthenticated to use JWT-guarded endpoint'
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
