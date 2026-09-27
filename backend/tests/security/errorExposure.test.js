import assert from 'node:assert';
import http from 'node:http';
import app from '../../src/app.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';

console.log('====================================================');
console.log('PHASE 15: ERROR EXPOSURE & SENSITIVE DATA LEAK QA');
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

// 1. Stack Trace Exposure
const errWithStack = new Error('Simulated internal failure');
errWithStack.stack = 'Error: Simulated internal failure\n    at Object.<anonymous> (E:\\Restaurant Foods Project\\backend\\server.js:42:10)';
const res1 = mockResponse();
errorHandler(errWithStack, { method: 'GET', originalUrl: '/api/test' }, res1, () => {});

assert.strictEqual(res1.body.stack, undefined, 'Stack trace must NEVER be included in response body');
assert(!JSON.stringify(res1.body).includes('server.js:42:10'), 'Internal code frame must not be disclosed');
pass('Stack traces are strictly omitted from error responses');

// 2. Database URI & Embedded Credentials Redaction
const errWithUri = new Error('MongoServerError: failed to connect to mongodb+srv://db_admin:P@ssw0rd999!@cluster.mongodb.net/prod');
const res2 = mockResponse();
errorHandler(errWithUri, { method: 'GET', originalUrl: '/api/test' }, res2, () => {});

assert(!res2.body.message.includes('P@ssw0rd999!'), 'Database password must be redacted');
assert(!res2.body.message.includes('mongodb+srv://'), 'Database connection string must be redacted');
assert(res2.body.message.includes('[REDACTED_URI]'), 'Replaced with [REDACTED_URI]');
pass('Database connection URI and credentials are completely redacted');

// 3. Server Filesystem Path Redaction
const errWithPath = new Error('ENOENT: no such file or directory, open "E:\\Restaurant Foods Project\\backend\\src\\config\\keys.env"');
const res3 = mockResponse();
errorHandler(errWithPath, { method: 'GET', originalUrl: '/api/test' }, res3, () => {});

assert(!res3.body.message.includes('E:\\Restaurant Foods Project'), 'Local drive path must be redacted');
assert(res3.body.message.includes('[PATH]'), 'Filesystem path replaced with [PATH]');
pass('Server filesystem paths are safely redacted');

// 4. Secret / Token Redaction
const errWithSecret = new Error('Invalid JWT: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.some-signature');
const res4 = mockResponse();
errorHandler(errWithSecret, { method: 'GET', originalUrl: '/api/test' }, res4, () => {});

assert(!res4.body.message.includes('eyJhbGciOiJIUzI1Ni'), 'Token string must be redacted');
assert(res4.body.message.includes('[REDACTED_TOKEN]'), 'Bearer token replaced with [REDACTED_TOKEN]');
pass('JWT and Bearer tokens are safely redacted from error messages');

// 5. 404 Not Found Safety
const server = http.createServer(app);
await new Promise((resolve) => server.listen(0, resolve));
const port = server.address().port;
const baseUrl = `http://127.0.0.1:${port}`;

try {
  const notFoundRes = await fetch(`${baseUrl}/api/non-existent-endpoint-12345`);
  assert.strictEqual(notFoundRes.status, 404, '404 status code returned');
  const notFoundBody = await notFoundRes.json();
  assert.strictEqual(notFoundBody.success, false);
  assert(!JSON.stringify(notFoundBody).includes('stack'), 'No stack on 404');
  pass('Non-existent endpoints return clean 404 with no internal details');

  console.log('\n====================================================');
  console.log(`ERROR EXPOSURE TESTS: ${passed} PASSED, 0 FAILED`);
  console.log('====================================================\n');
} finally {
  await new Promise((resolve) => server.close(resolve));
}
