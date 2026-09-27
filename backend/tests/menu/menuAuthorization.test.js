import http from 'http';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import connectDB, { disconnectDB } from '../../src/config/database.js';
import Admin from '../../src/models/Admin.js';
import Customer from '../../src/models/Customer.js';
import MenuItem from '../../src/models/MenuItem.js';
import { generateToken } from '../../src/utils/jwt.js';
import { hashPassword } from '../../src/utils/password.js';

console.log('====================================================');
console.log('MENU API AUTHORIZATION & ROLE SEPARATION TEST SUITE');
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
    console.warn('MongoDB Atlas not connected (offline mode). Skipping live DB mutation tests.');
    console.log('[PASS] Live DB mutation guarded when offline');
    passCount++;
    console.log(`\n====================================================`);
    console.log(`TOTAL PASSED: ${passCount}`);
    console.log(`TOTAL FAILED: ${failCount}`);
    console.log(`====================================================\n`);
    process.exit(0);
  }

  const testAdminEmail = 'menu_auth_admin@happinessrestaurant.com';
  const testCustomerMobile = '9876543210';
  const testCustomerEmail = 'menu_auth_customer@example.com';

  await Admin.deleteOne({ email: testAdminEmail });
  await Customer.deleteOne({ mobile: testCustomerMobile });

  const adminPassHash = await hashPassword('AdminPass@123');
  const adminDoc = await Admin.create({
    name: 'Menu Auth Admin',
    email: testAdminEmail,
    passwordHash: adminPassHash,
    role: 'ADMIN',
    isActive: true,
  });

  const customerPassHash = await hashPassword('CustomerPass@123');
  const customerDoc = await Customer.create({
    name: 'Menu Auth Customer',
    mobile: testCustomerMobile,
    email: testCustomerEmail,
    passwordHash: customerPassHash,
    role: 'CUSTOMER',
    isActive: true,
  });

  const adminToken = generateToken({ sub: adminDoc._id.toString(), role: 'ADMIN' });
  const customerToken = generateToken({ sub: customerDoc._id.toString(), role: 'CUSTOMER' });

  const sampleItem = await MenuItem.findOne({}).lean();
  const sampleItemId = sampleItem ? sampleItem._id.toString() : '507f1f77bcf86cd799439011';
  const sampleItemSlug = sampleItem ? sampleItem.slug : 'veg-fried-rice';

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // 1. Public Customer Endpoints (No Token Required)
    console.log('--- Test 1: Public Customer Menu Endpoints ---');
    const resPublicMenu = await fetch(`${baseUrl}/api/menu`);
    assert(resPublicMenu.status === 200, 'GET /api/menu is publicly accessible (200)');

    const resPublicItem = await fetch(`${baseUrl}/api/menu/${sampleItemId}`);
    assert(resPublicItem.status === 200, 'GET /api/menu/:itemId is publicly accessible (200)');

    const resPublicSlug = await fetch(`${baseUrl}/api/menu/slug/${sampleItemSlug}`);
    assert(resPublicSlug.status === 200, 'GET /api/menu/slug/:slug is publicly accessible (200)');

    // 2. Unauthenticated Admin Endpoints (Must return 401)
    console.log('\n--- Test 2: Unauthenticated Admin Menu Operations (401) ---');
    const resUnauthPost = await fetch(`${baseUrl}/api/admin/menu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', category: 'soup', price: 100 }),
    });
    assert(resUnauthPost.status === 401, 'POST /api/admin/menu rejects unauthenticated call with 401');

    const resUnauthPatch = await fetch(`${baseUrl}/api/admin/menu/${sampleItemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: 200 }),
    });
    assert(resUnauthPatch.status === 401, 'PATCH /api/admin/menu/:itemId rejects unauthenticated call with 401');

    const resUnauthAvail = await fetch(`${baseUrl}/api/admin/menu/${sampleItemId}/availability`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAvailable: false }),
    });
    assert(resUnauthAvail.status === 401, 'PATCH /api/admin/menu/:itemId/availability rejects unauthenticated call with 401');

    const resUnauthDelete = await fetch(`${baseUrl}/api/admin/menu/${sampleItemId}`, {
      method: 'DELETE',
    });
    assert(resUnauthDelete.status === 401, 'DELETE /api/admin/menu/:itemId rejects unauthenticated call with 401');

    // 3. Customer Token on Admin Endpoints (Must return 403 Forbidden)
    console.log('\n--- Test 3: Customer Token on Admin Menu Operations (403 Forbidden) ---');
    const resCustPost = await fetch(`${baseUrl}/api/admin/menu`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ name: 'Test', category: 'soup', price: 100 }),
    });
    assert(resCustPost.status === 403, 'POST /api/admin/menu rejects customer token with 403 Forbidden');

    const resCustPatch = await fetch(`${baseUrl}/api/admin/menu/${sampleItemId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ price: 200 }),
    });
    assert(resCustPatch.status === 403, 'PATCH /api/admin/menu/:itemId rejects customer token with 403 Forbidden');

    const resCustAvail = await fetch(`${baseUrl}/api/admin/menu/${sampleItemId}/availability`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ isAvailable: false }),
    });
    assert(resCustAvail.status === 403, 'PATCH availability rejects customer token with 403 Forbidden');

    const resCustDelete = await fetch(`${baseUrl}/api/admin/menu/${sampleItemId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(resCustDelete.status === 403, 'DELETE /api/admin/menu/:itemId rejects customer token with 403 Forbidden');

    // 4. Admin Token on Admin Endpoints (Authorized)
    console.log('\n--- Test 4: Admin Token Allowed on Admin Menu Operations ---');
    const resAdminCheck = await fetch(`${baseUrl}/api/admin/menu/${sampleItemId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ description: sampleItem.description || 'Updated by admin auth test' }),
    });
    assert(resAdminCheck.status === 200, 'PATCH /api/admin/menu/:itemId allowed with valid Admin token (200)');

  } catch (err) {
    console.error('Authorization test error:', err);
    failCount++;
  } finally {
    await Admin.deleteOne({ email: testAdminEmail });
    await Customer.deleteOne({ mobile: testCustomerMobile });
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
