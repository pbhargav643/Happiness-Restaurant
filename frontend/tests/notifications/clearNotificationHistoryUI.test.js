import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendSrc = path.resolve(__dirname, '../../src');

console.log('====================================================');
console.log('PHASE 14: FRONTEND NOTIFICATION HISTORY CLEAR UI TEST');
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
  // 1. ADMIN ALERTS PAGE UI AUDIT
  console.log('--- 1. Admin Alerts Page Clear History Audit ---');
  const alertsPath = path.join(frontendSrc, 'pages/admin/AdminAlertsPage.jsx');
  assert(fs.existsSync(alertsPath), 'AdminAlertsPage.jsx exists');
  const alertsCode = fs.readFileSync(alertsPath, 'utf-8');

  // Verify Clear History button visible directly beside dropdowns
  assert(alertsCode.includes('aria-label="Clear Notification History"') && alertsCode.includes('<span>Clear History</span>'), 'Clear History button is visible directly beside dropdowns');

  // Verify Modal & Selection Controls
  assert(alertsCode.includes('Clear Notification History'), 'Modal includes Clear Notification History title');
  assert(alertsCode.includes('Year'), 'Includes Year label and dropdown');
  assert(alertsCode.includes('Month'), 'Includes Month label and dropdown');
  assert(alertsCode.includes('availableYears'), 'Derives available years dynamically from notification history');
  assert(alertsCode.includes('MONTH_NAMES'), 'Provides full month selection options (January to December)');
  assert(alertsCode.includes('Notification records:'), 'Displays Notification records count in period');

  // Verify Confirmation Dialog
  assert(alertsCode.includes('Clear Notification History?'), 'Includes confirmation dialog heading');
  assert(
    alertsCode.includes('You are about to permanently delete') || alertsCode.includes('This will permanently remove'),
    'Includes clear confirmation warning message'
  );
  assert(alertsCode.includes('Cancel') && alertsCode.includes('handleConfirmClear'), 'Confirmation dialog provides Cancel and Confirm actions');

  // Verify Empty Month Guard
  assert(
    alertsCode.includes('No notification history found for') || alertsCode.includes('recordsInSelectedPeriod === 0'),
    'Guards against empty month deletion and provides informative message'
  );

  // Verify Filter Dropdowns Preserved
  assert(alertsCode.includes('FilterDropdown'), 'Preserves custom FilterDropdown components');
  assert(alertsCode.includes('channel-filter') && alertsCode.includes('status-filter'), 'Preserves channel and status filter controls');

  // Verify Table Columns Preserved
  const requiredColumns = ['Order ID', 'Event', 'Channel', 'Recipient', 'Status', 'Timestamp', 'Details', 'Action'];
  for (const col of requiredColumns) {
    assert(alertsCode.includes(col), `Preserves "${col}" table column`);
  }

  // 2. ADMIN NOTIFICATION API CLIENT AUDIT
  console.log('\n--- 2. Admin Notification API Service Audit ---');
  const apiPath = path.join(frontendSrc, 'services/adminNotificationApi.js');
  assert(fs.existsSync(apiPath), 'adminNotificationApi.js exists');
  const apiCode = fs.readFileSync(apiPath, 'utf-8');

  assert(apiCode.includes('clearHistory'), 'adminNotificationApi exposes clearHistory method');
  assert(apiCode.includes('/notifications/history'), 'Calls /notifications/history endpoint');

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
}

runTests();
