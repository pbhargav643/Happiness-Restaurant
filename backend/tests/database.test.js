import connectDB, { mongoose } from '../src/config/database.js';
import { env } from '../src/config/env.js';

console.log('====================================================');
console.log('BACKEND DATABASE CONFIGURATION AUTOMATED TEST SUITE');
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
  try {
    // 1. Module Structure & Exports
    console.log('--- Test 1: Module Structure & Exports ---');
    assert(typeof connectDB === 'function', 'connectDB is exported as a callable function');
    assert(typeof mongoose === 'object' && typeof mongoose.connect === 'function', 'Mongoose instance is available and configured');
    assert(typeof env === 'object', 'env config object is available');
    assert(typeof env.PORT === 'number', 'env.PORT is configured as a number');
    assert(typeof env.MONGODB_URI === 'string', 'env.MONGODB_URI is configured as a string');

    // 2. Empty URI Handling
    console.log('\n--- Test 2: Missing MONGODB_URI Handling ---');
    let errorLogged = false;
    const originalErr = console.error;
    console.error = (...args) => {
      errorLogged = true;
    };

    const emptyUriResult = await connectDB('');
    console.error = originalErr;

    assert(emptyUriResult === null, 'connectDB returns null when URI is empty');
    assert(errorLogged, 'connectDB logs clean failure message when URI is missing');

    // 3. Connection Failure Graceful Handling (without crash)
    console.log('\n--- Test 3: Connection Failure Graceful Handling ---');
    let failureLogged = false;
    console.error = (...args) => {
      failureLogged = true;
    };

    // Attempt connecting to non-existent host with short timeout
    const failResult = await connectDB('mongodb://127.0.0.1:9999/non_existent_db?connectTimeoutMS=1000&serverSelectionTimeoutMS=1000');
    console.error = originalErr;

    assert(failResult === null, 'connectDB returns null when MongoDB is unreachable');
    assert(failureLogged, 'connectDB logs informative error on connection failure without uncaught crash');

    // 4. Runtime Connection Listeners
    console.log('\n--- Test 4: Runtime Connection Listeners ---');
    const listenersDisconnected = mongoose.connection.listeners('disconnected');
    const listenersError = mongoose.connection.listeners('error');

    assert(listenersDisconnected.length > 0, 'disconnected event listener is registered for runtime monitoring');
    assert(listenersError.length > 0, 'error event listener is registered for runtime error tracking');

    // 5. Credential Security Verification
    console.log('\n--- Test 5: Credential Security Verification ---');
    assert(
      !env.MONGODB_URI || !env.MONGODB_URI.includes('password'),
      'No sensitive production credentials hardcoded in active configuration'
    );
  } catch (error) {
    console.error('Database test execution error:', error);
    failCount++;
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
