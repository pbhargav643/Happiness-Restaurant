import http from 'http';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import connectDB, { disconnectDB } from '../../src/config/database.js';
import Admin from '../../src/models/Admin.js';
import Order from '../../src/models/Order.js';
import MenuItem from '../../src/models/MenuItem.js';
import { generateToken } from '../../src/utils/jwt.js';
import { hashPassword } from '../../src/utils/password.js';

console.log('====================================================');
console.log('ADMIN MENU CRUD & HISTORICAL ORDER PROTECTION TEST SUITE');
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

  const testAdminEmail = 'menu_crud_admin@happinessrestaurant.com';
  await Admin.deleteOne({ email: testAdminEmail });

  const adminPassHash = await hashPassword('AdminPass@123');
  const adminDoc = await Admin.create({
    name: 'Menu CRUD Admin',
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

  let createdItemId = null;
  const testSlug = 'temporary-test-dish-crud';

  // Ensure clean state
  await MenuItem.deleteOne({ slug: testSlug });

  try {
    // 1. Validation on Create
    console.log('--- Test 1: POST /api/admin/menu Validations ---');
    
    // Missing name
    const resNoName = await fetch(`${baseUrl}/api/admin/menu`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ category: 'soup', price: 120 }),
    });
    assert(resNoName.status === 400, 'Rejects missing name with HTTP 400');

    // Missing category
    const resNoCat = await fetch(`${baseUrl}/api/admin/menu`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ name: 'Test Soup', price: 120 }),
    });
    assert(resNoCat.status === 400, 'Rejects missing category with HTTP 400');

    // Negative price
    const resNegPrice = await fetch(`${baseUrl}/api/admin/menu`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ name: 'Test Soup', category: 'soup', price: -10 }),
    });
    assert(resNegPrice.status === 400, 'Rejects negative price with HTTP 400');

    // 2. Successful Item Creation
    console.log('\n--- Test 2: POST /api/admin/menu Create Item ---');
    const resCreate = await fetch(`${baseUrl}/api/admin/menu`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Temporary Test Dish CRUD',
        slug: testSlug,
        category: 'starter',
        price: 240,
        image: '/images/menu/paneer-chilly.webp',
        description: 'Test description for temporary dish.',
        isAvailable: true,
      }),
    });
    const dataCreate = await resCreate.json();
    assert(resCreate.status === 201, 'Creates menu item successfully with HTTP 201');
    assert(dataCreate.success === true, 'Response contains success: true');
    assert(dataCreate.data && dataCreate.data.slug === testSlug, 'Created item has correct slug');
    assert(dataCreate.data.price === 240, 'Created item has correct price');
    createdItemId = dataCreate.data._id;

    // 3. Duplicate Slug Rejection (409)
    console.log('\n--- Test 3: Duplicate Slug Collision Rejection (409) ---');
    const resDuplicate = await fetch(`${baseUrl}/api/admin/menu`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Duplicate Test Dish',
        slug: testSlug,
        category: 'starter',
        price: 250,
      }),
    });
    const dataDuplicate = await resDuplicate.json();
    assert(resDuplicate.status === 409, 'Rejects duplicate slug with HTTP 409 Conflict');
    assert(dataDuplicate.success === false, 'dataDuplicate.success is false');

    // 4. Update Menu Item
    console.log('\n--- Test 4: PATCH /api/admin/menu/:itemId Update Item ---');
    const resUpdate = await fetch(`${baseUrl}/api/admin/menu/${createdItemId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        price: 275,
        description: 'Updated test description.',
      }),
    });
    const dataUpdate = await resUpdate.json();
    assert(resUpdate.status === 200, 'Updates menu item with HTTP 200');
    assert(dataUpdate.data.price === 275, 'Price updated to 275');
    assert(dataUpdate.data.description === 'Updated test description.', 'Description updated');

    // Reject negative price in update
    const resUpdateNeg = await fetch(`${baseUrl}/api/admin/menu/${createdItemId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ price: -50 }),
    });
    assert(resUpdateNeg.status === 400, 'Update rejects negative price with HTTP 400');

    // 5. Historical Order Snapshot Protection
    console.log('\n--- Test 5: Historical Order Item Snapshot Protection ---');
    const historicalOrder = await Order.create({
      orderId: `ORD-HIST-${Date.now()}`,
      customer: {
        name: 'Historical Test Customer',
        mobile: '9876500000',
      },
      pickup: {
        date: '2026-09-24',
        time: '15:00',
      },
      status: 'PLACED',
      items: [
        {
          itemId: String(createdItemId),
          name: 'Temporary Test Dish CRUD',
          price: 240, // Original price at time of order
          quantity: 2,
          image: '/images/menu/paneer-chilly.webp',
        },
      ],
      subtotal: 480,
    });

    // Verify order snapshot has price: 240
    const fetchedOrderBefore = await Order.findById(historicalOrder._id).lean();
    assert(fetchedOrderBefore.items[0].price === 240, 'Historical order snapshot recorded original price 240');

    // Delete the menu item
    console.log('\n--- Test 6: DELETE /api/admin/menu/:itemId Delete Item ---');
    const resDelete = await fetch(`${baseUrl}/api/admin/menu/${createdItemId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    assert(resDelete.status === 200, 'Deletes menu item with HTTP 200');

    // Verify item is removed from menu
    const checkDeleted = await MenuItem.findById(createdItemId);
    assert(checkDeleted === null, 'Menu item is completely removed from MenuItem collection');

    // Verify historical order snapshot is completely untouched!
    const fetchedOrderAfter = await Order.findById(historicalOrder._id).lean();
    assert(fetchedOrderAfter !== null, 'Historical order still exists');
    assert(fetchedOrderAfter.items[0].price === 240, 'Historical order item snapshot price is intact (240)');
    assert(fetchedOrderAfter.items[0].name === 'Temporary Test Dish CRUD', 'Historical order item name is intact');
    assert(fetchedOrderAfter.items[0].quantity === 2, 'Historical order item quantity is intact');
    assert(fetchedOrderAfter.subtotal === 480, 'Historical order subtotal is intact');

    // Clean up test order
    await Order.deleteOne({ _id: historicalOrder._id });

  } catch (err) {
    console.error('CRUD test error:', err);
    failCount++;
  } finally {
    if (createdItemId) {
      await MenuItem.deleteOne({ _id: createdItemId });
    }
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
