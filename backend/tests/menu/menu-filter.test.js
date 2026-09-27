import http from 'http';
import app from '../../app.js';

console.log('====================================================');
console.log('MENU CATEGORY FILTERING API TEST SUITE');
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
    // 1. Slugified Category Filtering
    console.log('--- Test 1: Category Filter with Slugified Identifier ---');
    const resSlug = await fetch(`${baseUrl}/api/menu?category=garden-fresh-vegetables`);
    const dataSlug = await resSlug.json();

    assert(resSlug.status === 200, 'GET /api/menu?category=garden-fresh-vegetables returns HTTP 200');
    assert(dataSlug.success === true, 'Response contains success: true');
    assert(Array.isArray(dataSlug.data), 'data is an array');

    // 2. Display Name Category Filtering with spaces & URL encoding
    console.log('\n--- Test 2: Category Filter with Display Name (Garden Fresh Vegetables) ---');
    const resName = await fetch(`${baseUrl}/api/menu?category=Garden%20Fresh%20Vegetables`);
    const dataName = await resName.json();

    assert(resName.status === 200, 'GET /api/menu?category=Garden%20Fresh%20Vegetables returns HTTP 200');
    assert(dataName.success === true, 'Response contains success: true');
    assert(Array.isArray(dataName.data), 'data is an array');

    // 3. Case Insensitive Filtering
    console.log('\n--- Test 3: Case Insensitive Filtering ---');
    const resUpper = await fetch(`${baseUrl}/api/menu?category=SOUP`);
    const dataUpper = await resUpper.json();

    assert(resUpper.status === 200, 'GET /api/menu?category=SOUP returns HTTP 200');
    assert(dataUpper.success === true, 'Upper-case category returns success: true');
    assert(Array.isArray(dataUpper.data), 'data is an array');

    // 4. Non-Existent Category
    console.log('\n--- Test 4: Non-Existent Category Safe Empty Response ---');
    const resNonExistent = await fetch(`${baseUrl}/api/menu?category=non-existent-category-xyz`);
    const dataNonExistent = await resNonExistent.json();

    assert(resNonExistent.status === 200, 'Non-existent category returns HTTP 200');
    assert(dataNonExistent.success === true, 'Non-existent category has success: true');
    assert(Array.isArray(dataNonExistent.data) && dataNonExistent.data.length === 0, 'data is safe empty array');

    // 5. Empty Category Parameter
    console.log('\n--- Test 5: Empty Category Parameter Safe Handling ---');
    const resEmpty = await fetch(`${baseUrl}/api/menu?category=`);
    const dataEmpty = await resEmpty.json();

    assert(resEmpty.status === 200, 'Empty category query returns HTTP 200');
    assert(dataEmpty.success === true, 'Empty category query returns success: true');
    assert(Array.isArray(dataEmpty.data), 'data is an array');

    // 6. Chinese Rice Display Name Filter (URL Encoded)
    console.log('\n--- Test 6: Chinese Rice Display Name Filter (Chinese%20Rice) ---');
    const resChineseRiceName = await fetch(`${baseUrl}/api/menu?category=Chinese%20Rice`);
    const dataChineseRiceName = await resChineseRiceName.json();

    assert(resChineseRiceName.status === 200, 'GET /api/menu?category=Chinese%20Rice returns HTTP 200');
    assert(dataChineseRiceName.success === true, 'Chinese Rice response contains success: true');
    assert(Array.isArray(dataChineseRiceName.data), 'Chinese Rice response data is an array');

    // 7. Chinese Rice Slugified Filter
    console.log('\n--- Test 7: Chinese Rice Slug Filter (chinese-rice) ---');
    const resChineseRiceSlug = await fetch(`${baseUrl}/api/menu?category=chinese-rice`);
    const dataChineseRiceSlug = await resChineseRiceSlug.json();

    assert(resChineseRiceSlug.status === 200, 'GET /api/menu?category=chinese-rice returns HTTP 200');
    assert(dataChineseRiceSlug.success === true, 'chinese-rice response contains success: true');
    assert(Array.isArray(dataChineseRiceSlug.data), 'chinese-rice response data is an array');
  } catch (err) {
    console.error('Menu filter test error:', err);
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
