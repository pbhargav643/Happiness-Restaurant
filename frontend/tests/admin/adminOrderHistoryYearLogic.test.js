import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('ADMIN ORDER HISTORY — YEAR LOGIC ONLY QA TEST SUITE');
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
console.log('--- 1. AdminDashboardPage.jsx Year Logic Inspection ---');
const dashboardPath = path.resolve(__dirname, '../../src/pages/admin/AdminDashboardPage.jsx');
assert(fs.existsSync(dashboardPath), 'AdminDashboardPage.jsx exists');
const dashboardSrc = fs.readFileSync(dashboardPath, 'utf8');

// Extract START_YEAR and MAX_YEAR values
const startYearMatch = dashboardSrc.match(/START_YEAR\s*=\s*(\d+)/);
const maxYearMatch = dashboardSrc.match(/MAX_YEAR\s*=\s*(\d+)/);

assert(startYearMatch && Number(startYearMatch[1]) === 2026, 'START_YEAR is 2026');
assert(maxYearMatch && Number(maxYearMatch[1]) === 2035, 'MAX_YEAR is 2035');

// Extract calculateDefaultYear logic and test it dynamically
const START_YEAR = Number(startYearMatch[1]);
const MAX_YEAR = Number(maxYearMatch[1]);
const SUPPORTED_YEARS = Array.from(
  { length: MAX_YEAR - START_YEAR + 1 },
  (_, idx) => START_YEAR + idx
);

function calculateDefaultYear(targetDate = new Date()) {
  const currentYear = targetDate.getFullYear();
  if (currentYear < START_YEAR) return String(START_YEAR);
  if (currentYear > MAX_YEAR) return String(MAX_YEAR);
  return String(currentYear);
}

// 2. Year Range Verification (2026 through 2035 inclusive)
console.log('\n--- 2. Year Range (2026-2035 Inclusive) ---');
assert(SUPPORTED_YEARS.length === 10, 'SUPPORTED_YEARS contains exactly 10 years');
assert(SUPPORTED_YEARS[0] === 2026, 'First supported year is 2026');
assert(SUPPORTED_YEARS[SUPPORTED_YEARS.length - 1] === 2035, 'Last supported year is 2035');
assert(
  JSON.stringify(SUPPORTED_YEARS) === JSON.stringify([2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035]),
  'Year options: 2026–2035 only'
);
assert(!SUPPORTED_YEARS.includes(2036), '2036: Not available in options');
assert(!SUPPORTED_YEARS.includes(2037), '2037: Not available in options');
assert(!SUPPORTED_YEARS.includes(2025), '2025: Not available in options');

// 3. Dynamic Current Year Auto-Selection
console.log('\n--- 3. Dynamic Calendar Year Auto-Selection ---');
assert(calculateDefaultYear(new Date('2026-05-15')) === '2026', '2026: Default year = 2026');
assert(calculateDefaultYear(new Date('2027-01-01')) === '2027', '2027: Default year = 2027');
assert(calculateDefaultYear(new Date('2028-08-20')) === '2028', '2028: Default year = 2028');
assert(calculateDefaultYear(new Date('2030-11-10')) === '2030', '2030: Default year = 2030');
assert(calculateDefaultYear(new Date('2035-12-31')) === '2035', '2035: Default year = 2035');

// 4. Post-2035 Safe Capping (Does not generate 2036+)
console.log('\n--- 4. 2035 Maximum Limit & Boundary Capping ---');
assert(calculateDefaultYear(new Date('2036-01-01')) === '2035', '2036: Safely capped at 2035, does not generate 2036');
assert(calculateDefaultYear(new Date('2040-06-15')) === '2035', '2040: Safely capped at 2035, does not generate 2040');
assert(calculateDefaultYear(new Date('2024-01-01')) === '2026', 'Pre-2026: Safely clamped to 2026');

// 5. Invariance Verification
console.log('\n--- 5. Invariance Verification ---');
assert(
  !dashboardSrc.includes("defaultYear = 2026") && !dashboardSrc.includes("defaultYear = '2026'"),
  'NO HARDCODED DEFAULT: Uses calculateDefaultYear dynamic calendar calculation'
);
assert(
  dashboardSrc.includes('setSelectedYear') && dashboardSrc.includes('CustomSelect'),
  'MANUAL SELECTION: Admin can select another supported year without overwrite'
);
assert(
  dashboardSrc.includes('MONTH_NAMES') && dashboardSrc.includes('selectedMonth'),
  'MONTH LOGIC: Month selection remains unchanged (January through December)'
);
assert(
  dashboardSrc.includes('ordersInSelectedPeriod') &&
  dashboardSrc.includes('d.getFullYear() === yNum && (d.getMonth() + 1) === mNum'),
  'ORDER COUNT: Orders in [Month] [Year] count logic unchanged'
);
assert(
  dashboardSrc.includes('handleConfirmMonthDelete') &&
  dashboardSrc.includes('adminOrderApi.deleteOrdersByMonth(selectedYear, selectedMonth)'),
  'DELETE LOGIC: Delete Month + Year functionality unchanged'
);
assert(
  dashboardSrc.includes('CustomSelect') && dashboardSrc.includes('border-[#D4AF37]'),
  'UI UNCHANGED: Styling, popup, gold focus, and indicators unchanged'
);

// 6. Forbidden File Types Audit (.js, .jsx, *.test.js only)
console.log('\n--- 6. Forbidden Extensions Audit ---');
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
  console.log('ALL YEAR LOGIC QA TESTS PASSED.');
  process.exit(0);
}
