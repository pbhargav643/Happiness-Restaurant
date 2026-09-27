import http from 'http';
import mongoose from 'mongoose';
import app from '../../app.js';
import { generateToken } from '../../src/utils/jwt.js';

console.log('====================================================');
console.log('PHASE 13: NOTIFICATION AUTHORIZATION & SECURITY TEST');
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

  const adminToken = generateToken({
    sub: new mongoose.Types.ObjectId().toString(),
    role: 'ADMIN',
  });
  const adminHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  };

  const customerToken = generateToken({
    sub: new mongoose.Types.ObjectId().toString(),
    role: 'CUSTOMER',
  });
  const customerHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${customerToken}`,
  };

  try {
    // 1. Unauthenticated Request Blocked (HTTP 401)
    console.log('--- 1. Unauthenticated Access Blocked ---');
    const unauthLogRes = await fetch(`${baseUrl}/api/notifications/order/RF-20260925-AUTH01`);
    assert(unauthLogRes.status === 401, 'Unauthenticated user blocked from GET /api/notifications/order/:orderId (HTTP 401)');

    const unauthStatusRes = await fetch(`${baseUrl}/api/notifications/status`);
    assert(unauthStatusRes.status === 401, 'Unauthenticated user blocked from GET /api/notifications/status (HTTP 401)');

    const unauthRetryRes = await fetch(`${baseUrl}/api/notifications/order/RF-20260925-AUTH01/retry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert(unauthRetryRes.status === 401, 'Unauthenticated user blocked from POST /api/notifications/order/:orderId/retry (HTTP 401)');

    // 2. Customer Role Blocked (HTTP 403 Forbidden)
    console.log('\n--- 2. Customer Role Blocked ---');
    const custLogRes = await fetch(`${baseUrl}/api/notifications/order/RF-20260925-AUTH01`, {
      headers: customerHeaders,
    });
    assert(custLogRes.status === 403, 'Customer role blocked from viewing notification logs (HTTP 403)');

    const custStatusRes = await fetch(`${baseUrl}/api/notifications/status`, {
      headers: customerHeaders,
    });
    assert(custStatusRes.status === 403, 'Customer role blocked from viewing provider status (HTTP 403)');

    const custRetryRes = await fetch(`${baseUrl}/api/notifications/order/RF-20260925-AUTH01/retry`, {
      method: 'POST',
      headers: customerHeaders,
      body: JSON.stringify({}),
    });
    assert(custRetryRes.status === 403, 'Customer role blocked from notification retry (HTTP 403)');

    // 3. Admin Role Authorized (HTTP 200)
    console.log('\n--- 3. Admin Role Authorized ---');
    const adminStatusRes = await fetch(`${baseUrl}/api/notifications/status`, {
      headers: adminHeaders,
    });
    assert(adminStatusRes.status === 200, 'Admin authorized for GET /api/notifications/status (HTTP 200)');
    const statusJson = await adminStatusRes.json();
    assert(statusJson.success === true, 'Provider status response has success: true');
    assert(statusJson.providers?.whatsapp !== undefined, 'Contains whatsapp status');
    assert(statusJson.providers?.sms !== undefined, 'Contains sms status');

    const adminLogRes = await fetch(`${baseUrl}/api/notifications/order/RF-20260925-AUTH01`, {
      headers: adminHeaders,
    });
    assert(adminLogRes.status === 200, 'Admin authorized for GET /api/notifications/order/:orderId (HTTP 200)');

  } catch (err) {
    console.error('Authorization test error:', err);
    failCount++;
  } finally {
    server.close();
  }

  console.log('\n====================================================');
  console.log(`TOTAL PASSED: ${passCount}`);
  console.log(`TOTAL FAILED: ${failCount}`);
  console.log('====================================================\n');

  if (failCount > 0) process.exit(1);
}

runTests();
