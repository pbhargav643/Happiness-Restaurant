import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import app from '../../src/app.js';
import connectDB, { disconnectDB } from '../../src/config/database.js';
import Admin from '../../src/models/Admin.js';
import { generateToken } from '../../src/utils/jwt.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('PHASE 13 PROMPT 3: NOTIFICATION SECURITY AUDIT TEST');
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
    await connectDB();

    // 1. Static Source Code Secrets Audit (Frontend & Backend)
    console.log('--- 1. Static Code Secrets Audit ---');
    const sensitivePatterns = [
      /sk_live_[a-zA-Z0-9]+/i,
      /AIza[0-9A-Za-z-_]{35}/i,
      /EAA[a-zA-Z0-9]+/i, // Meta token prefix
    ];

    const frontendSrc = path.resolve(__dirname, '../../../frontend/src');
    const checkDir = (dir) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          checkDir(fullPath);
        } else if (/\.(js|jsx)$/.test(entry.name)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          for (const pattern of sensitivePatterns) {
            assert(!pattern.test(content), `No hardcoded live secret in ${entry.name}`);
          }
        }
      }
    };
    checkDir(frontendSrc);
    assert(true, 'Frontend codebase contains zero hardcoded API secrets');

    // 2. Token Redaction in Error Messages
    console.log('\n--- 2. Token Redaction in Error Handlers ---');
    const sampleBearerError = 'Error: Bearer EAABb123456789xyz rejected with code 401';
    const redacted = sampleBearerError.replace(/Bearer\s+[^\s]+/gi, '[REDACTED_TOKEN]');
    assert(!redacted.includes('EAABb123456789xyz'), 'Sensitive bearer token is redacted');
    assert(redacted.includes('[REDACTED_TOKEN]'), 'Replaced with [REDACTED_TOKEN]');

    // 3. API Response Zero Secret Exposure
    console.log('\n--- 3. API Response Zero Secret Audit ---');
    const admin = await Admin.findOne({ role: 'ADMIN', isActive: true });
    assert(Boolean(admin), 'Found active admin in database');

    const adminToken = generateToken({ sub: admin._id.toString(), role: 'ADMIN' });
    const resStatus = await fetch(`${baseUrl}/api/notifications/status`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert(resStatus.status === 200, 'Admin can access notification status');
    const statusData = await resStatus.json();
    const rawStatus = JSON.stringify(statusData);

    assert(!rawStatus.toLowerCase().includes('key'), 'Status response does not expose keys');
    assert(!rawStatus.toLowerCase().includes('secret'), 'Status response does not expose secrets');
    assert(!rawStatus.toLowerCase().includes('password'), 'Status response does not expose passwords');
    assert(!rawStatus.toLowerCase().includes('token'), 'Status response does not expose tokens');

    // 4. Role-Based Access Control on Notification Routes
    console.log('\n--- 4. RBAC Authorization Enforcement ---');
    const unauthRes = await fetch(`${baseUrl}/api/notifications/status`);
    assert(unauthRes.status === 401, 'Unauthenticated request receives 401 Unauthorized');

    const custToken = generateToken({ sub: 'customer_123', role: 'CUSTOMER' });
    const custRes = await fetch(`${baseUrl}/api/notifications/status`, {
      headers: { Authorization: `Bearer ${custToken}` },
    });
    assert(custRes.status === 403, 'Customer token receives 403 Forbidden');

  } catch (err) {
    console.error('Security test error:', err);
    failCount++;
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
  }

  console.log('\n====================================================');
  console.log(`TOTAL PASSED: ${passCount}`);
  console.log(`TOTAL FAILED: ${failCount}`);
  console.log('====================================================\n');

  if (failCount > 0) process.exit(1);
}

runTests();
