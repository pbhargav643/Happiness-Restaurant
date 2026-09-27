import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendSrc = path.resolve(__dirname, '../../src');

console.log('====================================================');
console.log('PHASE 13: FRONTEND ADMIN NOTIFICATIONS UI TEST');
console.log('====================================================\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

function runTests() {
  // 1. ADMIN ORDER DETAIL AUDIT
  console.log('--- 1. Admin Order Detail Page Notifications Audit ---');
  const detailPath = path.join(frontendSrc, 'pages/admin/AdminOrderDetailPage.jsx');
  assert(fs.existsSync(detailPath), 'AdminOrderDetailPage.jsx exists');
  const detailCode = fs.readFileSync(detailPath, 'utf-8');

  // Notifications Section presence
  assert(detailCode.includes('data-testid="notifications-section"') || detailCode.includes('Order Notifications'), 'Renders Order Notifications section');
  assert(detailCode.includes('adminNotificationApi'), 'Imports adminNotificationApi service');

  // WhatsApp & SMS Provider State Badges
  assert(detailCode.includes('providerStatus.whatsapp === \'CONFIGURED\''), 'Checks WhatsApp CONFIGURED status');
  assert(detailCode.includes('providerStatus.sms === \'CONFIGURED\''), 'Checks SMS CONFIGURED status');
  assert(detailCode.includes('Not Configured'), 'Renders Not Configured fallback badge');

  // Delivery States (SENT, FAILED, Not Configured)
  assert(detailCode.includes('latestLog.status === \'SENT\''), 'Handles SENT delivery state');
  assert(detailCode.includes('latestLog.status === \'FAILED\''), 'Handles FAILED delivery state');
  assert(detailCode.includes('Sent') && detailCode.includes('Failed'), 'Renders user-friendly Sent and Failed badges');

  // Manual Retry Foundation
  assert(detailCode.includes('handleRetryNotification'), 'Implements manual retry handler');
  assert(detailCode.includes('Retry Notifications') || detailCode.includes('Retry'), 'Provides explicit Retry action button');
  assert(detailCode.includes('retryingNotification'), 'Implements loading state guard during retry');
  assert(detailCode.includes('providerMessageId'), 'Displays providerMessageId when available');

  // 2. ADMIN NOTIFICATION API CLIENT AUDIT
  console.log('\n--- 2. Admin Notification API Service Audit ---');
  const apiPath = path.join(frontendSrc, 'services/adminNotificationApi.js');
  assert(fs.existsSync(apiPath), 'adminNotificationApi.js exists');
  const apiCode = fs.readFileSync(apiPath, 'utf-8');

  assert(apiCode.includes('getProviderStatus'), 'Exposes getProviderStatus method');
  assert(apiCode.includes('getOrderNotifications'), 'Exposes getOrderNotifications method');
  assert(apiCode.includes('retryNotification'), 'Exposes retryNotification method');
  assert(apiCode.includes('retryNotificationById'), 'Exposes retryNotificationById method');
  assert(apiCode.includes('/notifications/order/'), 'Calls /notifications/order endpoint');
  assert(apiCode.includes('/notifications/status'), 'Calls /notifications/status endpoint');

  // 3. FILE FORMAT AUDIT (0 .mjs, 0 .ts, 0 .tsx in frontend/src)
  console.log('\n--- 3. File Format Audit ---');
  function scanDir(dir, forbiddenExts) {
    let found = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name !== 'node_modules' && ent.name !== '.git') {
          found = found.concat(scanDir(full, forbiddenExts));
        }
      } else if (ent.isFile()) {
        const ext = path.extname(ent.name).toLowerCase();
        if (forbiddenExts.includes(ext)) {
          found.push(full);
        }
      }
    }
    return found;
  }

  const forbidden = ['.mjs', '.ts', '.tsx'];
  const srcForbidden = scanDir(frontendSrc, forbidden);
  assert(srcForbidden.length === 0, `No forbidden files in frontend/src (found: ${srcForbidden.length})`);

  console.log('\n====================================================');
  console.log(`TOTAL PASSED: ${passed}`);
  console.log(`TOTAL FAILED: ${failed}`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests();
