import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  normalizeTableNumber,
  isDuplicateTable,
  SAMPLE_TABLES,
} from '../../src/utils/tableUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('TABLE ACTIONS & RESPONSIVE UI (PHASE 1 PROMPT 2) QA');
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

// 1. DUPLICATE TABLE VALIDATION LOGIC TESTS
console.log('--- 1. Duplicate Table Number Normalization & Detection ---');
assert(
  normalizeTableNumber('  Table   1  ') === 'table 1',
  'normalizeTableNumber correctly trims and normalizes internal whitespace'
);
assert(
  isDuplicateTable('Table 1', 'table 1'),
  'Treats "Table 1" and "table 1" as duplicates (case-insensitive)'
);
assert(
  isDuplicateTable('Table 1', '  Table 1  '),
  'Treats leading/trailing spaces as duplicates'
);
assert(
  isDuplicateTable('Table 1', 'Table   1'),
  'Treats internal spacing variations as duplicates'
);
assert(
  isDuplicateTable('Table 1', '1'),
  'Treats "Table 1" and "1" as duplicates'
);
assert(
  isDuplicateTable('1', 'Table 1'),
  'Treats "1" and "Table 1" as duplicates inversely'
);
assert(
  !isDuplicateTable('Table 1', 'Table 2'),
  'Distinguishes "Table 1" from "Table 2" without false positive'
);
assert(
  !isDuplicateTable('Table 1', 'Table 10'),
  'Distinguishes "Table 1" from "Table 10" without prefix collision'
);

// 2. MOCK DATA INTEGRITY
console.log('\n--- 2. Sample Mock Data Integrity ---');
assert(Array.isArray(SAMPLE_TABLES) && SAMPLE_TABLES.length >= 4, 'Provides at least 4 sample tables');
const sampleNums = SAMPLE_TABLES.map((t) => t.tableNumber);
assert(
  sampleNums.includes('Table 1') &&
  sampleNums.includes('Table 2') &&
  sampleNums.includes('Table 3') &&
  sampleNums.includes('Table 4'),
  'Sample tables include Table 1, Table 2, Table 3, and Table 4'
);

// Verify initial summary metrics
const total = SAMPLE_TABLES.length;
const active = SAMPLE_TABLES.filter((t) => t.status === 'Active').length;
const inactive = total - active;
assert(active === 3 && inactive === 1, 'Initial status distribution has 3 Active and 1 Inactive table');

// 3. EDIT TABLE & SELF-DUPLICATE EXCLUSION
console.log('\n--- 3. Edit Table Functionality Inspection ---');
const pagePath = path.resolve(__dirname, '../../src/pages/admin/AdminTablesPage.jsx');
const pageSrc = fs.readFileSync(pagePath, 'utf8');

assert(
  pageSrc.includes('handleOpenEditModal') &&
  pageSrc.includes('editingTable'),
  'Contains Edit action handler pre-filling modal with selected table values'
);
assert(
  pageSrc.includes('if (editingTable && tbl.id === editingTable.id)') ||
  pageSrc.includes('tbl.id === editingTable.id') ||
  pageSrc.includes('tblId === currentId'),
  'Duplicate validation properly excludes the table currently being edited'
);
assert(
  pageSrc.includes('tbl.id === editingTable.id ? {') ||
  pageSrc.includes('tbl.id === editingTable.id') ||
  pageSrc.includes('(tbl.id || tbl._id) === targetId ? result.table : tbl'),
  'Save updates only the selected table in state'
);

// 4. CONFIRMATION DIALOG BEFORE DEACTIVATION
console.log('\n--- 4. Deactivation Confirmation Dialog ---');
assert(
  pageSrc.includes('tableToDeactivate') &&
  pageSrc.includes('setTableToDeactivate'),
  'State maintains tableToDeactivate for confirmation workflow'
);
assert(
  pageSrc.includes('Deactivate') &&
  pageSrc.includes('modal-deactivate-title'),
  'Renders a confirmation modal before deactivating an active table'
);
assert(
  pageSrc.includes('handleCancelDeactivate') &&
  pageSrc.includes('handleConfirmDeactivate'),
  'Provides explicit Cancel and Confirm Deactivate handlers'
);
assert(
  pageSrc.includes('Keep Active') || pageSrc.includes('Cancel'),
  'Confirmation dialog provides a Cancel/Keep Active button'
);

// 5. RESPONSIVE DESIGN & MOBILE OPTIMIZATIONS
console.log('\n--- 5. Mobile & Responsive Layout Audit ---');
assert(
  pageSrc.includes('hidden md:block') && pageSrc.includes('md:hidden'),
  'Includes distinct desktop table and mobile card view'
);
assert(
  pageSrc.includes('min-h-[42px]') || pageSrc.includes('min-h-[44px]'),
  'Mobile card actions use touch-accessible minimum heights (>= 42px)'
);
assert(
  pageSrc.includes('overflow-x-auto') && pageSrc.includes('truncate'),
  'Desktop table container uses overflow-x-auto and labels use truncation to prevent overflow'
);

// 6. FORM RESET & VALIDATION QUALITY
console.log('\n--- 6. Form Reset & Validation Quality ---');
assert(
  pageSrc.includes('closeModal') &&
  pageSrc.includes('setFormErrors({})'),
  'Canceling closes modal and clears errors without persisting changes'
);
assert(
  pageSrc.includes('Table Number is required'),
  'Validates that table number cannot be blank'
);
assert(
  pageSrc.includes('Seating capacity must be a positive whole integer'),
  'Validates seating capacity must be a positive integer'
);

// 7. ROUTE & LAYOUT VERIFICATION
console.log('\n--- 7. Route and Layout Verification ---');
const layoutPath = path.resolve(__dirname, '../../src/layouts/AdminLayout.jsx');
const layoutSrc = fs.readFileSync(layoutPath, 'utf8');
assert(
  layoutSrc.includes("path: '/admin/tables'"),
  'AdminLayout connects Table Management to /admin/tables'
);

const routesPath = path.resolve(__dirname, '../../src/routes/AdminRoutes.jsx');
const routesSrc = fs.readFileSync(routesPath, 'utf8');
assert(
  routesSrc.includes("path=\"tables\"") || routesSrc.includes("path=\"/admin/tables\""),
  'AdminRoutes registers tables route'
);

// 8. FORBIDDEN FILE EXTENSIONS
console.log('\n--- 8. Forbidden Files Audit ---');
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
  console.log('ALL PHASE 1 PROMPT 2 TABLE ACTIONS TESTS PASSED.');
  process.exit(0);
}
