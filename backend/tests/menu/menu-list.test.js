import http from 'http';
import app from '../../app.js';

console.log('====================================================');
console.log('PUBLIC MENU LIST API TEST SUITE');
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
    // 1. Basic Public Menu Retrieval
    console.log('--- Test 1: GET /api/menu Basic Retrieval ---');
    const res1 = await fetch(`${baseUrl}/api/menu`);
    const data1 = await res1.json();

    assert(res1.status === 200, 'GET /api/menu returns HTTP 200');
    assert(data1.success === true, 'Response contains success: true');
    assert(Array.isArray(data1.data), 'Response data is an array');
    assert(typeof data1.meta === 'object', 'Response includes meta object');
    assert(typeof data1.meta.page === 'number', 'meta.page is a number');
    assert(typeof data1.meta.limit === 'number', 'meta.limit is a number');
    assert(typeof data1.meta.total === 'number', 'meta.total is a number');

    // 2. Category Filtering Query
    console.log('\n--- Test 2: Category Filter Parameter ---');
    const resCat = await fetch(`${baseUrl}/api/menu?category=soup`);
    const dataCat = await resCat.json();

    assert(resCat.status === 200, 'GET /api/menu?category=soup returns HTTP 200');
    assert(dataCat.success === true, 'Category query response has success: true');
    assert(Array.isArray(dataCat.data), 'Category query response data is an array');

    // 3. Search Query
    console.log('\n--- Test 3: Search Parameter ---');
    const resSearch = await fetch(`${baseUrl}/api/menu?search=paneer`);
    const dataSearch = await resSearch.json();

    assert(resSearch.status === 200, 'GET /api/menu?search=paneer returns HTTP 200');
    assert(dataSearch.success === true, 'Search query response has success: true');
    assert(Array.isArray(dataSearch.data), 'Search query response data is an array');

    // 4. Sorting Query & Whitelist Fallback
    console.log('\n--- Test 4: Sorting Parameters & Security Whitelist ---');
    const resSortPrice = await fetch(`${baseUrl}/api/menu?sort=price&order=asc`);
    const dataSortPrice = await resSortPrice.json();
    assert(resSortPrice.status === 200, 'GET /api/menu?sort=price&order=asc returns HTTP 200');

    const resSortName = await fetch(`${baseUrl}/api/menu?sort=name&order=desc`);
    const dataSortName = await resSortName.json();
    assert(resSortName.status === 200, 'GET /api/menu?sort=name&order=desc returns HTTP 200');

    const resSortPriceAsc = await fetch(`${baseUrl}/api/menu?sort=price_asc`);
    const dataSortPriceAsc = await resSortPriceAsc.json();
    assert(resSortPriceAsc.status === 200, 'GET /api/menu?sort=price_asc returns HTTP 200');
    assert(dataSortPriceAsc.success === true, 'sort=price_asc response has success: true');

    const resSortPriceDesc = await fetch(`${baseUrl}/api/menu?sort=price_desc`);
    const dataSortPriceDesc = await resSortPriceDesc.json();
    assert(resSortPriceDesc.status === 200, 'GET /api/menu?sort=price_desc returns HTTP 200');
    assert(dataSortPriceDesc.success === true, 'sort=price_desc response has success: true');

    // Attempt injection with non-whitelisted sort field
    const resSortInvalid = await fetch(`${baseUrl}/api/menu?sort=__proto__&order=asc`);
    const dataSortInvalid = await resSortInvalid.json();
    assert(resSortInvalid.status === 200, 'Invalid sort field safely falls back to default sorting without error');

    // 5. Pagination Bounds
    console.log('\n--- Test 5: Pagination Bounds ---');
    const resPage = await fetch(`${baseUrl}/api/menu?page=2&limit=15`);
    const dataPage = await resPage.json();
    assert(resPage.status === 200, 'GET /api/menu?page=2&limit=15 returns HTTP 200');
    assert(dataPage.meta.page === 2, 'Pagination returns requested page');
    assert(dataPage.meta.limit === 15, 'Pagination returns requested limit');

    // Check maximum limit capping (max 500)
    const resMaxLimit = await fetch(`${baseUrl}/api/menu?limit=1000`);
    const dataMaxLimit = await resMaxLimit.json();
    assert(dataMaxLimit.meta.limit === 500, 'Pagination caps maximum limit to 500 items per page');
  } catch (err) {
    console.error('Menu list test error:', err);
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
