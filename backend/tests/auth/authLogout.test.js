import http from 'http';
import app from '../../src/app.js';

console.log('====================================================');
console.log('BACKEND POST /api/auth/logout TEST SUITE');
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
    console.log('--- Test 1: POST /api/auth/logout ---');
    const res = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    assert(res.status === 200, 'Logout endpoint returns HTTP 200');
    assert(data.success === true, 'Logout response contains success: true');
    assert(data.message.includes('Logged out'), 'Logout message acknowledges completion');
  } catch (err) {
    console.error('Test execution error:', err);
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
