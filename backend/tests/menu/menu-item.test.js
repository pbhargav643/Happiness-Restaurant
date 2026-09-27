import http from 'http';
import app from '../../app.js';

console.log('====================================================');
console.log('SINGLE MENU ITEM RETRIEVAL & 404 TEST SUITE');
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

  try {
    // 1. Non-existent Item ID
    console.log('--- Test 1: Non-Existent Item ID 404 Response ---');
    const nonExistentId = '507f1f77bcf86cd799439011'; // valid ObjectId format but not in DB
    const resId = await fetch(`${baseUrl}/api/menu/${nonExistentId}`);
    const dataId = await resId.json();

    assert(resId.status === 404, 'GET /api/menu/:itemId returns HTTP 404 for non-existent ID');
    assert(dataId.success === false, '404 response contains success: false');
    assert(dataId.message === 'Menu item not found', '404 response message matches exact requirement: "Menu item not found"');

    // 2. Non-existent Slug
    console.log('\n--- Test 2: Non-Existent Slug 404 Response ---');
    const resSlug = await fetch(`${baseUrl}/api/menu/slug/non-existent-food-item`);
    const dataSlug = await resSlug.json();

    assert(resSlug.status === 404, 'GET /api/menu/slug/:slug returns HTTP 404 for non-existent slug');
    assert(dataSlug.success === false, 'Slug 404 response contains success: false');
    assert(dataSlug.message === 'Menu item not found', 'Slug 404 response message matches "Menu item not found"');

    // 3. Invalid ObjectId String handling
    console.log('\n--- Test 3: Arbitrary string as itemId fallback ---');
    const resArbitrary = await fetch(`${baseUrl}/api/menu/some-random-unknown-string`);
    const dataArbitrary = await resArbitrary.json();

    assert(resArbitrary.status === 404, 'Arbitrary string in itemId returns HTTP 404 without unhandled exception');
    assert(dataArbitrary.success === false, 'Response has success: false');
  } catch (err) {
    console.error('Menu item test error:', err);
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
