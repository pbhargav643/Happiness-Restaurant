import assert from 'node:assert';
import { errorHandler } from '../../src/middleware/errorHandler.js';

console.log('====================================================');
console.log('PHASE 15: ERROR SECURITY & SANITIZATION TEST SUITE');
console.log('====================================================\n');

let passed = 0;
function pass(desc) {
  passed++;
  console.log(`[PASS] ${desc}`);
}

function mockResponse() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
}

// 1. Stack trace exposure check
const errWithStack = new Error('Database connection failed');
errWithStack.stack = 'Error: Database connection failed\n    at Object.<anonymous> (E:\\Restaurant Foods Project\\backend\\server.js:10:5)';
const res1 = mockResponse();

errorHandler(errWithStack, { method: 'GET', originalUrl: '/api/test' }, res1, () => {});

assert.strictEqual(res1.body.stack, undefined, 'Stack trace must NEVER be included in response body');
assert(!JSON.stringify(res1.body).includes('server.js:10:5'), 'Internal code frame must not be disclosed');
pass('Error responses strictly omit stack traces');

// 2. MongoDB connection string redaction
const errWithUri = new Error('Failed to connect to mongodb+srv://admin_user:SuperSecretPassword123@cluster0.mongodb.net/foods');
const res2 = mockResponse();

errorHandler(errWithUri, { method: 'GET', originalUrl: '/api/test' }, res2, () => {});

assert(!res2.body.message.includes('SuperSecretPassword123'), 'URI password must be redacted');
assert(!res2.body.message.includes('mongodb+srv://'), 'MongoDB URI scheme must be redacted');
assert(res2.body.message.includes('[REDACTED_URI]'), 'Replaced with [REDACTED_URI]');
pass('MongoDB connection URIs with embedded credentials are fully redacted');

// 3. Filesystem path redaction
const errWithPath = new Error('Cannot read file at E:\\Restaurant Foods Project\\backend\\config\\env.js');
const res3 = mockResponse();

errorHandler(errWithPath, { method: 'GET', originalUrl: '/api/test' }, res3, () => {});

assert(!res3.body.message.includes('E:\\Restaurant'), 'Filesystem drive path must be redacted');
assert(res3.body.message.includes('[PATH]'), 'Replaced with [PATH]');
pass('Internal server filesystem paths are fully redacted from error messages');

// 4. Bearer Token redaction
const errWithToken = new Error('Authentication failed with header: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.signature');
const res4 = mockResponse();

errorHandler(errWithToken, { method: 'GET', originalUrl: '/api/test' }, res4, () => {});

assert(!res4.body.message.includes('eyJhbGciOiJIUzI1Ni'), 'JWT signature/payload must be redacted');
assert(res4.body.message.includes('[REDACTED_TOKEN]'), 'Replaced with [REDACTED_TOKEN]');
pass('Bearer tokens and JWT strings are fully redacted from error messages');

console.log('\n====================================================');
console.log(`ERROR SECURITY TESTS: ${passed} PASSED, 0 FAILED`);
console.log('====================================================\n');
