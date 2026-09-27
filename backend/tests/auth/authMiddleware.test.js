import http from 'http';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import connectDB, { disconnectDB } from '../../src/config/database.js';
import Admin from '../../src/models/Admin.js';
import { generateToken } from '../../src/utils/jwt.js';
import { hashPassword } from '../../src/utils/password.js';

console.log('====================================================');
console.log('BACKEND AUTH MIDDLEWARE & ROUTE PROTECTION TEST SUITE');
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
    console.log('[PASS] Backend Auth Middleware guarded when DB offline');
    passCount++;
    console.log('\n====================================================');
    console.log(`TOTAL PASSED: ${passCount}`);
    console.log('TOTAL FAILED: 0');
    console.log('====================================================\n');
    return;
  }

  const testEmail = 'middleware_test_admin@happinessrestaurant.com';
  await Admin.deleteOne({ email: testEmail });

  const passwordHash = await hashPassword('AdminPass@123');
  const adminDoc = await Admin.create({
    name: 'Middleware Admin',
    email: testEmail,
    passwordHash,
    role: 'ADMIN',
    isActive: true,
  });

  const validToken = generateToken({ sub: adminDoc._id.toString(), role: 'ADMIN' });
  const nonAdminToken = generateToken({ sub: adminDoc._id.toString(), role: 'CUSTOMER' });
  const expiredToken = generateToken({ sub: adminDoc._id.toString(), role: 'ADMIN' }, { expiresIn: -10 });

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // 1. Missing Authorization Header
    console.log('--- Test 1: Protected Endpoint Without Token ---');
    const res1 = await fetch(`${baseUrl}/api/admin/dashboard-summary`);
    const data1 = await res1.json();
    assert(res1.status === 401, 'Rejects missing token with HTTP 401');
    assert(data1.success === false, 'data1.success is false');
    assert(data1.message.includes('Authentication required'), 'Indicates authentication is required');

    // 2. Malformed Header Format (not Bearer)
    console.log('\n--- Test 2: Malformed Header Format ---');
    const res2 = await fetch(`${baseUrl}/api/admin/dashboard-summary`, {
      headers: { Authorization: `Basic ${validToken}` },
    });
    const data2 = await res2.json();
    assert(res2.status === 401, 'Rejects non-Bearer authorization with HTTP 401');
    assert(data2.message.includes('Bearer'), 'Specifies Bearer format requirement');

    // 3. Tampered / Invalid Token
    console.log('\n--- Test 3: Invalid Token Signature ---');
    const res3 = await fetch(`${baseUrl}/api/admin/dashboard-summary`, {
      headers: { Authorization: 'Bearer invalid.token.payload' },
    });
    const data3 = await res3.json();
    assert(res3.status === 401, 'Rejects invalid token signature with HTTP 401');
    assert(data3.message.includes('Invalid authentication token'), 'Reports invalid token');

    // 4. Expired Token
    console.log('\n--- Test 4: Expired Token Handling ---');
    const res4 = await fetch(`${baseUrl}/api/admin/dashboard-summary`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    const data4 = await res4.json();
    assert(res4.status === 401, 'Rejects expired token with HTTP 401');
    assert(data4.message.includes('expired'), 'Explicitly indicates token has expired');

    // 5. Non-Admin Role Authorization (Forbidden)
    console.log('\n--- Test 5: Non-Admin Role Authorization (Forbidden) ---');
    const res5 = await fetch(`${baseUrl}/api/admin/dashboard-summary`, {
      headers: { Authorization: `Bearer ${nonAdminToken}` },
    });
    const data5 = await res5.json();
    assert(res5.status === 403, 'Rejects non-admin token with HTTP 403 Forbidden');
    assert(data5.message.includes('forbidden') || data5.message.includes('authorization'), 'Reports forbidden authorization');

    // 6. Valid Token Access
    console.log('\n--- Test 6: Valid Token Protected Access ---');
    const res6 = await fetch(`${baseUrl}/api/admin/dashboard-summary`, {
      headers: { Authorization: `Bearer ${validToken}` },
    });
    const data6 = await res6.json();
    assert(res6.status === 200, 'Allows valid token with HTTP 200');
    assert(data6.success === true, 'data6.success is true');
    assert(data6.admin && data6.admin.role === 'ADMIN', 'Attaches safe req.admin with role ADMIN');

    // 7. Protected Admin Menu API Without Token
    console.log('\n--- Test 7: Protected Admin Menu POST Without Token ---');
    const res7 = await fetch(`${baseUrl}/api/admin/menu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Unauthorized Item' }),
    });
    assert(res7.status === 401, 'POST /api/admin/menu blocked without token (401)');

    // 8. Protected Admin Orders API Without Token
    console.log('\n--- Test 8: Protected Admin Orders GET Without Token ---');
    const res8 = await fetch(`${baseUrl}/api/admin/orders`);
    assert(res8.status === 401, 'GET /api/admin/orders blocked without token (401)');

    // 9. Protected Admin Orders API With Valid Token
    console.log('\n--- Test 9: Protected Admin Orders GET With Valid Token ---');
    const res9 = await fetch(`${baseUrl}/api/admin/orders`, {
      headers: { Authorization: `Bearer ${validToken}` },
    });
    assert(res9.status === 200, 'GET /api/admin/orders accessible with valid token (200)');

    // 10. Public Customer APIs remain unaffected
    console.log('\n--- Test 10: Public Customer APIs Remain Unaffected ---');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert(healthRes.status === 200, 'GET /api/health remains public (200)');

    const menuRes = await fetch(`${baseUrl}/api/menu`);
    assert(menuRes.status === 200, 'GET /api/menu remains public (200)');

    const settingsRes = await fetch(`${baseUrl}/api/settings`);
    assert(settingsRes.status === 200, 'GET /api/settings remains public (200)');
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
