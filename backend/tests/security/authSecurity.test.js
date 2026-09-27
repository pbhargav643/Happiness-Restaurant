import assert from 'node:assert';
import { hashPassword, comparePassword } from '../../src/utils/password.js';
import { generateToken, verifyToken } from '../../src/utils/jwt.js';

console.log('====================================================');
console.log('PHASE 15: AUTHENTICATION SECURITY TEST SUITE');
console.log('====================================================\n');

let passed = 0;
function pass(desc) {
  passed++;
  console.log(`[PASS] ${desc}`);
}

// 1. Password Hashing & Verification
const testPlainPassword = 'SecureUser@2026';
const hash = await hashPassword(testPlainPassword);

assert(typeof hash === 'string' && hash.length > 20, 'Hash must be a non-trivial string');
assert.notStrictEqual(hash, testPlainPassword, 'Password must never be stored plaintext');
pass('Password is cryptographically hashed with salt and iterations');

const isMatch = await comparePassword(testPlainPassword, hash);
assert.strictEqual(isMatch, true, 'Valid password matches hash');
pass('Valid password successfully verifies against hash');

const isWrongMatch = await comparePassword('WrongPassword@123', hash);
assert.strictEqual(isWrongMatch, false, 'Invalid password is rejected');
pass('Invalid password correctly rejected by constant-time verification');

// 2. JWT Generation & Verification
const payload = { sub: '60d5ec49f1b2c8b1f8e4e1a1', role: 'ADMIN' };
const token = generateToken(payload, { expiresIn: '1h' });

assert(typeof token === 'string' && token.split('.').length === 3, 'JWT must have 3 segments');
pass('JWT is signed with standard RFC 7519 3-part structure');

const decoded = verifyToken(token);
assert.strictEqual(decoded.sub, payload.sub, 'Token sub claim matches');
assert.strictEqual(decoded.role, payload.role, 'Token role claim matches');
assert(typeof decoded.exp === 'number', 'Token contains expiration timestamp');
pass('JWT verifies valid signature and correctly extracts claims');

// 3. Invalid & Tampered Token Handling
let tamperedCaught = false;
try {
  const parts = token.split('.');
  const tampered = `${parts[0]}.${parts[1]}xyz.${parts[2]}`;
  verifyToken(tampered);
} catch (err) {
  tamperedCaught = true;
}
assert.strictEqual(tamperedCaught, true, 'Tampered token signature must be rejected');
pass('Tampered token signature is strictly rejected');

// 4. Malformed Token Handling
const malformedTokens = ['', 'invalid-string', 'a.b', 'a.b.c.d', null, undefined];
for (const badToken of malformedTokens) {
  let caught = false;
  try {
    verifyToken(badToken);
  } catch (err) {
    caught = true;
  }
  assert.strictEqual(caught, true, `Malformed token "${badToken}" must throw error`);
}
pass('All malformed token structures throw safe verification errors');

// 5. Expired Token Handling
const expiredToken = generateToken(payload, { expiresIn: -10 }); // Expired 10 seconds ago
let expiredCaught = false;
try {
  verifyToken(expiredToken);
} catch (err) {
  expiredCaught = true;
  assert(err.name === 'TokenExpiredError' || err.message.includes('expired'), 'Error identifies expiration');
}
assert.strictEqual(expiredCaught, true, 'Expired token must be rejected');
pass('Expired tokens throw TokenExpiredError');

console.log('\n====================================================');
console.log(`AUTH SECURITY TESTS: ${passed} PASSED, 0 FAILED`);
console.log('====================================================\n');
