import http from 'http';
import mongoose from 'mongoose';
import app from '../../app.js';
import { generateToken } from '../../src/utils/jwt.js';

console.log('====================================================');
console.log('FINAL BACKEND SYSTEM REGRESSION TEST SUITE');
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
    // 1. Health Endpoint
    console.log('--- Test 1: Health Endpoint ---');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthJson = await healthRes.json();
    assert(healthRes.status === 200, 'GET /api/health returns HTTP 200');
    assert(healthJson.success === true, 'Health check contains success: true');
    assert(healthJson.message === 'Restaurant API is running', 'Message matches "Restaurant API is running"');

    // 2. Public Menu Routes
    console.log('\n--- Test 2: Public Menu Routes ---');
    const menuRes = await fetch(`${baseUrl}/api/menu`);
    const menuJson = await menuRes.json();
    assert(menuRes.status === 200, 'GET /api/menu returns HTTP 200');
    assert(Array.isArray(menuJson.data), 'Menu items returned as an array');

    const singleMenu404 = await fetch(`${baseUrl}/api/menu/507f1f77bcf86cd799439011`);
    assert(singleMenu404.status === 404, 'Unknown menu item returns HTTP 404');

    // 3. Customer Order Routes
    console.log('\n--- Test 3: Customer Order Routes ---');
    const ordersRes = await fetch(`${baseUrl}/api/orders`);
    const ordersJson = await ordersRes.json();
    assert(ordersRes.status === 200, 'GET /api/orders returns HTTP 200');
    assert(Array.isArray(ordersJson.data), 'Customer orders returned as array');

    const singleOrder404 = await fetch(`${baseUrl}/api/orders/RF-20260917-999999`);
    assert(singleOrder404.status === 404, 'Unknown order returns HTTP 404');

    // 4. Restaurant Settings Routes
    console.log('\n--- Test 4: Restaurant Settings Routes ---');
    const settingsRes = await fetch(`${baseUrl}/api/settings`);
    const settingsJson = await settingsRes.json();
    assert(settingsRes.status === 200, 'GET /api/settings returns HTTP 200');
    assert(settingsJson.data.serviceMode === 'Restaurant Self-Pickup', 'serviceMode specifies Restaurant Self-Pickup');

    // 5. Admin Routes
    console.log('\n--- Test 5: Admin Route Architecture ---');
    const adminOrdersRes = await fetch(`${baseUrl}/api/admin/orders`, { headers: adminHeaders });
    assert(adminOrdersRes.status === 200, 'GET /api/admin/orders returns HTTP 200 with admin token');

    const adminDashRes = await fetch(`${baseUrl}/api/admin/dashboard-summary`, { headers: adminHeaders });
    assert(adminDashRes.status === 200, 'GET /api/admin/dashboard-summary returns HTTP 200 with admin token');

    // 6. Notification Routes
    console.log('\n--- Test 6: Notification Routes ---');
    const notifLogsRes = await fetch(`${baseUrl}/api/notifications/logs`, { headers: adminHeaders });
    assert(notifLogsRes.status === 200, 'GET /api/notifications/logs returns HTTP 200 with admin token');

    const notifOrderRes = await fetch(`${baseUrl}/api/notifications/order/RF-20260917-100100`, { headers: adminHeaders });
    assert(notifOrderRes.status === 200, 'GET /api/notifications/order/:orderId returns HTTP 200 with admin token');

    // 7. 404 and Error Handling
    console.log('\n--- Test 7: Error & 404 Handling ---');
    const unknownRoute = await fetch(`${baseUrl}/api/completely-unknown-endpoint`);
    const unknownJson = await unknownRoute.json();
    assert(unknownRoute.status === 404, 'Unmatched route returns HTTP 404');
    assert(unknownJson.success === false, '404 contains success: false');

    // 8. CORS Headers
    console.log('\n--- Test 8: CORS Configuration ---');
    const corsRes = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: 'http://localhost:3000' },
    });
    assert(
      corsRes.headers.get('access-control-allow-origin') === 'http://localhost:3000',
      'CORS origin http://localhost:3000 is allowed'
    );
  } catch (err) {
    console.error('Backend regression test error:', err);
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
