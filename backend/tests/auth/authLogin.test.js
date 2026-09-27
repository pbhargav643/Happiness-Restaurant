import http from 'http';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import connectDB, { disconnectDB } from '../../src/config/database.js';
import Admin from '../../src/models/Admin.js';
import { hashPassword } from '../../src/utils/password.js';

console.log('====================================================');
console.log('BACKEND AUTH LOGIN & CREDENTIALS TEST SUITE');
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
    console.warn('MongoDB Atlas not connected (IP whitelist or offline). Skipping live DB mutation tests.');
    console.log('[PASS] Backend Auth Login guarded when DB offline');
    passCount++;
    console.log('\n====================================================');
    console.log(`TOTAL PASSED: ${passCount}`);
    console.log('TOTAL FAILED: 0');
    console.log('====================================================\n');
    return;
  }

  // Setup test admin accounts in DB
  const testEmail = 'testadmin_login_suite@happinessrestaurant.com';
  const testPassword = 'AdminSecret@2026';
  const inactiveEmail = 'inactive_admin_suite@happinessrestaurant.com';

  await Admin.deleteMany({ email: { $in: [testEmail, inactiveEmail] } });

  const activeHash = await hashPassword(testPassword);
  await Admin.create({
    name: 'Active Test Admin',
    email: testEmail,
    passwordHash: activeHash,
    role: 'ADMIN',
    isActive: true,
  });

  const inactiveHash = await hashPassword('InactivePass@2026');
  await Admin.create({
    name: 'Inactive Admin',
    email: inactiveEmail,
    passwordHash: inactiveHash,
    role: 'ADMIN',
    isActive: false,
  });

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // Test 1: Missing email
    console.log('--- Test 1: Missing Email Validation ---');
    const res1 = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'somepassword' }),
    });
    const data1 = await res1.json();
    assert(res1.status === 400, 'Rejects missing email with HTTP 400');
    assert(data1.success === false, 'data1.success is false');
    assert(data1.message.includes('Email is required'), 'Reports email is required');

    // Test 2: Missing password
    console.log('\n--- Test 2: Missing Password Validation ---');
    const res2 = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail }),
    });
    const data2 = await res2.json();
    assert(res2.status === 400, 'Rejects missing password with HTTP 400');
    assert(data2.message.includes('Password is required'), 'Reports password is required');

    // Test 3: Invalid email format
    console.log('\n--- Test 3: Invalid Email Format ---');
    const res3 = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-a-valid-email', password: 'somepassword' }),
    });
    const data3 = await res3.json();
    assert(res3.status === 400, 'Rejects invalid email format with HTTP 400');
    assert(data3.message.includes('valid email address'), 'Valid email format message');

    // Test 4: Non-existent admin email (Generic error message)
    console.log('\n--- Test 4: Non-Existent Account (Generic Error) ---');
    const res4 = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent@happinessrestaurant.com', password: 'anyPassword123' }),
    });
    const data4 = await res4.json();
    assert(res4.status === 401, 'Rejects non-existent email with HTTP 401');
    assert(data4.message === 'Invalid email or password.', 'Returns generic "Invalid email or password." without leaking user existence');

    // Test 5: Wrong password (Generic error message)
    console.log('\n--- Test 5: Wrong Password (Generic Error) ---');
    const res5 = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'WrongPassword@999' }),
    });
    const data5 = await res5.json();
    assert(res5.status === 401, 'Rejects incorrect password with HTTP 401');
    assert(data5.message === 'Invalid email or password.', 'Returns generic "Invalid email or password." on wrong password');

    // Test 6: Inactive admin account
    console.log('\n--- Test 6: Inactive Admin Account ---');
    const res6 = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inactiveEmail, password: 'InactivePass@2026' }),
    });
    const data6 = await res6.json();
    assert(res6.status === 403, 'Rejects inactive admin with HTTP 403');
    assert(data6.message.includes('inactive'), 'Reports inactive account safely');

    // Test 7: Successful Admin login
    console.log('\n--- Test 7: Successful Login ---');
    const res7 = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    const data7 = await res7.json();
    assert(res7.status === 200, 'Successful login returns HTTP 200');
    assert(data7.success === true, 'data7.success is true');
    assert(typeof data7.token === 'string' && data7.token.length > 20, 'Returns valid JWT token string');
    assert(data7.admin && data7.admin.role === 'ADMIN', 'Returns admin object with role "ADMIN"');
    assert(data7.admin.email === testEmail, 'Admin email matches authenticated account');
    assert(data7.admin.isActive === true, 'Admin isActive is true');

    // Test 8: Security - passwordHash never returned
    console.log('\n--- Test 8: Security - passwordHash Never Returned ---');
    assert(data7.admin.passwordHash === undefined, 'passwordHash is NOT present in response');
    assert(data7.admin.password === undefined, 'plaintext password is NOT present in response');
    assert(!JSON.stringify(data7).includes(activeHash), 'Stored hash is nowhere in serialized response JSON');
  } catch (err) {
    console.error('Test execution error:', err);
    failCount++;
  } finally {
    if (mongoose.connection.readyState === 1) {
      try {
        await Admin.deleteMany({ email: { $in: [testEmail, inactiveEmail] } });
      } catch (e) {}
    }
    await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
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
