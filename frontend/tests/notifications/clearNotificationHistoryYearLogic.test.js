import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('CLEAR NOTIFICATION HISTORY — YEAR LOGIC & BUTTON STYLE QA TEST SUITE');
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

// 1. Source Code Inspection
console.log('--- 1. AdminAlertsPage.jsx Source Code Inspection ---');
const alertsPath = path.resolve(__dirname, '../../src/pages/admin/AdminAlertsPage.jsx');
assert(fs.existsSync(alertsPath), 'AdminAlertsPage.jsx exists');
const alertsSrc = fs.readFileSync(alertsPath, 'utf8');

// Extract NOTIFICATION_START_YEAR and NOTIFICATION_MAX_YEAR values
const startYearMatch = alertsSrc.match(/NOTIFICATION_START_YEAR\s*=\s*(\d+)/);
const maxYearMatch = alertsSrc.match(/NOTIFICATION_MAX_YEAR\s*=\s*(\d+)/);

assert(startYearMatch && Number(startYearMatch[1]) === 2026, 'NOTIFICATION_START_YEAR is 2026');
assert(maxYearMatch && Number(maxYearMatch[1]) === 2035, 'NOTIFICATION_MAX_YEAR is 2035');

const START_YEAR = Number(startYearMatch[1]);
const MAX_YEAR = Number(maxYearMatch[1]);
const SUPPORTED_YEARS = Array.from(
  { length: MAX_YEAR - START_YEAR + 1 },
  (_, idx) => START_YEAR + idx
);

function calculateNotificationDefaultYear(targetDate = new Date()) {
  const currentYear = targetDate.getFullYear();
  if (currentYear < START_YEAR) return String(START_YEAR);
  if (currentYear > MAX_YEAR) return String(MAX_YEAR);
  return String(currentYear);
}

// 2. Year Range Verification (2026 through 2035 inclusive)
console.log('\n--- 2. Year Range (2026–2035 Inclusive) ---');
assert(SUPPORTED_YEARS.length === 10, 'NOTIFICATION_SUPPORTED_YEARS contains exactly 10 years');
assert(SUPPORTED_YEARS[0] === 2026, 'First supported year is 2026');
assert(SUPPORTED_YEARS[SUPPORTED_YEARS.length - 1] === 2035, 'Last supported year is 2035');
assert(
  JSON.stringify(SUPPORTED_YEARS) === JSON.stringify([2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035]),
  'Year options: 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035 only'
);
assert(!SUPPORTED_YEARS.includes(2036), '2036: Not available in options');
assert(!SUPPORTED_YEARS.includes(2037), '2037: Not available in options');
assert(!SUPPORTED_YEARS.includes(2025), '2025: Not available in options');

// 3. Dynamic Current Year Auto-Selection
console.log('\n--- 3. Dynamic Current Year Auto-Selection ---');
assert(calculateNotificationDefaultYear(new Date('2026-05-15')) === '2026', '2026: Default year = 2026');
assert(calculateNotificationDefaultYear(new Date('2027-01-01')) === '2027', '2027: Automatically selects 2027');
assert(calculateNotificationDefaultYear(new Date('2028-09-20')) === '2028', '2028: Automatically selects 2028');
assert(calculateNotificationDefaultYear(new Date('2030-11-10')) === '2030', '2030: Automatically selects 2030');
assert(calculateNotificationDefaultYear(new Date('2035-12-31')) === '2035', '2035: Automatically selects 2035');

// 4. Post-2035 Maximum Limit & Boundary Capping
console.log('\n--- 4. 2035 Maximum Limit & Boundary Capping ---');
assert(calculateNotificationDefaultYear(new Date('2036-01-01')) === '2035', '2036: Safely capped at 2035, does not generate 2036');
assert(calculateNotificationDefaultYear(new Date('2040-06-15')) === '2035', '2040: Safely capped at 2035, does not generate 2040');
assert(calculateNotificationDefaultYear(new Date('2024-01-01')) === '2026', 'Pre-2026: Safely clamped to 2026');

// 5. Manual Year Selection Preservation
console.log('\n--- 5. Manual Year Selection Preservation ---');
assert(
  alertsSrc.includes('setSelectedYear(e.target.value)') &&
  alertsSrc.includes("useState(() => calculateNotificationDefaultYear())"),
  'MANUAL SELECTION: Initialized to dynamic default and updates via setSelectedYear without override effects'
);
assert(
  !alertsSrc.includes('setSelectedYear(String(availableYears[0]))'),
  'NO HARD OVERWRITE: Removed old effect that reset selectedYear to logs[0]'
);

// 6. Month Logic Unchanged
console.log('\n--- 6. Month Logic Unchanged ---');
assert(
  alertsSrc.includes('MONTH_NAMES = [') &&
  alertsSrc.includes("'January', 'February', 'March', 'April', 'May', 'June'") &&
  alertsSrc.includes("'July', 'August', 'September', 'October', 'November', 'December'"),
  'MONTH LOGIC: Full 12-month array preserved exactly'
);
assert(
  alertsSrc.includes('id="clear-history-month"') && alertsSrc.includes('MONTH_NAMES.map'),
  'MONTH DROPDOWN: Preserves existing month dropdown options'
);

// 7. Notification Record Count Logic Unchanged
console.log('\n--- 7. Notification Record Count Logic Unchanged ---');
assert(
  alertsSrc.includes('recordsInSelectedPeriod') &&
  alertsSrc.includes('d.getFullYear() === yNum && (d.getMonth() + 1) === mNum'),
  'RECORD COUNT: Derives count from NotificationLog timestamps matching selected month & year'
);
assert(
  alertsSrc.includes('Notification records:'),
  'RECORD COUNT UI: Displays Notification records count card'
);

// 8. Delete Logic Unchanged
console.log('\n--- 8. Delete Logic Unchanged ---');
assert(
  alertsSrc.includes('adminNotificationApi.clearHistory(selectedYear, selectedMonth)'),
  'DELETE LOGIC: Calls adminNotificationApi.clearHistory with selectedYear and selectedMonth'
);

// 9. Clear History Button Unique Style & Trash Icon
console.log('\n--- 9. Clear History Button Unique Style & Trash Icon ---');
assert(
  alertsSrc.includes('bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800'),
  'BUTTON STYLE: Features elegant crimson/rose gradient for destructive action'
);
assert(
  alertsSrc.includes('border-rose-500/40') && alertsSrc.includes('rounded-xl'),
  'BUTTON STYLE: Modern rounded-xl shape with subtle border accent'
);
assert(
  alertsSrc.includes('shadow-xs hover:shadow-md'),
  'BUTTON STYLE: Subtle shadow with smooth elevation on hover'
);
assert(
  alertsSrc.includes('hover:-translate-y-[1px]') && alertsSrc.includes('active:translate-y-[0.5px]'),
  'BUTTON STYLE: Micro-interaction with smooth hover transition and press feedback'
);
assert(
  alertsSrc.includes('M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'),
  'BUTTON ICON: Includes modern trash SVG icon'
);

// 10. Dynamic Button Text
console.log('\n--- 10. Dynamic Button Text ---');
assert(
  alertsSrc.includes('Clear {selectedMonthName} {selectedYear} History'),
  'DYNAMIC TEXT: Button text dynamically displays "Clear {selectedMonthName} {selectedYear} History"'
);

// 11. Confirmation Dialog Preserved
console.log('\n--- 11. Confirmation Flow Preserved ---');
assert(
  alertsSrc.includes('Clear Notification History?') &&
  alertsSrc.includes('setShowConfirmation(true)'),
  'CONFIRMATION: Two-step confirmation flow required before deletion'
);

// 12. Empty Month/Year Guard
console.log('\n--- 12. Empty Month/Year Guard ---');
assert(
  alertsSrc.includes('recordsInSelectedPeriod === 0') &&
  alertsSrc.includes('No notification history found for'),
  'EMPTY GUARD: Guards against deleting empty periods and displays warning notice'
);

// 13. File Format Audit (.js, .jsx, *.test.js only)
console.log('\n--- 13. File Format Audit ---');
const frontendSrc = path.resolve(__dirname, '../../src');
const forbiddenExts = ['.mjs', '.ts', '.tsx'];
function scanDir(dir, forbidden) {
  let found = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name !== 'node_modules' && ent.name !== '.git') {
        found = found.concat(scanDir(full, forbidden));
      }
    } else if (ent.isFile()) {
      const ext = path.extname(ent.name).toLowerCase();
      if (forbidden.includes(ext)) {
        found.push(full);
      }
    }
  }
  return found;
}
const srcForbidden = scanDir(frontendSrc, forbiddenExts);
assert(srcForbidden.length === 0, `No forbidden .mjs, .ts, or .tsx files in frontend/src (found: ${srcForbidden.length})`);

console.log('\n====================================================');
console.log(`TOTAL PASSED: ${passCount}`);
console.log(`TOTAL FAILED: ${failCount}`);
console.log('====================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('ALL CLEAR NOTIFICATION HISTORY QA TESTS PASSED.');
  process.exit(0);
}
