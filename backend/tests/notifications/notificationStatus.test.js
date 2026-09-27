import http from 'http';
import app from '../../src/app.js';
import connectDB, { disconnectDB } from '../../src/config/database.js';
import Admin from '../../src/models/Admin.js';
import Customer from '../../src/models/Customer.js';
import { generateToken } from '../../src/utils/jwt.js';

console.log('====================================================');
console.log('PHASE 13: NOTIFICATION PROVIDER STATUS & RBAC TEST');
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
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    await connectDB();

    // 1. Unauthenticated Request -> 401
    console.log('--- 1. Authentication Check ---');
    const resUnauth = await fetch(`${baseUrl}/api/notifications/status`);
    assert(resUnauth.status === 401, 'Unauthenticated request to /api/notifications/status returns HTTP 401');

    // 2. Customer Role Authorization -> 403
    console.log('\n--- 2. RBAC: Customer Role Blocked ---');
    const customerToken = generateToken({ sub: 'cust_test_123', role: 'CUSTOMER' });
    const resCust = await fetch(`${baseUrl}/api/notifications/status`, {
      headers: {
        Authorization: `Bearer ${customerToken}`,
      },
    });
    assert(resCust.status === 403, 'Customer role request to /api/notifications/status returns HTTP 403 Forbidden');

    // 3. Admin Role Authorization -> 200
    console.log('\n--- 3. RBAC: Admin Role Authorized ---');
    const admin = await Admin.findOne({ role: 'ADMIN', isActive: true });
    assert(Boolean(admin), 'Found active admin in database');

    const adminToken = generateToken({ sub: admin._id.toString(), role: 'ADMIN' });
    const resAdmin = await fetch(`${baseUrl}/api/notifications/status`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    assert(resAdmin.status === 200, 'Admin role request returns HTTP 200');

    // 4. Response Schema Standard (Section 9)
    console.log('\n--- 4. Schema Compliance (Section 9) ---');
    const data = await resAdmin.json();
    assert(data.success === true, 'Response contains success: true');
    assert(typeof data.whatsapp === 'object', 'Response contains whatsapp object');
    assert(typeof data.whatsapp.configured === 'boolean', 'whatsapp.configured is boolean');
    assert(typeof data.whatsapp.provider === 'string', 'whatsapp.provider is string');

    assert(typeof data.sms === 'object', 'Response contains sms object');
    assert(typeof data.sms.configured === 'boolean', 'sms.configured is boolean');
    assert(typeof data.sms.provider === 'string', 'sms.provider is string');

    // 5. Zero Secret Exposure Audit
    console.log('\n--- 5. Security: Zero Secret Leakage ---');
    const rawJson = JSON.stringify(data);
    assert(!rawJson.toLowerCase().includes('key'), 'No API keys in response JSON');
    assert(!rawJson.toLowerCase().includes('secret'), 'No secrets in response JSON');
    assert(!rawJson.toLowerCase().includes('token'), 'No tokens in response JSON');
    assert(!rawJson.toLowerCase().includes('password'), 'No passwords in response JSON');

  } catch (err) {
    console.error('Notification status test error:', err);
    failCount++;
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
  }

  console.log('\n====================================================');
  console.log(`TOTAL PASSED: ${passCount}`);
  console.log(`TOTAL FAILED: ${failCount}`);
  console.log('====================================================\n');

  if (failCount > 0) process.exit(1);
}

runTests();
