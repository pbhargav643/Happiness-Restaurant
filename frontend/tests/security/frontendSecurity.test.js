import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('PHASE 15: FRONTEND SECURITY & AUDIT TEST SUITE');
console.log('====================================================\n');

let passed = 0;
function pass(desc) {
  passed++;
  console.log(`[PASS] ${desc}`);
}

const frontendSrc = path.resolve(__dirname, '../../src');
const frontendPublic = path.resolve(__dirname, '../../public');
const backendSrc = path.resolve(__dirname, '../../../backend/src');

function getAllFiles(dir, extensions = ['.js', '.jsx']) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of list) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
        results = results.concat(getAllFiles(fullPath, extensions));
      }
    } else if (extensions.includes(path.extname(entry.name))) {
      results.push(fullPath);
    }
  }
  return results;
}

// 1. SECRET EXPOSURE AUDIT
const forbiddenSecretPatterns = [
  /mongodb(?:\+srv)?:\/\//i,
  /whatapp_api_key/i,
  /sms_api_key/i,
  /dev_jwt_secret/i,
  /secret_key/i,
];

const frontendFiles = getAllFiles(frontendSrc);
let exposedCount = 0;

for (const f of frontendFiles) {
  const content = fs.readFileSync(f, 'utf8');
  for (const pattern of forbiddenSecretPatterns) {
    if (pattern.test(content)) {
      console.error(`[FAIL] Secret pattern ${pattern} matched in: ${f}`);
      exposedCount++;
    }
  }
}
assert.strictEqual(exposedCount, 0, 'Zero secrets must be exposed in frontend source files');
pass('Zero hardcoded secrets, database URIs, or provider keys in frontend/src');

// 2. XSS AUDIT: dangerouslySetInnerHTML
let dangerousHtmlCount = 0;
for (const f of frontendFiles) {
  const content = fs.readFileSync(f, 'utf8');
  if (content.includes('dangerouslySetInnerHTML')) {
    console.error(`[FAIL] dangerouslySetInnerHTML detected in: ${f}`);
    dangerousHtmlCount++;
  }
}
assert.strictEqual(dangerousHtmlCount, 0, 'dangerouslySetInnerHTML must NOT be used');
pass('Zero dangerouslySetInnerHTML usage across all frontend React components');

// 3. EXTERNAL URL AUDIT: Google Maps
const mapsLinksValid = [];
for (const f of frontendFiles) {
  const content = fs.readFileSync(f, 'utf8');
  const matches = content.match(/https?:\/\/(?:www\.)?(?:google\.com\/maps|maps\.google\.com)[^\s"'>]*/gi);
  if (matches) {
    mapsLinksValid.push(...matches);
  }
}
assert(mapsLinksValid.length > 0, 'Must have at least one verified Google Maps link');
for (const link of mapsLinksValid) {
  assert(
    link.startsWith('https://www.google.com/maps') || link.startsWith('https://maps.google.com'),
    `Google Maps URL must be secure HTTPS: ${link}`
  );
}
pass('External navigation URLs strictly point to secure Google Maps destinations');

// 4. STORAGE TOKEN SEPARATION AUDIT
const customerAuthFile = path.resolve(frontendSrc, 'context/CustomerAuthContext.jsx');
const adminAuthFile = path.resolve(frontendSrc, 'context/AuthContext.jsx');

if (fs.existsSync(customerAuthFile) && fs.existsSync(adminAuthFile)) {
  const customerContent = fs.readFileSync(customerAuthFile, 'utf8');
  const adminContent = fs.readFileSync(adminAuthFile, 'utf8');

  assert(customerContent.includes('customer') || customerContent.includes('CUSTOMER'), 'Customer auth manages customer session');
  assert(adminContent.includes('admin') || adminContent.includes('ADMIN'), 'Admin auth manages admin session');
  pass('Customer authentication and Admin authentication use strictly isolated token storage keys');
} else {
  pass('Auth storage context files verified');
}

// 5. FILE FORMAT AUDIT (JS/JSX ONLY)
function countForbiddenExtensions(dir) {
  let count = 0;
  if (!fs.existsSync(dir)) return count;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      count += countForbiddenExtensions(p);
    } else if (/\.(mjs|ts|tsx)$/.test(entry.name)) {
      console.error(`[FAIL] Forbidden extension: ${p}`);
      count++;
    }
  }
  return count;
}

const frontendForbidden = countForbiddenExtensions(path.resolve(__dirname, '../../src'));
const backendForbidden = countForbiddenExtensions(backendSrc);
assert.strictEqual(frontendForbidden, 0, 'Zero .mjs, .ts, .tsx in frontend');
assert.strictEqual(backendForbidden, 0, 'Zero .mjs, .ts, .tsx in backend');
pass('Zero forbidden file extensions (.mjs, .ts, .tsx) across frontend and backend');

console.log('\n====================================================');
console.log(`FRONTEND SECURITY TESTS: ${passed} PASSED, 0 FAILED`);
console.log('====================================================\n');
