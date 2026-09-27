import http from 'http';
import mongoose from 'mongoose';
import app from '../../app.js';
import { generateToken } from '../../src/utils/jwt.js';

console.log('====================================================');
console.log('ADMIN ORDER MANAGEMENT & LISTING API TEST SUITE');
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
    Authorization: `Bearer ${adminToken}`,
  };

  try {
    // 1. GET /api/admin/orders Listing & Pagination
    console.log('--- Test 1: GET /api/admin/orders Listing & Pagination ---');
    const resOrders = await fetch(`${baseUrl}/api/admin/orders`, { headers: adminHeaders });
    const dataOrders = await resOrders.json();

    assert(resOrders.status === 200, 'GET /api/admin/orders returns HTTP 200');
    assert(dataOrders.success === true, 'Response contains success: true');
    assert(Array.isArray(dataOrders.data), 'Response data is an array');
    assert(typeof dataOrders.meta === 'object', 'Response includes meta object');
    assert(typeof dataOrders.meta.page === 'number', 'meta.page is a number');
    assert(typeof dataOrders.meta.limit === 'number', 'meta.limit is a number');
    assert(typeof dataOrders.meta.total === 'number', 'meta.total is a number');

    // 2. Admin Order Filters: Status Filter
    console.log('\n--- Test 2: Admin Order Filters (Status) ---');
    const resPlaced = await fetch(`${baseUrl}/api/admin/orders?status=PLACED`, { headers: adminHeaders });
    assert(resPlaced.status === 200, 'Filtering by status=PLACED returns HTTP 200');

    const resReady = await fetch(`${baseUrl}/api/admin/orders?status=READY`, { headers: adminHeaders });
    assert(resReady.status === 200, 'Filtering by status=READY returns HTTP 200');

    // 3. Admin Order Filters: Pickup Date Filter
    console.log('\n--- Test 3: Admin Order Filters (Date) ---');
    const resDate = await fetch(`${baseUrl}/api/admin/orders?date=2026-09-25`, { headers: adminHeaders });
    assert(resDate.status === 200, 'Filtering by ?date=2026-09-25 returns HTTP 200');

    const resPickupDate = await fetch(`${baseUrl}/api/admin/orders?pickupDate=2026-09-25`, { headers: adminHeaders });
    assert(resPickupDate.status === 200, 'Filtering by ?pickupDate=2026-09-25 returns HTTP 200');

    // 4. Admin Search Filter
    console.log('\n--- Test 4: Admin Search Query ---');
    const resSearch = await fetch(`${baseUrl}/api/admin/orders?search=RF-20260925`, { headers: adminHeaders });
    assert(resSearch.status === 200, 'Search query ?search=RF-20260925 returns HTTP 200');

    // 5. Safe Sorting Whitelist
    console.log('\n--- Test 5: Safe Sorting Whitelist ---');
    const resSortPickup = await fetch(`${baseUrl}/api/admin/orders?sort=pickup.date&order=asc`, { headers: adminHeaders });
    assert(resSortPickup.status === 200, 'Whitelisted sorting by pickup.date returns HTTP 200');

    const resSortInvalid = await fetch(`${baseUrl}/api/admin/orders?sort=__proto__&order=desc`, { headers: adminHeaders });
    assert(resSortInvalid.status === 200, 'Arbitrary sort parameter safely falls back to default sorting');
  } catch (err) {
    console.error('Admin orders test error:', err);
    failCount++;
  } finally {
    server.close();
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
