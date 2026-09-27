import http from 'http';
import app from '../app.js';

console.log('====================================================');
console.log('BACKEND HEALTH & ROUTING AUTOMATED TEST SUITE');
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

  console.log(`Ephemeral test server running at ${baseUrl}\n`);

  try {
    // 1. Test GET /api/health
    console.log('--- Test 1: Health Check Endpoint ---');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthRes.json();

    assert(healthRes.status === 200, 'GET /api/health returns HTTP 200');
    assert(healthData.success === true, 'Health check response contains success: true');
    assert(
      healthData.message === 'Restaurant API is running',
      'Health check response message matches exact requirement: "Restaurant API is running"'
    );

    // 2. Test 404 Route Handler
    console.log('\n--- Test 2: 404 Route Handler ---');
    const notFoundRes = await fetch(`${baseUrl}/api/nonexistent-route-endpoint`);
    const notFoundData = await notFoundRes.json();

    assert(notFoundRes.status === 404, 'GET unknown endpoint returns HTTP 404');
    assert(notFoundData.success === false, '404 response contains success: false');
    assert(
      typeof notFoundData.message === 'string' && notFoundData.message.includes('not found'),
      '404 response contains informative not found message'
    );

    // 3. Test Foundation Route Mounting
    console.log('\n--- Test 3: Foundation Routes Mounting ---');

    // Auth route
    const authRes = await fetch(`${baseUrl}/api/auth/status`);
    const authData = await authRes.json();
    assert(authRes.status === 200, 'GET /api/auth/status returns HTTP 200');
    assert(authData.success === true, 'Auth route foundation is accessible');

    // Menu route
    const menuRes = await fetch(`${baseUrl}/api/menu`);
    const menuData = await menuRes.json();
    assert(menuRes.status === 200, 'GET /api/menu returns HTTP 200');
    assert(menuData.success === true && Array.isArray(menuData.data), 'Menu route foundation returns array');

    // Orders route
    const ordersRes = await fetch(`${baseUrl}/api/orders`);
    const ordersData = await ordersRes.json();
    assert(ordersRes.status === 200, 'GET /api/orders returns HTTP 200');
    assert(ordersData.success === true && Array.isArray(ordersData.data), 'Orders route foundation returns array');
    assert(ordersData.message.includes('Self-Pickup'), 'Orders route foundation explicitly states Self-Pickup');

    // Admin route
    const { generateToken } = await import('../src/utils/jwt.js');
    const adminToken = generateToken({ sub: '507f1f77bcf86cd799439011', role: 'ADMIN' });
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    const adminRes = await fetch(`${baseUrl}/api/admin/dashboard-summary`, { headers: adminHeaders });
    const adminData = await adminRes.json();
    assert(adminRes.status === 200, 'GET /api/admin/dashboard-summary returns HTTP 200');
    assert(adminData.success === true && adminData.data.totalOrders === 0, 'Admin route foundation returns summary data');

    // Settings route
    const settingsRes = await fetch(`${baseUrl}/api/settings`);
    const settingsData = await settingsRes.json();
    assert(settingsRes.status === 200, 'GET /api/settings returns HTTP 200');
    assert(settingsData.data.serviceMode === 'Restaurant Self-Pickup', 'Settings route specifies serviceMode: Restaurant Self-Pickup');

    // Notifications route
    const notifRes = await fetch(`${baseUrl}/api/notifications/logs`, { headers: adminHeaders });
    const notifData = await notifRes.json();
    assert(notifRes.status === 200, 'GET /api/notifications/logs returns HTTP 200');
    assert(notifData.success === true, 'Notifications route foundation returns logs endpoint');

    // 4. Test CORS Headers with Origin
    console.log('\n--- Test 4: CORS & Security Headers ---');
    const corsRes = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: 'http://localhost:3000' },
    });
    assert(
      corsRes.headers.get('access-control-allow-origin') === 'http://localhost:3000',
      'CORS header Access-Control-Allow-Origin is properly set for allowed origin'
    );
  } catch (error) {
    console.error('Test execution error:', error);
    failCount++;
  } finally {
    await new Promise((resolve) => server.close(resolve));
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
