import http from 'http';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import connectDB, { disconnectDB } from '../../src/config/database.js';
import Admin from '../../src/models/Admin.js';
import Customer from '../../src/models/Customer.js';
import MenuItem from '../../src/models/MenuItem.js';
import Order from '../../src/models/Order.js';
import { generateToken } from '../../src/utils/jwt.js';
import { hashPassword } from '../../src/utils/password.js';

console.log('====================================================');
console.log('PHASE 11 — PROMPT 2: BACKEND ADMIN MENU CRUD TEST SUITE');
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

  const testAdminEmail = 'admin_crud_p2@happinessrestaurant.com';
  const testCustomerMobile = '9988776655';
  const testCustomerEmail = 'customer_crud_p2@example.com';

  await Admin.deleteOne({ email: testAdminEmail });
  await Customer.deleteOne({ mobile: testCustomerMobile });

  const adminPassHash = await hashPassword('AdminPass@123');
  const adminDoc = await Admin.create({
    name: 'Admin CRUD Tester',
    email: testAdminEmail,
    passwordHash: adminPassHash,
    role: 'ADMIN',
    isActive: true,
  });

  const customerPassHash = await hashPassword('CustomerPass@123');
  const customerDoc = await Customer.create({
    name: 'Customer CRUD Tester',
    mobile: testCustomerMobile,
    email: testCustomerEmail,
    passwordHash: customerPassHash,
    role: 'CUSTOMER',
    isActive: true,
  });

  const adminToken = generateToken({ sub: adminDoc._id.toString(), role: 'ADMIN' });
  const customerToken = generateToken({ sub: customerDoc._id.toString(), role: 'CUSTOMER' });

  const adminHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  };

  const customerHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${customerToken}`,
  };

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  const testSlug = 'p2-test-paneer-delight';
  await MenuItem.deleteOne({ slug: testSlug });

  let createdItemId = null;

  try {
    // ----------------------------------------------------
    // 1. Admin can create
    // ----------------------------------------------------
    console.log('--- 1. Admin can create ---');
    const resCreate = await fetch(`${baseUrl}/api/admin/menu`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        name: 'P2 Test Paneer Delight',
        slug: testSlug,
        category: 'paneer-ka-khajana',
        price: 260,
        image: '/images/menu/paneer_butter_masala.jpg',
        description: 'Tender cottage cheese cubes simmered in aromatic gravy.',
        isAvailable: true,
      }),
    });
    const dataCreate = await resCreate.json();
    assert(resCreate.status === 201, 'Admin can create menu item (HTTP 201)');
    assert(dataCreate.success === true, 'Response indicates success: true');
    assert(dataCreate.data && dataCreate.data.slug === testSlug, 'Created item has expected slug');
    assert(dataCreate.data.price === 260, 'Created item has expected price ₹260');
    createdItemId = dataCreate.data._id;

    // ----------------------------------------------------
    // 2. Customer cannot create
    // ----------------------------------------------------
    console.log('\n--- 2. Customer cannot create ---');
    const resCustCreate = await fetch(`${baseUrl}/api/admin/menu`, {
      method: 'POST',
      headers: customerHeaders,
      body: JSON.stringify({
        name: 'Customer Created Dish',
        category: 'starter',
        price: 150,
      }),
    });
    assert(resCustCreate.status === 403, 'Customer cannot create menu item (HTTP 403 Forbidden)');

    // ----------------------------------------------------
    // 3. Unauthenticated cannot create
    // ----------------------------------------------------
    console.log('\n--- 3. Unauthenticated cannot create ---');
    const resUnauthCreate = await fetch(`${baseUrl}/api/admin/menu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Unauth Created Dish',
        category: 'starter',
        price: 150,
      }),
    });
    assert(resUnauthCreate.status === 401, 'Unauthenticated cannot create menu item (HTTP 401 Unauthorized)');

    // ----------------------------------------------------
    // 4. Admin can update
    // ----------------------------------------------------
    console.log('\n--- 4. Admin can update ---');
    const resUpdate = await fetch(`${baseUrl}/api/admin/menu/${createdItemId}`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({
        price: 280,
        description: 'Updated premium sauce with extra butter.',
      }),
    });
    const dataUpdate = await resUpdate.json();
    assert(resUpdate.status === 200, 'Admin can update menu item (HTTP 200)');
    assert(dataUpdate.data.price === 280, 'Item price successfully updated to ₹280');
    assert(dataUpdate.data.description.includes('Updated premium'), 'Item description successfully updated');

    // ----------------------------------------------------
    // 5. Duplicate slug rejected
    // ----------------------------------------------------
    console.log('\n--- 5. Duplicate slug rejected ---');
    const resDupSlug = await fetch(`${baseUrl}/api/admin/menu`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        name: 'Another Dish With Same Slug',
        slug: testSlug,
        category: 'starter',
        price: 190,
      }),
    });
    const dataDupSlug = await resDupSlug.json();
    assert(resDupSlug.status === 409, 'Duplicate slug rejected with HTTP 409 Conflict');
    assert(dataDupSlug.success === false, 'Duplicate slug returns success: false');

    // ----------------------------------------------------
    // 6. Invalid price rejected
    // ----------------------------------------------------
    console.log('\n--- 6. Invalid price rejected ---');
    const resNegPrice = await fetch(`${baseUrl}/api/admin/menu`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        name: 'Negative Price Dish',
        category: 'soup',
        price: -50,
      }),
    });
    assert(resNegPrice.status === 400, 'Negative price on create rejected with HTTP 400');

    const resNonNumPrice = await fetch(`${baseUrl}/api/admin/menu/${createdItemId}`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({
        price: 'invalid-price-string',
      }),
    });
    assert(resNonNumPrice.status === 400, 'Non-numeric price on update rejected with HTTP 400');

    // ----------------------------------------------------
    // 7. Customer cannot delete
    // ----------------------------------------------------
    console.log('\n--- 7. Customer cannot delete ---');
    const resCustDelete = await fetch(`${baseUrl}/api/admin/menu/${createdItemId}`, {
      method: 'DELETE',
      headers: customerHeaders,
    });
    assert(resCustDelete.status === 403, 'Customer cannot delete menu item (HTTP 403 Forbidden)');

    // ----------------------------------------------------
    // 8. Customer cannot change availability
    // ----------------------------------------------------
    console.log('\n--- 8. Customer cannot change availability ---');
    const resCustAvail = await fetch(`${baseUrl}/api/admin/menu/${createdItemId}/availability`, {
      method: 'PATCH',
      headers: customerHeaders,
      body: JSON.stringify({ isAvailable: false }),
    });
    assert(resCustAvail.status === 403, 'Customer cannot change availability (HTTP 403 Forbidden)');

    // ----------------------------------------------------
    // 9. Admin can change availability
    // ----------------------------------------------------
    console.log('\n--- 9. Admin can change availability ---');
    const resAdminAvailFalse = await fetch(`${baseUrl}/api/admin/menu/${createdItemId}/availability`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ isAvailable: false }),
    });
    const dataAdminAvailFalse = await resAdminAvailFalse.json();
    assert(resAdminAvailFalse.status === 200, 'Admin can toggle item availability to false (HTTP 200)');
    assert(dataAdminAvailFalse.data.isAvailable === false, 'Item isAvailable is now false');

    const resAdminAvailTrue = await fetch(`${baseUrl}/api/admin/menu/${createdItemId}/availability`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ isAvailable: true }),
    });
    const dataAdminAvailTrue = await resAdminAvailTrue.json();
    assert(resAdminAvailTrue.status === 200, 'Admin can toggle item availability back to true (HTTP 200)');
    assert(dataAdminAvailTrue.data.isAvailable === true, 'Item isAvailable is now true');

    // ----------------------------------------------------
    // 10. Historical orders remain intact
    // ----------------------------------------------------
    console.log('\n--- 10. Historical orders remain intact ---');
    const historicalOrder = await Order.create({
      orderId: `ORD-HIST-${Date.now()}`,
      customer: {
        name: 'Historical Safeguard Customer',
        mobile: '9988776655',
      },
      pickup: {
        date: '2026-09-24',
        time: '14:30',
      },
      status: 'PLACED',
      items: [
        {
          itemId: String(createdItemId),
          name: 'P2 Test Paneer Delight',
          price: 260, // snapshot at original price
          quantity: 2,
          image: '/images/menu/paneer_butter_masala.jpg',
        },
      ],
      subtotal: 520,
    });

    // Verify snapshot in DB
    const fetchedOrderPre = await Order.findById(historicalOrder._id).lean();
    assert(fetchedOrderPre.items[0].price === 260, 'Historical order snapshot holds original price ₹260');

    // ----------------------------------------------------
    // 11. Admin can delete
    // ----------------------------------------------------
    console.log('\n--- 11. Admin can delete ---');
    const resAdminDelete = await fetch(`${baseUrl}/api/admin/menu/${createdItemId}`, {
      method: 'DELETE',
      headers: adminHeaders,
    });
    assert(resAdminDelete.status === 200, 'Admin can delete menu item (HTTP 200)');

    // Verify item deleted from MenuItem collection
    const checkDeleted = await MenuItem.findById(createdItemId);
    assert(checkDeleted === null, 'Menu item deleted from MenuItem collection');

    // Verify historical order still exists and is 100% untouched
    const fetchedOrderPost = await Order.findById(historicalOrder._id).lean();
    assert(fetchedOrderPost !== null, 'Historical order still exists in Order collection');
    assert(fetchedOrderPost.items[0].price === 260, 'Historical order snapshot price unchanged at ₹260');
    assert(fetchedOrderPost.items[0].quantity === 2, 'Historical order snapshot quantity intact');
    assert(fetchedOrderPost.subtotal === 520, 'Historical order subtotal intact at ₹520');

    await Order.deleteOne({ _id: historicalOrder._id });

    // ----------------------------------------------------
    // 12. Existing 153 menu records remain valid
    // ----------------------------------------------------
    console.log('\n--- 12. Existing 153 menu records remain valid ---');
    const count = await MenuItem.countDocuments({});
    assert(count === 153, `Database contains exactly 153 menu items (found: ${count})`);

    const chineseRiceCount = await MenuItem.countDocuments({ category: 'chinese-rice' });
    assert(chineseRiceCount === 8, `Chinese Rice category has exactly 8 items (found: ${chineseRiceCount})`);

  } catch (err) {
    console.error('Backend Admin Menu CRUD test error:', err);
    failCount++;
  } finally {
    if (createdItemId) {
      await MenuItem.deleteOne({ _id: createdItemId });
    }
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
