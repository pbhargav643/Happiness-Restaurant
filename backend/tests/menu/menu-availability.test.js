import http from 'http';
import mongoose from 'mongoose';
import app from '../../app.js';
import connectDB, { disconnectDB } from '../../src/config/database.js';
import Admin from '../../src/models/Admin.js';
import { generateToken } from '../../src/utils/jwt.js';
import { hashPassword } from '../../src/utils/password.js';

console.log('====================================================');
console.log('ADMIN MENU ITEM AVAILABILITY API TEST SUITE');
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

  let adminId = new mongoose.Types.ObjectId().toString();
  if (mongoose.connection.readyState === 1) {
    const testEmail = 'menu_avail_test_auto@happinessrestaurant.com';
    await Admin.deleteOne({ email: testEmail });
    const passwordHash = await hashPassword('AdminPass@123');
    const adminDoc = await Admin.create({
      name: 'Menu Avail Tester',
      email: testEmail,
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    });
    adminId = adminDoc._id.toString();
  }
  const adminToken = generateToken({ sub: adminId, role: 'ADMIN' });
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  };

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  const nonExistentId = '507f1f77bcf86cd799439011';

  try {
    // 1. Missing isAvailable field (400)
    console.log('--- Test 1: Missing isAvailable Field Rejection ---');
    const resMissing = await fetch(`${baseUrl}/api/admin/menu/${nonExistentId}/availability`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({}),
    });
    const dataMissing = await resMissing.json();

    assert(resMissing.status === 400, 'Missing isAvailable field returns HTTP 400');
    assert(dataMissing.success === false, 'Response has success: false');
    assert(dataMissing.message.includes('isAvailable'), 'Message indicates isAvailable is required');

    // 2. Non-boolean values rejection (400)
    console.log('\n--- Test 2: Non-Boolean isAvailable Values Rejection ---');
    const invalidValues = ['true', 1, 0, null, 'false', {}, []];
    for (const val of invalidValues) {
      const resInvalid = await fetch(`${baseUrl}/api/admin/menu/${nonExistentId}/availability`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ isAvailable: val }),
      });
      const dataInvalid = await resInvalid.json();
      assert(resInvalid.status === 400, `Rejects non-boolean value (${JSON.stringify(val)}) with HTTP 400`);
      assert(dataInvalid.success === false, 'Error response has success: false');
    }

    // 3. Non-existent Item ID (404)
    console.log('\n--- Test 3: Non-Existent Item ID Handling ---');
    const resNotFound = await fetch(`${baseUrl}/api/admin/menu/${nonExistentId}/availability`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ isAvailable: false }),
    });
    const dataNotFound = await resNotFound.json();

    assert(resNotFound.status === 404, 'Non-existent item returns HTTP 404');
    assert(dataNotFound.success === false, 'Response has success: false');
    assert(dataNotFound.message === 'Menu item not found', 'Message strictly matches: "Menu item not found"');

    // 4. Malformed ObjectId (404)
    console.log('\n--- Test 4: Malformed Item ID Handling ---');
    const resMalformed = await fetch(`${baseUrl}/api/admin/menu/malformed_id_xyz/availability`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ isAvailable: true }),
    });
    const dataMalformed = await resMalformed.json();

    assert(resMalformed.status === 404, 'Malformed ID returns HTTP 404 safely');
    assert(dataMalformed.success === false, 'Response has success: false');
  } catch (err) {
    console.error('Menu availability test error:', err);
    failCount++;
  } finally {
    if (mongoose.connection.readyState === 1) {
      await Admin.deleteOne({ email: 'menu_avail_test_auto@happinessrestaurant.com' });
    }
    server.close();
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
