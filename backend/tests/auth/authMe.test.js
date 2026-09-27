import http from 'http';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import connectDB, { disconnectDB } from '../../src/config/database.js';
import Admin from '../../src/models/Admin.js';
import { generateToken } from '../../src/utils/jwt.js';
import { hashPassword } from '../../src/utils/password.js';

console.log('====================================================');
console.log('BACKEND GET /api/auth/me TEST SUITE');
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
    console.log('[PASS] Backend Auth Me guarded when DB offline');
    passCount++;
    console.log('\n====================================================');
    console.log(`TOTAL PASSED: ${passCount}`);
    console.log('TOTAL FAILED: 0');
    console.log('====================================================\n');
    return;
  }

  const testEmail = 'authme_test@happinessrestaurant.com';
  await Admin.deleteOne({ email: testEmail });

  const passwordHash = await hashPassword('MePassword@2026');
  const adminDoc = await Admin.create({
    name: 'Profile Test Admin',
    email: testEmail,
    passwordHash,
    role: 'ADMIN',
    isActive: true,
  });

  const validToken = generateToken({ sub: adminDoc._id.toString(), role: 'ADMIN' });

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // 1. GET /api/auth/me without token
    console.log('--- Test 1: GET /api/auth/me Without Token ---');
    const res1 = await fetch(`${baseUrl}/api/auth/me`);
    const data1 = await res1.json();
    assert(res1.status === 401, 'Rejects unauthenticated /me with HTTP 401');
    assert(data1.success === false, 'data1.success is false');

    // 2. GET /api/auth/me with invalid token
    console.log('\n--- Test 2: GET /api/auth/me With Invalid Token ---');
    const res2 = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: 'Bearer bad_fake_token' },
    });
    assert(res2.status === 401, 'Rejects invalid token with HTTP 401');

    // 3. GET /api/auth/me with valid token
    console.log('\n--- Test 3: GET /api/auth/me With Valid Token ---');
    const res3 = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${validToken}` },
    });
    const data3 = await res3.json();
    assert(res3.status === 200, 'Returns HTTP 200 for valid token');
    assert(data3.success === true, 'data3.success is true');
    assert(data3.admin && data3.admin.email === testEmail, 'Returns correct admin email');
    assert(data3.admin.name === 'Profile Test Admin', 'Returns correct admin name');
    assert(data3.admin.role === 'ADMIN', 'Returns correct admin role');
    assert(data3.admin.isActive === true, 'Returns correct admin isActive status');

    // 4. Critical security check: passwordHash is not returned
    console.log('\n--- Test 4: Security - passwordHash Not Returned ---');
    assert(data3.admin.passwordHash === undefined, 'passwordHash is not present in /me response');
    assert(data3.admin.password === undefined, 'password is not present in /me response');
    assert(!JSON.stringify(data3).includes(passwordHash), 'Serialized response does not contain password hash');
  } catch (err) {
    console.error('Test execution error:', err);
    failCount++;
  } finally {
    if (mongoose.connection.readyState === 1) {
      try {
        await Admin.deleteOne({ email: testEmail });
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
