import http from 'http';
import mongoose from 'mongoose';
import app from '../../app.js';
import { generateToken } from '../../src/utils/jwt.js';

console.log('====================================================');
console.log('ADMIN ORDER MANAGEMENT API TEST SUITE');
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

  try {
    // 1. GET /api/admin/orders Basic Retrieval & Pagination
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

    // 2. Filters (status, pickupDate, search)
    console.log('\n--- Test 2: Admin Order Filters ---');
    const resStatus = await fetch(`${baseUrl}/api/admin/orders?status=PLACED`, { headers: adminHeaders });
    assert(resStatus.status === 200, 'Filtering by status=PLACED returns HTTP 200');

    const resDate = await fetch(`${baseUrl}/api/admin/orders?pickupDate=2026-09-20`, { headers: adminHeaders });
    assert(resDate.status === 200, 'Filtering by pickupDate returns HTTP 200');

    const resSearch = await fetch(`${baseUrl}/api/admin/orders?search=RF-2026`, { headers: adminHeaders });
    assert(resSearch.status === 200, 'Search query returns HTTP 200');

    const resSort = await fetch(`${baseUrl}/api/admin/orders?sort=pickup.date&order=asc`, { headers: adminHeaders });
    assert(resSort.status === 200, 'Whitelisted sorting by pickup.date returns HTTP 200');

    const resSortInvalid = await fetch(`${baseUrl}/api/admin/orders?sort=__malicious&order=desc`, { headers: adminHeaders });
    assert(resSortInvalid.status === 200, 'Arbitrary sort parameter safely falls back to default sorting');

    // 3. Single Admin Order Lookup & 404
    console.log('\n--- Test 3: Admin Single Order Lookup & 404 ---');
    const resDetail404 = await fetch(`${baseUrl}/api/admin/orders/RF-20260917-999999`, { headers: adminHeaders });
    const dataDetail404 = await resDetail404.json();

    assert(resDetail404.status === 404, 'GET /api/admin/orders/:orderId returns HTTP 404 for unknown order');
    assert(dataDetail404.success === false, '404 response contains success: false');
    assert(dataDetail404.message === 'Order not found', '404 message indicates "Order not found"');

    // 4. Status Update Validations & 404
    console.log('\n--- Test 4: PATCH /api/admin/orders/:orderId/status Validations ---');
    const resNoStatus = await fetch(`${baseUrl}/api/admin/orders/RF-20260917-999999/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({}),
    });
    const dataNoStatus = await resNoStatus.json();
    assert(resNoStatus.status === 400, 'Missing status returns HTTP 400');
    assert(dataNoStatus.message === 'Status is required', 'Message specifies status is required');

    const resBadStatus = await fetch(`${baseUrl}/api/admin/orders/RF-20260917-999999/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'DELIVERED' }),
    });
    const dataBadStatus = await resBadStatus.json();
    assert(resBadStatus.status === 400, 'Invalid status returns HTTP 400');
    assert(dataBadStatus.message.includes('Invalid status'), 'Error message clarifies invalid status');

    const resStatus404 = await fetch(`${baseUrl}/api/admin/orders/RF-20260917-999999/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'PREPARING' }),
    });
    assert(resStatus404.status === 404, 'Status update returns HTTP 404 for non-existent order');

    // 5. Ready-Time Update Validations & 404
    console.log('\n--- Test 5: PATCH /api/admin/orders/:orderId/ready-time Validations ---');
    const resBadTime = await fetch(`${baseUrl}/api/admin/orders/RF-20260917-999999/ready-time`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ readyTime: 'invalid-time-format' }),
    });
    assert(resBadTime.status === 400, 'Malformed readyTime format returns HTTP 400');

    const resTime404 = await fetch(`${baseUrl}/api/admin/orders/RF-20260917-999999/ready-time`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ readyTime: '20:15' }),
    });
    assert(resTime404.status === 404, 'Ready-time update returns HTTP 404 for non-existent order');
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
