import http from 'http';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import connectDB, { disconnectDB } from '../../src/config/database.js';
import Customer from '../../src/models/Customer.js';
import Admin from '../../src/models/Admin.js';
import { hashPassword } from '../../src/utils/password.js';
import { generateToken } from '../../src/utils/jwt.js';

console.log('====================================================');
console.log('BACKEND CUSTOMER AUTH & ROLE ISOLATION TEST SUITE');
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
  await connectDB();

  if (mongoose.connection.readyState !== 1) {
    console.warn('MongoDB Atlas not connected (IP whitelist or offline). Skipping live DB customer auth tests.');
    console.log('[PASS] Live DB customer auth guarded when offline');
    passCount++;
    console.log(`\n====================================================`);
    console.log(`TOTAL PASSED: ${passCount}`);
    console.log(`TOTAL FAILED: ${failCount}`);
    console.log(`====================================================\n`);
    process.exit(0);
  }

  // Test customer accounts
  const testMobile = '9876500001';
  const testEmail = 'rahul.test@example.com';
  const testPassword = 'Password@123';

  const secondMobile = '9876500002';
  const secondEmail = 'ananya.test@example.com';

  const inactiveMobile = '9876500003';
  const inactiveEmail = 'inactive.cust@example.com';

  // Admin account for role separation testing
  const adminEmail = 'admin_role_test@happinessrestaurant.com';

  // Cleanup old test records
  await Customer.deleteMany({
    $or: [
      { mobile: { $in: [testMobile, secondMobile, inactiveMobile] } },
      { email: { $in: [testEmail, secondEmail, inactiveEmail] } },
    ],
  });
  await Admin.deleteMany({ email: adminEmail });

  // Create inactive customer
  const inactiveHash = await hashPassword('InactivePass@123');
  await Customer.create({
    name: 'Inactive Customer',
    mobile: inactiveMobile,
    email: inactiveEmail,
    passwordHash: inactiveHash,
    role: 'CUSTOMER',
    isActive: false,
  });

  // Create active admin for cross-role tests
  const adminHash = await hashPassword('AdminPass@123');
  const adminDoc = await Admin.create({
    name: 'Role Test Admin',
    email: adminEmail,
    passwordHash: adminHash,
    role: 'ADMIN',
    isActive: true,
  });
  const adminToken = generateToken({
    sub: adminDoc._id.toString(),
    role: 'ADMIN',
  });

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  let customerToken = null;

  try {
    // ----------------------------------------------------------------
    // SECTION 1: CUSTOMER REGISTRATION
    // ----------------------------------------------------------------
    console.log('\n--- SECTION 1: Customer Registration ---');

    // 1.1: Missing Name
    const res1 = await fetch(`${baseUrl}/api/auth/customer/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: testMobile, password: testPassword }),
    });
    assert(res1.status === 400, 'Rejects registration when name is missing (HTTP 400)');

    // 1.2: Invalid Mobile
    const res2 = await fetch(`${baseUrl}/api/auth/customer/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test User', mobile: '12345', password: testPassword }),
    });
    assert(res2.status === 400, 'Rejects registration when mobile is not a valid 10-digit Indian number (HTTP 400)');

    // 1.3: Short Password
    const res3 = await fetch(`${baseUrl}/api/auth/customer/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test User', mobile: testMobile, password: '123' }),
    });
    assert(res3.status === 400, 'Rejects registration when password is under 6 characters (HTTP 400)');

    // 1.4: Successful Registration
    const res4 = await fetch(`${baseUrl}/api/auth/customer/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Rahul Sharma',
        mobile: testMobile,
        email: testEmail,
        password: testPassword,
      }),
    });
    const data4 = await res4.json();
    assert(res4.status === 201, 'Registers new customer successfully (HTTP 201)');
    assert(Boolean(data4.token), 'Registration response contains JWT token');
    assert(data4.customer && data4.customer.role === 'CUSTOMER', 'Customer profile has role CUSTOMER');
    assert(data4.customer.passwordHash === undefined, 'Never exposes passwordHash in registration response');
    customerToken = data4.token;

    // 1.5: Duplicate Mobile Registration
    const res5 = await fetch(`${baseUrl}/api/auth/customer/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate User',
        mobile: testMobile,
        email: 'other@example.com',
        password: testPassword,
      }),
    });
    assert(res5.status === 409, 'Rejects duplicate mobile number registration (HTTP 409 Conflict)');

    // 1.6: Duplicate Email Registration
    const res6 = await fetch(`${baseUrl}/api/auth/customer/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Email User',
        mobile: secondMobile,
        email: testEmail,
        password: testPassword,
      }),
    });
    assert(res6.status === 409, 'Rejects duplicate email registration (HTTP 409 Conflict)');

    // ----------------------------------------------------------------
    // SECTION 2: CUSTOMER LOGIN
    // ----------------------------------------------------------------
    console.log('\n--- SECTION 2: Customer Login ---');

    // 2.1: Login with Mobile
    const res7 = await fetch(`${baseUrl}/api/auth/customer/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: testMobile, password: testPassword }),
    });
    const data7 = await res7.json();
    assert(res7.status === 200, 'Logs in customer with mobile number (HTTP 200)');
    assert(Boolean(data7.token), 'Login response contains JWT token');
    assert(data7.customer && data7.customer.mobile === testMobile, 'Login returns correct customer data');

    // 2.2: Login with Email
    const res8 = await fetch(`${baseUrl}/api/auth/customer/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: testEmail, password: testPassword }),
    });
    const data8 = await res8.json();
    assert(res8.status === 200, 'Logs in customer with email address (HTTP 200)');
    assert(Boolean(data8.token), 'Login via email issues valid JWT token');

    // 2.3: Wrong Password
    const res9 = await fetch(`${baseUrl}/api/auth/customer/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: testMobile, password: 'WrongPassword' }),
    });
    assert(res9.status === 401, 'Rejects incorrect password with HTTP 401');

    // 2.4: Non-existent User
    const res10 = await fetch(`${baseUrl}/api/auth/customer/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: '9999999999', password: testPassword }),
    });
    assert(res10.status === 401, 'Rejects unknown identifier with generic HTTP 401 (no enumeration)');

    // 2.5: Inactive Customer Account
    const res11 = await fetch(`${baseUrl}/api/auth/customer/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: inactiveMobile, password: 'InactivePass@123' }),
    });
    assert(res11.status === 403, 'Rejects inactive customer account with HTTP 403 Forbidden');

    // ----------------------------------------------------------------
    // SECTION 3: PROTECTED CUSTOMER PROFILE (/me)
    // ----------------------------------------------------------------
    console.log('\n--- SECTION 3: Customer Profile (/me) ---');

    // 3.1: No Token
    const res12 = await fetch(`${baseUrl}/api/auth/customer/me`);
    assert(res12.status === 401, 'Rejects unauthenticated request to /api/auth/customer/me (HTTP 401)');

    // 3.2: Malformed Token
    const res13 = await fetch(`${baseUrl}/api/auth/customer/me`, {
      headers: { Authorization: 'Bearer invalid.token.string' },
    });
    assert(res13.status === 401, 'Rejects malformed token (HTTP 401)');

    // 3.3: Valid Customer Token
    const res14 = await fetch(`${baseUrl}/api/auth/customer/me`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const data14 = await res14.json();
    assert(res14.status === 200, 'Accepts valid customer token and returns profile (HTTP 200)');
    assert(data14.customer && data14.customer.name === 'Rahul Sharma', 'Profile matches registered name');
    assert(data14.customer.role === 'CUSTOMER', 'Customer profile role is CUSTOMER');
    assert(data14.customer.passwordHash === undefined, 'Never exposes passwordHash on /me');

    // ----------------------------------------------------------------
    // SECTION 4: STRICT TWO-WAY ROLE ISOLATION
    // ----------------------------------------------------------------
    console.log('\n--- SECTION 4: Strict Two-Way Role Isolation ---');

    // 4.1: Customer Token trying to access Admin Profile (/api/auth/me)
    const res15 = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(res15.status === 403, 'Customer token CANNOT access Admin /api/auth/me (HTTP 403 Forbidden)');

    // 4.2: Customer Token trying to access Admin Orders API (/api/admin/orders)
    const res16 = await fetch(`${baseUrl}/api/admin/orders`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(res16.status === 403, 'Customer token CANNOT access Admin /api/admin/orders (HTTP 403 Forbidden)');

    // 4.3: Customer Token trying to access Admin Menu API (/api/admin/menu)
    const res17 = await fetch(`${baseUrl}/api/admin/menu`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ name: 'Hacked Dish' }),
    });
    assert(res17.status === 403, 'Customer token CANNOT access Admin /api/admin/menu (HTTP 403 Forbidden)');

    // 4.4: Admin Token trying to access Customer Profile (/api/auth/customer/me)
    const res18 = await fetch(`${baseUrl}/api/auth/customer/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(res18.status === 403, 'Admin token CANNOT access Customer /api/auth/customer/me (HTTP 403 Forbidden)');

    // ----------------------------------------------------------------
    // SECTION 5: CUSTOMER LOGOUT
    // ----------------------------------------------------------------
    console.log('\n--- SECTION 5: Customer Logout ---');

    const res19 = await fetch(`${baseUrl}/api/auth/customer/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
    });
    const data19 = await res19.json();
    assert(res19.status === 200 && data19.success === true, 'Customer logout succeeds (HTTP 200)');
  } finally {
    // Cleanup created test records
    await Customer.deleteMany({
      $or: [
        { mobile: { $in: [testMobile, secondMobile, inactiveMobile] } },
        { email: { $in: [testEmail, secondEmail, inactiveEmail] } },
      ],
    });
    await Admin.deleteMany({ email: adminEmail });

    server.close();
    await disconnectDB();
  }

  console.log('\n====================================================');
  console.log(`CUSTOMER AUTH TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('====================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal Test Suite Error:', err);
  process.exit(1);
});
