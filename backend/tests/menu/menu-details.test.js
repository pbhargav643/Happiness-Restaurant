import http from 'http';
import app from '../../app.js';

console.log('====================================================');
console.log('MENU ITEM DETAILS & SLUG LOOKUP API TEST SUITE');
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
    // 1. GET /api/menu/:itemId - Non-existent valid ObjectId (404)
    console.log('--- Test 1: Non-Existent Valid ObjectId (404) ---');
    const validNonExistentId = '507f1f77bcf86cd799439011';
    const resId = await fetch(`${baseUrl}/api/menu/${validNonExistentId}`);
    const dataId = await resId.json();

    assert(resId.status === 404, 'Non-existent ObjectId returns HTTP 404');
    assert(dataId.success === false, 'Response has success: false');
    assert(dataId.message === 'Menu item not found', 'Message strictly matches: "Menu item not found"');
    assert(!dataId.stack, 'Response does not expose internal stack trace');

    // 2. GET /api/menu/:itemId - Arbitrary / Malformed ID string (404)
    console.log('\n--- Test 2: Arbitrary Malformed ID String (404) ---');
    const malformedId = 'invalid_id_not_an_object_id_123';
    const resMalformed = await fetch(`${baseUrl}/api/menu/${malformedId}`);
    const dataMalformed = await resMalformed.json();

    assert(resMalformed.status === 404, 'Malformed ID string returns HTTP 404 safely');
    assert(dataMalformed.success === false, 'Malformed ID response has success: false');
    assert(dataMalformed.message === 'Menu item not found', 'Message matches "Menu item not found"');

    // 3. GET /api/menu/slug/:slug - Non-existent Slug (404)
    console.log('\n--- Test 3: Non-Existent Slug Lookup (404) ---');
    const nonExistentSlug = 'unreal-dish-that-does-not-exist-999';
    const resSlug = await fetch(`${baseUrl}/api/menu/slug/${nonExistentSlug}`);
    const dataSlug = await resSlug.json();

    assert(resSlug.status === 404, 'Non-existent slug returns HTTP 404');
    assert(dataSlug.success === false, 'Slug 404 response has success: false');
    assert(dataSlug.message === 'Menu item not found', 'Slug 404 message matches "Menu item not found"');

    // 4. Response Structure Verification
    console.log('\n--- Test 4: Response Schema Standard Consistency ---');
    assert(typeof dataId === 'object' && 'success' in dataId && 'message' in dataId, 'Error response conforms to standard schema');
  } catch (err) {
    console.error('Menu details test error:', err);
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
