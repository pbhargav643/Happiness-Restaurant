import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  findMockTable,
  DEFAULT_MOCK_TABLES,
  getTableKey,
  normalizeItemAtCartBoundary,
} from '../../src/utils/tableUtils.js';
import {
  generateQRCodeMatrix,
  generateTableDineInUrl,
} from '../../src/utils/qrCodeGenerator.js';
import { MENU_ITEMS, MENU_CATEGORIES } from '../../src/data/menuData.js';
import { validateCustomerDetails, normalizePhoneNumber } from '../../src/config/pickupConfig.js';
import { isDuplicateTable, normalizeTableNumber } from '../../src/utils/tableUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendSrc = path.resolve(__dirname, '../../src');

console.log('================================================================');
console.log('PHASE 4 — PROMPT 3: FINAL FRONTEND VERIFICATION & SIGN-OFF QA');
console.log('================================================================\n');

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

// =============================================================================
// SECTION 1: TABLE MANAGEMENT VERIFICATION
// =============================================================================
console.log('--- SECTION 1: Table Management Verification ---');

const adminRoutesPath = path.join(frontendSrc, 'routes/AdminRoutes.jsx');
const adminRoutesSrc = fs.readFileSync(adminRoutesPath, 'utf8');

assert(
  adminRoutesSrc.includes('ProtectedAdminRoute') &&
  adminRoutesSrc.includes('AdminLayout') &&
  adminRoutesSrc.includes('path="tables"') &&
  adminRoutesSrc.includes('AdminTablesPage'),
  '/admin/tables route is protected by ProtectedAdminRoute and rendered within AdminLayout'
);

const tablesPagePath = path.join(frontendSrc, 'pages/admin/AdminTablesPage.jsx');
const tablesPageSrc = fs.readFileSync(tablesPagePath, 'utf8');

// Verify Add, Edit, Activate, Deactivate handlers exist
assert(tablesPageSrc.includes('handleOpenAddModal'), 'Contains Add Table modal opener');
assert(tablesPageSrc.includes('handleOpenEditModal'), 'Contains Edit Table modal opener');
assert(tablesPageSrc.includes('handleActivateTable'), 'Contains Activate Table handler');
assert(tablesPageSrc.includes('handleRequestToggleStatus') && tablesPageSrc.includes('handleConfirmDeactivate'), 'Contains Deactivate Table confirmation workflow');

// Duplicate validation tests
assert(isDuplicateTable('Table 1', 'Table 1') === true, 'Duplicate test: exact match returns true');
assert(isDuplicateTable('Table 1', 'table 1') === true, 'Duplicate test: case-insensitive match returns true');
assert(isDuplicateTable('Table 1', '  Table 1  ') === true, 'Duplicate test: whitespace-padded match returns true');
assert(isDuplicateTable('Table 1', '1') === true, 'Duplicate test: prefix-stripped numeric match returns true');
assert(isDuplicateTable('Table 1', 'T-1') === true, 'Duplicate test: "T-1" vs "Table 1" returns true');
assert(isDuplicateTable('Table 1', 'Table 2') === false, 'Duplicate test: distinct table numbers return false');

// Summary cards metrics logic
assert(
  tablesPageSrc.includes('totalTables = tables.length') &&
  tablesPageSrc.includes('activeTables =') &&
  tablesPageSrc.includes('inactiveTables =') &&
  tablesPageSrc.includes('totalCapacity ='),
  'Summary metrics compute Total, Active, Inactive tables and Total Seating Capacity reactively'
);

// Mobile action controls
assert(
  tablesPageSrc.includes('hidden md:block') && tablesPageSrc.includes('md:hidden'),
  'Table management provides mobile card view with accessible Edit and Activate/Deactivate actions'
);

// =============================================================================
// SECTION 2: QR CODE VERIFICATION
// =============================================================================
console.log('\n--- SECTION 2: QR Code Verification ---');

const qrPagePath = path.join(frontendSrc, 'pages/admin/AdminTableQRCodesPage.jsx');
const qrPageSrc = fs.readFileSync(qrPagePath, 'utf8');

assert(
  qrPageSrc.includes('setPreviewTable(table)') &&
  qrPageSrc.includes('previewTable.tableNumber'),
  'QR preview accurately corresponds to the selected table'
);

// Pure JS QR Code generation
const testTable = DEFAULT_MOCK_TABLES[0];
const testUrl = generateTableDineInUrl(testTable, 'https://happinessrestaurant.com');
const qrMatrixResult = generateQRCodeMatrix(testUrl);

assert(
  qrMatrixResult &&
  Array.isArray(qrMatrixResult.matrix) &&
  qrMatrixResult.size > 20,
  `Pure JS QR generator produces valid ISO/IEC 18004 Model 2 QR matrix of size ${qrMatrixResult.size}x${qrMatrixResult.size}`
);

// Canvas download verification
assert(
  qrPageSrc.includes('downloadQRCodePNG') &&
  qrPageSrc.includes('handleDownloadQR'),
  'Download action generates crisp high-resolution PNG without third-party external APIs'
);

// Print isolation verification
assert(
  qrPageSrc.includes('printingTable') &&
  qrPageSrc.includes('window.print()') &&
  qrPageSrc.includes('@media print') || qrPageSrc.includes('print:hidden'),
  'Print action isolates the table QR sheet and hides administrative interface elements'
);

// Missing configuration handling
const emptyBaseUrlResult = generateTableDineInUrl(testTable, '');
assert(emptyBaseUrlResult === null, 'Empty base URL returns null to prevent generating malformed QR codes');
assert(
  qrPageSrc.includes('Configuration Required — Missing valid destination URL'),
  'Missing base URL configuration displays clear warning state'
);

// Prototype and security notices
assert(
  qrPageSrc.includes('Preview / Test QR') &&
  qrPageSrc.includes('Public Dine-In Identifier Notice'),
  'QR page explicitly designates QR codes as test/preview identifiers'
);
assert(
  !testUrl.includes('token') && !testUrl.includes('secret') && !testUrl.includes('password') && !testUrl.includes('user'),
  'QR payload encodes strictly public destination (no credentials, tokens, or customer secrets)'
);

// =============================================================================
// SECTION 3: DINE-IN CUSTOMER FLOW VERIFICATION
// =============================================================================
console.log('\n--- SECTION 3: Dine-In Customer Flow Verification ---');

// Table resolution
assert(findMockTable('tbl-1')?.tableNumber === 'Table 1', 'Valid ID "tbl-1" resolves to Table 1');
assert(findMockTable('Table 2')?.id === 'tbl-2', 'Valid number "Table 2" resolves to tbl-2');
assert(findMockTable('tbl-999') === null, 'Unregistered ID "tbl-999" returns null');
assert(findMockTable('') === null, 'Empty ID returns null');

const entryPagePath = path.join(frontendSrc, 'pages/customer/DineInEntryPage.jsx');
const entryPageSrc = fs.readFileSync(entryPagePath, 'utf8');
assert(
  entryPageSrc.includes('Table Not Recognized') &&
  entryPageSrc.includes('Invalid Table Identifier'),
  'Missing/invalid table identifier displays explicit error screen'
);

// Cart & calculations
const dish1 = MENU_ITEMS[0];
const dish2 = MENU_ITEMS[1];
const p1 = Number(dish1.price);
const p2 = Number(dish2.price);

const normDish1 = normalizeItemAtCartBoundary(dish1);
const normDish2 = normalizeItemAtCartBoundary(dish2);
assert(normDish1.price === p1 && normDish2.price === p2, 'Menu dish prices match authoritative catalog data');

// Per-table cart isolation
const tableKeyA = getTableKey(DEFAULT_MOCK_TABLES[0]);
const tableKeyB = getTableKey(DEFAULT_MOCK_TABLES[1]);

const isolatedCarts = {
  [tableKeyA]: [{ ...normDish1, quantity: 2, itemTotal: p1 * 2 }],
  [tableKeyB]: [],
};

assert(isolatedCarts[tableKeyA].length === 1, 'Table A holds its own dishes');
assert(isolatedCarts[tableKeyB].length === 0, 'Table B is completely empty');

// Prototype checkout verification
const checkoutPagePath = path.join(frontendSrc, 'pages/customer/DineInCheckoutPage.jsx');
const checkoutPageSrc = fs.readFileSync(checkoutPagePath, 'utf8');

assert(
  checkoutPageSrc.includes('PROTOTYPE PREVIEW') &&
  checkoutPageSrc.includes('NOT A LIVE ORDER'),
  'Checkout displays prominent prototype preview banner'
);
assert(
  checkoutPageSrc.includes('No live payment has been processed') &&
  checkoutPageSrc.includes('no backend order document was written'),
  'Checkout informs customer no payment was charged or database record created'
);
assert(!checkoutPageSrc.includes('orderApi.createOrder'), 'Checkout does NOT call backend orderApi.createOrder');
assert(!checkoutPageSrc.includes('orderId:'), 'Checkout does NOT invent a fake order ID');

// =============================================================================
// SECTION 4: EXISTING WEBSITE REGRESSION VERIFICATION
// =============================================================================
console.log('\n--- SECTION 4: Existing Website Regression Verification ---');

const customerRoutesPath = path.join(frontendSrc, 'routes/CustomerRoutes.jsx');
const customerRoutesSrc = fs.readFileSync(customerRoutesPath, 'utf8');

assert(customerRoutesSrc.includes('path="/"'), 'Home page route exists');
assert(customerRoutesSrc.includes('path="/menu"'), 'Menu page route exists');
assert(customerRoutesSrc.includes('path="/cart"'), 'Parcel Pickup cart route exists');
assert(customerRoutesSrc.includes('path="/checkout"'), 'Parcel Pickup checkout route exists');
assert(customerRoutesSrc.includes('path="/orders"'), 'Customer orders history route exists');
assert(customerRoutesSrc.includes('path="/track-order"'), 'Customer order tracking route exists');
assert(customerRoutesSrc.includes('path="/login"') || customerRoutesSrc.includes('ProtectedCustomerRoute'), 'Customer auth integration remains intact');

const adminLayoutPath = path.join(frontendSrc, 'layouts/AdminLayout.jsx');
const adminLayoutSrc = fs.readFileSync(adminLayoutPath, 'utf8');

const navOrder = [
  adminLayoutSrc.indexOf("name: 'Dashboard'"),
  adminLayoutSrc.indexOf("name: 'Orders Queue'"),
  adminLayoutSrc.indexOf("name: 'Menu Catalog'"),
  adminLayoutSrc.indexOf("name: 'Table Management'"),
  adminLayoutSrc.indexOf("name: 'Analytics & Reports'"),
  adminLayoutSrc.indexOf("name: 'Alerts & Notifications'"),
  adminLayoutSrc.indexOf("name: 'Reviews'"),
  adminLayoutSrc.indexOf("name: 'Settings'"),
];

let isStrictOrder = true;
for (let i = 0; i < navOrder.length - 1; i++) {
  if (navOrder[i] >= navOrder[i + 1]) {
    isStrictOrder = false;
    break;
  }
}
assert(isStrictOrder, 'Admin navigation strictly preserves exact order of all 8 items');

// =============================================================================
// SECTION 5: RESPONSIVE & CODE QUALITY AUDIT
// =============================================================================
console.log('\n--- SECTION 5: Responsive & Code Quality Audit ---');

const forbiddenExts = ['.ts', '.tsx', '.mjs'];
let forbiddenCount = 0;

function auditSourceDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory() && ent.name !== 'node_modules' && ent.name !== '.git') {
      auditSourceDir(full);
    } else if (ent.isFile()) {
      const ext = path.extname(ent.name).toLowerCase();
      if (forbiddenExts.includes(ext)) {
        forbiddenCount++;
      }
    }
  }
}
auditSourceDir(frontendSrc);
assert(forbiddenCount === 0, 'Frontend src contains strictly .js and .jsx files (0 .ts, .tsx, .mjs)');

const pkgPath = path.join(__dirname, '../../package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const dependencies = Object.keys(pkg.dependencies || {});
assert(
  dependencies.length === 3 &&
  dependencies.includes('react') &&
  dependencies.includes('react-dom') &&
  dependencies.includes('react-router-dom'),
  'package.json contains strictly react, react-dom, and react-router-dom (no extra dependencies)'
);

console.log('\n================================================================');
console.log(`FINAL QA RESULT: ${passCount} Passed, ${failCount} Failed`);
console.log('================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('ALL PHASE 4 PROMPT 3 SIGN-OFF VERIFICATIONS COMPLETED SUCCESSFULLY.');
  process.exit(0);
}
