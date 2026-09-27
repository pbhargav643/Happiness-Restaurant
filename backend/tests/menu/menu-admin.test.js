import http from 'http';
import mongoose from 'mongoose';
import app from '../../app.js';
import connectDB, { disconnectDB } from '../../src/config/database.js';
import Admin from '../../src/models/Admin.js';
import { generateToken } from '../../src/utils/jwt.js';
import { hashPassword } from '../../src/utils/password.js';

console.log('====================================================');
console.log('ADMIN MENU MANAGEMENT API TEST SUITE');
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
    const testEmail = 'menu_admin_test_auto@happinessrestaurant.com';
    await Admin.deleteOne({ email: testEmail });
    const passwordHash = await hashPassword('AdminPass@123');
    const adminDoc = await Admin.create({
      name: 'Menu Admin Tester',
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

  try {
    // 1. POST /api/admin/menu - Input Validations
    console.log('--- Test 1: POST /api/admin/menu Input Validations ---');

    // Missing name
    const resNoName = await fetch(`${baseUrl}/api/admin/menu`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ category: 'soup', price: 120 }),
    });
    const dataNoName = await resNoName.json();
    assert(resNoName.status === 400, 'POST /api/admin/menu rejects missing name with HTTP 400');
    assert(dataNoName.success === false, 'Error response contains success: false');

    // Missing category
    const resNoCat = await fetch(`${baseUrl}/api/admin/menu`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ name: 'Veg Soup', price: 120 }),
    });
    assert(resNoCat.status === 400, 'POST /api/admin/menu rejects missing category with HTTP 400');

    // Missing price
    const resNoPrice = await fetch(`${baseUrl}/api/admin/menu`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ name: 'Veg Soup', category: 'soup' }),
    });
    assert(resNoPrice.status === 400, 'POST /api/admin/menu rejects missing price with HTTP 400');

    // Negative price
    const resNegPrice = await fetch(`${baseUrl}/api/admin/menu`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ name: 'Veg Soup', category: 'soup', price: -50 }),
    });
    const dataNegPrice = await resNegPrice.json();
    assert(resNegPrice.status === 400, 'POST /api/admin/menu rejects negative price with HTTP 400');
    assert(dataNegPrice.message.includes('non-negative'), 'Error message specifies price must be non-negative');

    // 2. PATCH /api/admin/menu/:itemId - Input Validations & 404
    console.log('\n--- Test 2: PATCH /api/admin/menu/:itemId Validations & 404 ---');
    const nonExistentId = '507f1f77bcf86cd799439011';

    // Negative price in PATCH
    const resPatchNegPrice = await fetch(`${baseUrl}/api/admin/menu/${nonExistentId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ price: -10 }),
    });
    assert(resPatchNegPrice.status === 400, 'PATCH /api/admin/menu/:itemId rejects negative price with HTTP 400');

    // Empty name in PATCH
    const resPatchEmptyName = await fetch(`${baseUrl}/api/admin/menu/${nonExistentId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ name: '   ' }),
    });
    assert(resPatchEmptyName.status === 400, 'PATCH /api/admin/menu/:itemId rejects empty name with HTTP 400');

    // Non-existent item PATCH
    const resPatchNotFound = await fetch(`${baseUrl}/api/admin/menu/${nonExistentId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ price: 150 }),
    });
    const dataPatchNotFound = await resPatchNotFound.json();
    assert(resPatchNotFound.status === 404, 'PATCH /api/admin/menu/:itemId returns 404 for non-existent item');
    assert(dataPatchNotFound.message === 'Menu item not found', '404 message indicates "Menu item not found"');

    // 3. PATCH /api/admin/menu/:itemId/availability
    console.log('\n--- Test 3: PATCH /api/admin/menu/:itemId/availability ---');

    // Missing isAvailable
    const resAvailMissing = await fetch(`${baseUrl}/api/admin/menu/${nonExistentId}/availability`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({}),
    });
    assert(resAvailMissing.status === 400, 'PATCH availability rejects missing boolean with HTTP 400');

    // Non-boolean isAvailable
    const resAvailInvalid = await fetch(`${baseUrl}/api/admin/menu/${nonExistentId}/availability`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ isAvailable: 'not-a-bool' }),
    });
    assert(resAvailInvalid.status === 400, 'PATCH availability rejects non-boolean value with HTTP 400');

    // Non-existent item availability update
    const resAvailNotFound = await fetch(`${baseUrl}/api/admin/menu/${nonExistentId}/availability`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ isAvailable: false }),
    });
    assert(resAvailNotFound.status === 404, 'PATCH availability returns 404 for non-existent item');

    // 4. DELETE /api/admin/menu/:itemId
    console.log('\n--- Test 4: DELETE /api/admin/menu/:itemId ---');
    const resDeleteNotFound = await fetch(`${baseUrl}/api/admin/menu/${nonExistentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dataDeleteNotFound = await resDeleteNotFound.json();
    assert(resDeleteNotFound.status === 404, 'DELETE /api/admin/menu/:itemId returns 404 for non-existent item');
    assert(dataDeleteNotFound.message === 'Menu item not found', 'DELETE 404 message indicates "Menu item not found"');
  } catch (err) {
    console.error('Admin menu test error:', err);
    failCount++;
  } finally {
    if (mongoose.connection.readyState === 1) {
      await Admin.deleteOne({ email: 'menu_admin_test_auto@happinessrestaurant.com' });
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
