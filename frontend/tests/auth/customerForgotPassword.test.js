/**
 * Frontend Customer Forgot Password Feature Test Suite
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '../..');

let mockStore = {};
global.localStorage = {
  getItem: (key) => mockStore[key] || null,
  setItem: (key, val) => { mockStore[key] = String(val); },
  removeItem: (key) => { delete mockStore[key]; },
  clear: () => { mockStore = {}; },
};

global.window = {
  localStorage: global.localStorage,
  dispatchEvent: () => {},
};

let lastFetchCall = null;
global.fetch = async (url, options = {}) => {
  lastFetchCall = { url, options };

  if (url.includes('/auth/customer/forgot-password')) {
    const body = options.body ? JSON.parse(options.body) : {};
    if (!body.identifier || !body.identifier.trim()) {
      return {
        ok: false,
        status: 400,
        headers: { get: () => 'application/json' },
        json: async () => ({
          success: false,
          message: 'Please enter your registered mobile number or email address.',
        }),
      };
    }

    return {
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        success: true,
        providerConfigured: false,
        message: 'Password reset request received. If an account is registered with this information, instructions have been logged. Please note automated dispatch is currently operating in offline mode; contact the counter desk at +91 98765 43210 for prompt assistance.',
      }),
    };
  }

  return {
    ok: false,
    status: 404,
    headers: { get: () => 'application/json' },
    json: async () => ({ success: false, message: 'Not found' }),
  };
};

import { customerAuthApi, customerStorage } from '../../src/services/customerAuthApi.js';

console.log('====================================================');
console.log('FRONTEND CUSTOMER FORGOT PASSWORD TEST SUITE');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${message}`);
    failCount++;
  }
}

async function runTests() {
  try {
    mockStore = {};

    // ----------------------------------------------------------------
    // 1. Static Verification: CustomerLoginPage contains Forgot Password link
    // ----------------------------------------------------------------
    console.log('--- 1. CustomerLoginPage Forgot Password Link Presence ---');
    const loginPagePath = path.join(frontendDir, 'src/pages/customer/CustomerLoginPage.jsx');
    assert(fs.existsSync(loginPagePath), 'CustomerLoginPage.jsx exists');

    const loginPageCode = fs.readFileSync(loginPagePath, 'utf8');
    assert(loginPageCode.includes('Forgot Password?'), 'CustomerLoginPage includes "Forgot Password?" text');
    assert(loginPageCode.includes('to="/forgot-password"'), 'CustomerLoginPage links to "/forgot-password"');
    assert(loginPageCode.includes('id="customer-password"'), 'CustomerLoginPage preserves existing password input ID');
    assert(loginPageCode.includes('id="customer-identifier"'), 'CustomerLoginPage preserves existing identifier input ID');
    assert(loginPageCode.includes('Sign In'), 'CustomerLoginPage preserves "Sign In" button');
    assert(loginPageCode.includes('Create an account'), 'CustomerLoginPage preserves "Create an account" link');
    assert(loginPageCode.includes('Order directly as Guest'), 'CustomerLoginPage preserves "Order directly as Guest" link');
    assert(loginPageCode.includes('Return to Home'), 'CustomerLoginPage preserves "Return to Home" link');

    // ----------------------------------------------------------------
    // 2. Static Verification: ForgotPasswordPage Structure & Elements
    // ----------------------------------------------------------------
    console.log('\n--- 2. ForgotPasswordPage Component Verification ---');
    const forgotPagePath = path.join(frontendDir, 'src/pages/customer/ForgotPasswordPage.jsx');
    assert(fs.existsSync(forgotPagePath), 'ForgotPasswordPage.jsx exists');

    const forgotPageCode = fs.readFileSync(forgotPagePath, 'utf8');
    assert(forgotPageCode.includes('Forgot Password?'), 'ForgotPasswordPage includes "Forgot Password?" heading');
    assert(
      forgotPageCode.includes('Enter your registered mobile number or email address.'),
      'ForgotPasswordPage includes instruction "Enter your registered mobile number or email address."'
    );
    assert(forgotPageCode.includes('Mobile Number or Email'), 'ForgotPasswordPage includes "Mobile Number or Email" label');
    assert(forgotPageCode.includes('Send Reset Instructions'), 'ForgotPasswordPage includes "Send Reset Instructions" button');
    assert(forgotPageCode.includes('Back to Login'), 'ForgotPasswordPage includes "Back to Login" navigation');
    assert(forgotPageCode.includes('to="/login"'), 'ForgotPasswordPage links back to "/login"');

    // ----------------------------------------------------------------
    // 3. Static Verification: AppRoutes Route Mounting
    // ----------------------------------------------------------------
    console.log('\n--- 3. AppRoutes Routing Configuration ---');
    const appRoutesPath = path.join(frontendDir, 'src/routes/AppRoutes.jsx');
    const appRoutesCode = fs.readFileSync(appRoutesPath, 'utf8');
    assert(appRoutesCode.includes('ForgotPasswordPage'), 'AppRoutes imports ForgotPasswordPage');
    assert(appRoutesCode.includes('path="/forgot-password"'), 'AppRoutes registers /forgot-password route');

    // ----------------------------------------------------------------
    // 4. API Client: customerAuthApi.forgotPassword
    // ----------------------------------------------------------------
    console.log('\n--- 4. customerAuthApi.forgotPassword Service Method ---');
    assert(typeof customerAuthApi.forgotPassword === 'function', 'customerAuthApi.forgotPassword is a function');

    const res = await customerAuthApi.forgotPassword({ identifier: '9876543210' });
    assert(res.success === true, 'forgotPassword request succeeds');
    assert(lastFetchCall !== null, 'Fetch was dispatched');
    assert(lastFetchCall.url.includes('/auth/customer/forgot-password'), 'Dispatches to /auth/customer/forgot-password');
    assert(lastFetchCall.options.method === 'POST', 'HTTP method is POST');

    // ----------------------------------------------------------------
    // 5. Security & Session Storage Immunity
    // ----------------------------------------------------------------
    console.log('\n--- 5. Security & Storage Cleanliness ---');
    assert(customerStorage.getToken() === null, 'No token stored during forgot password request');
    assert(customerStorage.getCustomer() === null, 'No customer profile stored during forgot password request');
    assert(!JSON.stringify(mockStore).includes('password'), 'Storage remains completely free of credentials');

  } catch (err) {
    console.error('Test execution error:', err);
    failCount++;
  }

  console.log('\n====================================================');
  console.log(`TOTAL PASSED: ${passCount}`);
  console.log(`TOTAL FAILED: ${failCount}`);
  console.log('====================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();
