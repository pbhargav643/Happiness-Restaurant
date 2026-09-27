import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('ADMIN SETTINGS — SMS NOTIFICATIONS REMOVAL QA TEST');
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

const settingsPath = path.resolve(__dirname, '../../src/pages/admin/AdminSettingsPage.jsx');
assert(fs.existsSync(settingsPath), 'AdminSettingsPage.jsx exists');

const settingsSrc = fs.readFileSync(settingsPath, 'utf8');

// 1. Verify SMS Module Completely Removed
console.log('--- 1. SMS Module Removal Verification ---');
assert(!settingsSrc.includes('SMS Notifications'), 'SMS Notifications heading is completely removed');
assert(!settingsSrc.includes('Send backup SMS notifications'), 'SMS description text is completely removed');
assert(!settingsSrc.includes('isSmsConnected'), 'isSmsConnected state variable is removed');
assert(!settingsSrc.includes('SMS Gateway'), 'SMS Gateway toggle title is removed');
assert(!settingsSrc.includes('sms:'), 'Initial SMS provider status key is removed from AdminSettingsPage');

// 2. Verify WhatsApp Module Preserved
console.log('\n--- 2. WhatsApp Preservation Verification ---');
assert(settingsSrc.includes('WhatsApp Notifications'), 'WhatsApp Notifications heading preserved');
assert(settingsSrc.includes('Send automated WhatsApp messages'), 'WhatsApp description preserved');
assert(settingsSrc.includes('isWhatsAppConnected'), 'isWhatsAppConnected state variable preserved');
assert(settingsSrc.includes('WhatsApp API Connected'), 'WhatsApp toggle preserved');

// 3. Verify Other Settings Preserved
console.log('\n--- 3. Other Settings Preservation Verification ---');
assert(settingsSrc.includes('Audio Chime on New Orders'), 'Audio Chime on New Orders preserved');
assert(settingsSrc.includes('Browser Chime'), 'Browser Chime badge preserved');
assert(settingsSrc.includes('Pickup Settings'), 'Pickup Settings section preserved');
assert(settingsSrc.includes('Restaurant Information'), 'Restaurant Information section preserved');
assert(settingsSrc.includes('System Architecture'), 'System Architecture panel preserved');

// 4. Verify Forbidden Files (No .mjs, .ts, .tsx)
console.log('\n--- 4. Forbidden Extensions Audit ---');
const forbiddenExts = ['.mjs', '.ts', '.tsx'];
function checkForbidden(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory() && ent.name !== 'node_modules' && ent.name !== '.git') {
      checkForbidden(full);
    } else if (ent.isFile()) {
      const ext = path.extname(ent.name).toLowerCase();
      if (forbiddenExts.includes(ext)) {
        assert(false, `Found forbidden file: ${full}`);
      }
    }
  }
}
checkForbidden(path.resolve(__dirname, '../../src'));
assert(true, 'No .mjs, .ts, or .tsx files in frontend/src');

console.log('\n====================================================');
console.log(`SUMMARY: ${passCount} Passed, ${failCount} Failed`);
console.log('====================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('ALL SMS REMOVAL QA TESTS PASSED.');
  process.exit(0);
}
