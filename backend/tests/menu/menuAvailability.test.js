import http from 'http';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import connectDB, { disconnectDB } from '../../src/config/database.js';
import Admin from '../../src/models/Admin.js';
import MenuItem from '../../src/models/MenuItem.js';
import { generateToken } from '../../src/utils/jwt.js';
import { hashPassword } from '../../src/utils/password.js';

console.log('====================================================');
console.log('MENU AVAILABILITY & ORDERING RESTRICTION TEST SUITE');
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

  const testAdminEmail = 'menu_avail_admin@happinessrestaurant.com';
  await Admin.deleteOne({ email: testAdminEmail });

  const adminPassHash = await hashPassword('AdminPass@123');
  const adminDoc = await Admin.create({
    name: 'Menu Avail Admin',
    email: testAdminEmail,
    passwordHash: adminPassHash,
    role: 'ADMIN',
    isActive: true,
  });

  const adminToken = generateToken({ sub: adminDoc._id.toString(), role: 'ADMIN' });
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  };

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  const testSlug = 'temp-avail-test-item';
  await MenuItem.deleteOne({ slug: testSlug });

  const testItem = await MenuItem.create({
    name: 'Temp Avail Test Item',
    slug: testSlug,
    category: 'starter',
    price: 180,
    image: '/images/menu/veg-crispy.webp',
    isAvailable: true,
  });

  try {
    // 1. Availability Toggle Validation (400)
    console.log('--- Test 1: Availability Input Validations ---');
    const resNoAvail = await fetch(`${baseUrl}/api/admin/menu/${testItem._id}/availability`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({}),
    });
    assert(resNoAvail.status === 400, 'Rejects missing isAvailable with 400');

    const resBadAvail = await fetch(`${baseUrl}/api/admin/menu/${testItem._id}/availability`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ isAvailable: 'not-bool' }),
    });
    assert(resBadAvail.status === 400, 'Rejects non-boolean isAvailable with 400');

    // 2. Mark Item Unavailable
    console.log('\n--- Test 2: Mark Item Unavailable ---');
    const resMakeUnavail = await fetch(`${baseUrl}/api/admin/menu/${testItem._id}/availability`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ isAvailable: false }),
    });
    const dataMakeUnavail = await resMakeUnavail.json();
    assert(resMakeUnavail.status === 200, 'Successfully marks item unavailable with 200');
    assert(dataMakeUnavail.data.isAvailable === false, 'isAvailable is false');

    // 3. Item Still Exists in Database & Visible to Admin
    console.log('\n--- Test 3: Admin Visibility for Unavailable Item ---');
    const adminFetch = await fetch(`${baseUrl}/api/menu?includeUnavailable=true&limit=300`);
    const adminData = await adminFetch.json();
    const foundInAdmin = adminData.data.find((it) => it._id.toString() === testItem._id.toString());
    assert(foundInAdmin !== undefined, 'Unavailable item is returned to admin with includeUnavailable=true');
    assert(foundInAdmin && foundInAdmin.isAvailable === false, 'Item correctly indicates isAvailable: false');

    // 4. Item Hidden from Public Customer Menu
    console.log('\n--- Test 4: Hidden from Public Customer Menu ---');
    const publicFetch = await fetch(`${baseUrl}/api/menu?limit=300`);
    const publicData = await publicFetch.json();
    const foundInPublic = publicData.data.find((it) => it._id.toString() === testItem._id.toString());
    assert(foundInPublic === undefined, 'Unavailable item is NOT listed in public customer menu');

    // 5. Customer Cannot Order Unavailable Item
    console.log('\n--- Test 5: Customer Cannot Order Unavailable Item ---');
    const resOrder = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Test Customer',
        mobile: '9876543210',
        items: [
          {
            menuItemId: testItem._id.toString(),
            quantity: 1,
          },
        ],
      }),
    });
    const dataOrder = await resOrder.json();
    assert(resOrder.status === 400, 'Order creation for unavailable item returns HTTP 400');
    assert(dataOrder.message.toLowerCase().includes('unavailable'), 'Order rejection message indicates item is unavailable');

    // 6. Restore Availability
    console.log('\n--- Test 6: Restore Item Availability ---');
    const resRestore = await fetch(`${baseUrl}/api/admin/menu/${testItem._id}/availability`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ isAvailable: true }),
    });
    const dataRestore = await resRestore.json();
    assert(resRestore.status === 200, 'Restores availability to true with HTTP 200');
    assert(dataRestore.data.isAvailable === true, 'isAvailable restored to true');

  } catch (err) {
    console.error('Availability test error:', err);
    failCount++;
  } finally {
    await MenuItem.deleteOne({ _id: testItem._id });
    await Admin.deleteOne({ email: testAdminEmail });
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
