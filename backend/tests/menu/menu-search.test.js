import http from 'http';
import app from '../../app.js';

console.log('====================================================');
console.log('MENU SEARCH API TEST SUITE');
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
    // 1. Basic Keyword Search
    console.log('--- Test 1: Basic Search Keyword (paneer) ---');
    const resPaneer = await fetch(`${baseUrl}/api/menu?search=paneer`);
    const dataPaneer = await resPaneer.json();

    assert(resPaneer.status === 200, 'GET /api/menu?search=paneer returns HTTP 200');
    assert(dataPaneer.success === true, 'Response contains success: true');
    assert(Array.isArray(dataPaneer.data), 'data is an array');

    // 2. Case Insensitive Search
    console.log('\n--- Test 2: Case-Insensitive Search ---');
    const resUpper = await fetch(`${baseUrl}/api/menu?search=PANEER`);
    const dataUpper = await resUpper.json();

    assert(resUpper.status === 200, 'GET /api/menu?search=PANEER returns HTTP 200');
    assert(dataUpper.success === true, 'Response contains success: true');
    assert(Array.isArray(dataUpper.data), 'data is an array');

    // 3. Search With Regex Metacharacters (Security / ReDoS Prevention)
    console.log('\n--- Test 3: Safe Handling of Regex Metacharacters ---');
    const dangerousQueries = ['(', '[', '.*', 'a{1000}', '+', '\\'];
    for (const query of dangerousQueries) {
      const encoded = encodeURIComponent(query);
      const resMeta = await fetch(`${baseUrl}/api/menu?search=${encoded}`);
      const dataMeta = await resMeta.json();
      assert(resMeta.status === 200, `Search with regex token "${query}" safely handled without server error`);
      assert(dataMeta.success === true, `Response for "${query}" contains success: true`);
    }

    // 4. Empty Search String Handling
    console.log('\n--- Test 4: Empty Search String Safe Handling ---');
    const resEmpty = await fetch(`${baseUrl}/api/menu?search=`);
    const dataEmpty = await resEmpty.json();

    assert(resEmpty.status === 200, 'Empty search string returns HTTP 200');
    assert(dataEmpty.success === true, 'Response contains success: true');
    assert(Array.isArray(dataEmpty.data), 'data is an array');

    // 5. Non-Matching Search Keyword
    console.log('\n--- Test 5: Non-Matching Search Keyword ---');
    const resNoMatch = await fetch(`${baseUrl}/api/menu?search=xyznonexistingrandomfood123`);
    const dataNoMatch = await resNoMatch.json();

    assert(resNoMatch.status === 200, 'Non-matching keyword returns HTTP 200');
    assert(dataNoMatch.success === true, 'Non-matching search returns success: true');
    assert(Array.isArray(dataNoMatch.data) && dataNoMatch.data.length === 0, 'Returns safe empty array');
  } catch (err) {
    console.error('Menu search test error:', err);
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
