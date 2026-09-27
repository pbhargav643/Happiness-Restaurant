import http from 'http';
import app from '../../src/app.js';

console.log('====================================================');
console.log('BACKEND HEALTH & API FOUNDATION TEST SUITE');
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
    // 1. Health Endpoint Verification
    console.log('--- 1. Health Check Endpoint (/api/health) ---');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthRes.json();

    assert(healthRes.status === 200, 'GET /api/health returns HTTP 200');
    assert(healthData.success === true, 'Health check response contains success: true');
    assert(
      healthData.message === 'Restaurant API is running',
      'Health check response message strictly matches: "Restaurant API is running"'
    );

    // 2. 404 Route Handler Verification
    console.log('\n--- 2. 404 Route Handler ---');
    const notFoundRes = await fetch(`${baseUrl}/api/undefined-endpoint`);
    const notFoundData = await notFoundRes.json();

    assert(notFoundRes.status === 404, 'Unknown endpoint returns HTTP 404');
    assert(notFoundData.success === false, '404 response contains success: false');
    assert(
      typeof notFoundData.message === 'string' && notFoundData.message.includes('not found'),
      '404 response contains helpful message'
    );

    // 3. Foundation Route Mounts
    console.log('\n--- 3. Foundation Route Mounts ---');
    const { generateToken } = await import('../../src/utils/jwt.js');
    const adminToken = generateToken({ sub: '507f1f77bcf86cd799439011', role: 'ADMIN' });
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    const routesToTest = [
      { path: '/api/auth/status', name: 'Auth route (/api/auth)' },
      { path: '/api/menu', name: 'Menu route (/api/menu)' },
      { path: '/api/orders', name: 'Orders route (/api/orders)' },
      { path: '/api/admin/dashboard-summary', name: 'Admin route (/api/admin)', headers: adminHeaders },
      { path: '/api/settings', name: 'Settings route (/api/settings)' },
      { path: '/api/notifications/logs', name: 'Notifications route (/api/notifications)', headers: adminHeaders },
    ];

    for (const r of routesToTest) {
      const res = await fetch(`${baseUrl}${r.path}`, { headers: r.headers || {} });
      assert(res.status === 200, `${r.name} foundation is reachable (HTTP 200)`);
    }

    // 4. CORS Header Check
    console.log('\n--- 4. CORS Configuration ---');
    const corsRes = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: 'http://localhost:5173' },
    });
    assert(
      corsRes.headers.get('access-control-allow-origin') === 'http://localhost:5173' ||
      corsRes.headers.get('access-control-allow-origin') === '*',
      'CORS headers allow client origin'
    );
  } catch (error) {
    console.error('Test error:', error);
    failCount++;
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  console.log('\n====================================================');
  console.log(`HEALTH SUITE SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('====================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();
