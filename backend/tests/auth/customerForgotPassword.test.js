import http from 'http';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import connectDB, { disconnectDB } from '../../src/config/database.js';

console.log('====================================================');
console.log('BACKEND CUSTOMER FORGOT PASSWORD TEST SUITE');
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

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // ----------------------------------------------------------------
    // 1. Missing identifier validation
    // ----------------------------------------------------------------
    console.log('--- Test 1: Missing Identifier Validation ---');
    const res1 = await fetch(`${baseUrl}/api/auth/customer/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data1 = await res1.json();
    assert(res1.status === 400, 'Rejects empty body with HTTP 400');
    assert(data1.success === false, 'data1.success is false');
    assert(data1.message.includes('registered mobile number or email'), 'Reports identifier is required');

    // ----------------------------------------------------------------
    // 2. Invalid identifier format validation
    // ----------------------------------------------------------------
    console.log('\n--- Test 2: Invalid Identifier Format Validation ---');
    const res2 = await fetch(`${baseUrl}/api/auth/customer/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: '123invalid' }),
    });
    const data2 = await res2.json();
    assert(res2.status === 400, 'Rejects invalid format with HTTP 400');
    assert(data2.message.includes('valid 10-digit mobile number or email'), 'Reports valid format requirement');

    // ----------------------------------------------------------------
    // 3. Valid mobile format request (Generic response & no leakage)
    // ----------------------------------------------------------------
    console.log('\n--- Test 3: Valid Mobile Format Request ---');
    const res3 = await fetch(`${baseUrl}/api/auth/customer/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: '9876543210' }),
    });
    const data3 = await res3.json();
    assert(res3.status === 200, 'Accepts valid mobile with HTTP 200');
    assert(data3.success === true, 'data3.success is true');
    assert(typeof data3.message === 'string', 'Returns friendly descriptive message');
    assert(!JSON.stringify(data3).includes('passwordHash'), 'Zero passwordHash in response');
    assert(!JSON.stringify(data3).includes('resetToken'), 'Zero resetToken in response');
    assert(!JSON.stringify(data3).includes('token'), 'Zero auth token in response');

    // ----------------------------------------------------------------
    // 4. Valid email format request (Generic response & no leakage)
    // ----------------------------------------------------------------
    console.log('\n--- Test 4: Valid Email Format Request ---');
    const res4 = await fetch(`${baseUrl}/api/auth/customer/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'customer.test@happinessrestaurant.com' }),
    });
    const data4 = await res4.json();
    assert(res4.status === 200, 'Accepts valid email with HTTP 200');
    assert(data4.success === true, 'data4.success is true');
    assert(!JSON.stringify(data4).includes('passwordHash'), 'Zero passwordHash in response');
    assert(!JSON.stringify(data4).includes('resetToken'), 'Zero resetToken in response');

    // ----------------------------------------------------------------
    // 5. Provider transparency (Does not falsely claim sent when unconfigured)
    // ----------------------------------------------------------------
    console.log('\n--- Test 5: Provider Configuration Transparency ---');
    assert(
      data4.providerConfigured === false || data4.providerConfigured === true,
      'Response explicitly declares providerConfigured boolean status'
    );
    if (!data4.providerConfigured) {
      assert(
        !data4.message.includes('sent an email') && !data4.message.includes('SMS sent successfully'),
        'Does not falsely claim message was delivered when provider is unconfigured'
      );
    }
  } catch (err) {
    console.error('Test execution error:', err);
    failCount++;
  } finally {
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
