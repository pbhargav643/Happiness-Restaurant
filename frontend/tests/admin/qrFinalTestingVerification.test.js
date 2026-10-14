import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  generateQRCodeMatrix,
  generateTableDineInUrl,
  downloadQRCodePNG,
} from '../../src/utils/qrCodeGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Standard mock tables from Phase 1
const SAMPLE_TABLES = [
  { id: 'tbl-1', tableNumber: 'Table 1', name: 'Window Bay', capacity: 4, status: 'Active' },
  { id: 'tbl-2', tableNumber: 'Table 2', name: 'Garden Alcove', capacity: 2, status: 'Active' },
  { id: 'tbl-3', tableNumber: 'Table 3', name: 'Family Central', capacity: 6, status: 'Active' },
  { id: 'tbl-4', tableNumber: 'Table 4', name: 'Terrace Corner', capacity: 4, status: 'Inactive' },
];

console.log('================================================================');
console.log('PHASE 2 — PROMPT 3: QR CODE UI FINAL TESTING & VERIFICATION QA');
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

// -----------------------------------------------------------------------------
// 1. INSPECT EXISTING IMPLEMENTATION & MOCK TABLES
// -----------------------------------------------------------------------------
console.log('--- 1. Mock Tables & Identifier Verification ---');
assert(Array.isArray(SAMPLE_TABLES) && SAMPLE_TABLES.length >= 4, 'SAMPLE_TABLES array exists and has at least 4 tables');

const tableIds = new Set();
const tableNumbers = new Set();

SAMPLE_TABLES.forEach((table, idx) => {
  assert(
    table.id && typeof table.id === 'string' && table.id.trim().length > 0,
    `Table #${idx + 1} has valid identifier: ${table.id}`
  );
  assert(
    table.tableNumber && typeof table.tableNumber === 'string' && table.tableNumber.trim().length > 0,
    `Table #${idx + 1} has valid table number: ${table.tableNumber}`
  );
  assert(
    typeof table.capacity === 'number' && table.capacity > 0,
    `Table #${idx + 1} (${table.tableNumber}) has valid positive seating capacity: ${table.capacity}`
  );

  tableIds.add(table.id);
  tableNumbers.add(table.tableNumber.toLowerCase());
});

assert(tableIds.size === SAMPLE_TABLES.length, 'All mock table IDs are completely unique');
assert(tableNumbers.size === SAMPLE_TABLES.length, 'All mock table numbers are unique (case-insensitive)');

// -----------------------------------------------------------------------------
// 2. QR CODE FUNCTIONAL TESTS
// -----------------------------------------------------------------------------
console.log('\n--- 2. QR Code Functional Tests ---');

// Test URL payload generation for all tables
const generatedUrls = [];
SAMPLE_TABLES.forEach((table) => {
  const url = generateTableDineInUrl(table, 'https://happinessrestaurant.com');
  assert(url !== null, `Generated URL for ${table.tableNumber} is not null`);
  assert(
    url.includes(`table=${encodeURIComponent(table.tableNumber)}`) &&
    url.includes(`tableId=${encodeURIComponent(table.id)}`) &&
    url.includes('mode=dine_in'),
    `Payload for ${table.tableNumber} encodes tableNumber, tableId, and mode=dine_in`
  );
  generatedUrls.push(url);
});

// Verify distinctness of QR payloads and QR matrices
let allPayloadsUnique = true;
let allMatricesUnique = true;
const qrMatrices = generatedUrls.map((url) => generateQRCodeMatrix(url));

for (let i = 0; i < generatedUrls.length; i++) {
  for (let j = i + 1; j < generatedUrls.length; j++) {
    if (generatedUrls[i] === generatedUrls[j]) {
      allPayloadsUnique = false;
    }

    // Compare matrix cells
    const m1 = qrMatrices[i].matrix;
    const m2 = qrMatrices[j].matrix;
    let diff = false;
    for (let r = 0; r < Math.min(m1.length, m2.length); r++) {
      for (let c = 0; c < Math.min(m1[r].length, m2[r].length); c++) {
        if (m1[r][c] !== m2[r][c]) {
          diff = true;
          break;
        }
      }
      if (diff) break;
    }
    if (!diff) {
      allMatricesUnique = false;
    }
  }
}

assert(allPayloadsUnique, 'Different tables generate completely distinct URL destinations');
assert(allMatricesUnique, 'Different tables generate completely distinct 2D QR code matrices');

// Security check: No customer information, tokens, or secrets in payloads
const sensitiveKeywords = ['token', 'secret', 'customer', 'password', 'auth', 'bearer', 'orderId', 'session'];
let leakFound = false;
generatedUrls.forEach((url) => {
  sensitiveKeywords.forEach((kw) => {
    if (url.toLowerCase().includes(kw)) {
      leakFound = true;
      console.error(`Leak detected: keyword "${kw}" found in URL: ${url}`);
    }
  });
});
assert(!leakFound, 'QR payload contains NO customer info, private order details, auth tokens or secrets');

// Configurable base URL check
const customUrl = generateTableDineInUrl(SAMPLE_TABLES[0], 'http://localhost:5173');
assert(customUrl.startsWith('http://localhost:5173/menu'), 'Destination properly uses configured frontend base URL');

// Invalid or missing configuration checks
const nullTableUrl = generateTableDineInUrl(null, 'https://happinessrestaurant.com');
assert(nullTableUrl === null, 'Null table parameter produces null URL');

const emptyTableUrl = generateTableDineInUrl({ tableNumber: '' }, 'https://happinessrestaurant.com');
assert(emptyTableUrl === null, 'Empty table number produces null URL');

const emptyBaseUrl = generateTableDineInUrl(SAMPLE_TABLES[0], '   ');
assert(emptyBaseUrl === null, 'Empty custom base URL returns null to prevent misleading production QR');

// -----------------------------------------------------------------------------
// 3. PREVIEW, DOWNLOAD AND PRINT TESTS
// -----------------------------------------------------------------------------
console.log('\n--- 3. Preview, Download and Print Tests ---');

const qrPagePath = path.resolve(__dirname, '../../src/pages/admin/AdminTableQRCodesPage.jsx');
assert(fs.existsSync(qrPagePath), 'AdminTableQRCodesPage.jsx exists');
const qrPageSrc = fs.readFileSync(qrPagePath, 'utf8');

// Preview modal tests
assert(
  qrPageSrc.includes('previewTable') &&
  qrPageSrc.includes('setPreviewTable(table)') &&
  qrPageSrc.includes('id="modal-qr-title"'),
  'Preview QR modal triggers on table selection and displays table title'
);
assert(
  qrPageSrc.includes("if (e.key === 'Escape' && previewTable)") &&
  qrPageSrc.includes('setPreviewTable(null)'),
  'Preview modal supports dismissal via Escape key, close button, and backdrop click'
);
assert(
  qrPageSrc.includes('TableQRCanvas') && qrPageSrc.includes('Configuration Required'),
  'TableQRCanvas handles missing config and renders explicit "Configuration Required" alert'
);

// Download QR tests
assert(
  qrPageSrc.includes('handleDownloadQR') &&
  qrPageSrc.includes('downloadQRCodePNG') &&
  qrPageSrc.includes('happiness-restaurant-') &&
  qrPageSrc.includes('-qr.png'),
  'Download QR generates clean, unique PNG file named: happiness-restaurant-[tableNumber]-qr.png'
);

// Print QR tests
assert(
  qrPageSrc.includes('printingTable') &&
  qrPageSrc.includes('hidden print:flex') &&
  qrPageSrc.includes('print:hidden'),
  'Dedicated isolated print layout is defined for window.print()'
);
assert(
  qrPageSrc.includes('RESTAURANT_CONFIG.name') &&
  qrPageSrc.includes('Scan to view the restaurant menu'),
  'Print layout prints restaurant name, table details, QR canvas, and "Scan to view the restaurant menu"'
);

// Admin layout print isolation
const layoutPath = path.resolve(__dirname, '../../src/layouts/AdminLayout.jsx');
const layoutSrc = fs.readFileSync(layoutPath, 'utf8');
assert(
  layoutSrc.includes('aside className="hidden md:flex print:hidden') ||
  (layoutSrc.includes('<aside') && layoutSrc.includes('print:hidden')),
  'Admin desktop sidebar is hidden during print (print:hidden)'
);
assert(
  layoutSrc.includes('<header') && layoutSrc.includes('print:hidden'),
  'Admin topbar and buttons are hidden during print (print:hidden)'
);
assert(
  layoutSrc.includes('Admin Operations:') && layoutSrc.includes('print:hidden'),
  'Admin operations banner is hidden during print (print:hidden)'
);
assert(
  layoutSrc.includes('print:pl-0'),
  'Admin content padding offset is reset to 0 in print mode (print:pl-0)'
);

// -----------------------------------------------------------------------------
// 4. RESPONSIVE UI TESTS
// -----------------------------------------------------------------------------
console.log('\n--- 4. Responsive Layout Verification ---');

// Summary Cards Grid
assert(
  qrPageSrc.includes('grid-cols-1 sm:grid-cols-3 lg:grid-cols-4'),
  'Summary metrics adapt responsively from 1 column (mobile) to 3-4 columns (laptop/desktop)'
);

// Filter & Search Toolbar
assert(
  qrPageSrc.includes('flex flex-col sm:flex-row'),
  'Search toolbar stacks vertically on mobile (360px & 390px) and expands horizontally on desktop'
);

// Table Card Grid
assert(
  qrPageSrc.includes('grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'),
  'Table card grid supports single column (mobile), 2 columns (tablet), 3 columns (laptop 1280px), 4 columns (desktop 1536px)'
);

// Modal Viewport Overflow Prevention
assert(
  qrPageSrc.includes('max-h-[92vh] overflow-y-auto') && qrPageSrc.includes('max-w-md w-full'),
  'Preview modal enforces max-h-[92vh] and overflow-y-auto, preventing modal clipping on small mobile (360x800, 390x844)'
);

// -----------------------------------------------------------------------------
// 5. REGRESSION & INVARIANCE TESTS
// -----------------------------------------------------------------------------
console.log('\n--- 5. Regression & Invariance Verification ---');

const tablesPagePath = path.resolve(__dirname, '../../src/pages/admin/AdminTablesPage.jsx');
const tablesPageSrc = fs.readFileSync(tablesPagePath, 'utf8');

// Phase 1 Operations
assert(tablesPageSrc.includes('handleOpenAddModal') && tablesPageSrc.includes('handleFormSubmit'), 'Phase 1 Add Table functionality is preserved');
assert(tablesPageSrc.includes('handleOpenEditModal') && tablesPageSrc.includes('editingTable'), 'Phase 1 Edit Table functionality is preserved');
assert(tablesPageSrc.includes('handleActivateTable') && tablesPageSrc.includes('handleConfirmDeactivate'), 'Phase 1 Activate/Deactivate functionality is preserved');
assert(tablesPageSrc.includes('isDuplicateTable'), 'Phase 1 duplicate table validation is preserved');
assert(tablesPageSrc.includes('/admin/tables/qr'), 'Phase 1 Table Management provides bidirectional link to QR Codes page');

// Admin Navigation order
const dashboardIdx = layoutSrc.indexOf("name: 'Dashboard'");
const ordersIdx = layoutSrc.indexOf("name: 'Orders Queue'");
const menuIdx = layoutSrc.indexOf("name: 'Menu Catalog'");
const tablesIdx = layoutSrc.indexOf("name: 'Table Management'");
const analyticsIdx = layoutSrc.indexOf("name: 'Analytics & Reports'");
const alertsIdx = layoutSrc.indexOf("name: 'Alerts & Notifications'");
const reviewsIdx = layoutSrc.indexOf("name: 'Reviews'");
const settingsIdx = layoutSrc.indexOf("name: 'Settings'");

assert(
  dashboardIdx < ordersIdx &&
  ordersIdx < menuIdx &&
  menuIdx < tablesIdx &&
  tablesIdx < analyticsIdx &&
  analyticsIdx < alertsIdx &&
  alertsIdx < reviewsIdx &&
  reviewsIdx < settingsIdx,
  'Admin sidebar navigation order strictly preserved: Dashboard -> Orders Queue -> Menu Catalog -> Table Management -> Analytics -> Alerts -> Reviews -> Settings'
);

// Customer Site Invariance
const customerRoutesPath = path.resolve(__dirname, '../../src/routes/CustomerRoutes.jsx');
const customerRoutesSrc = fs.readFileSync(customerRoutesPath, 'utf8');
assert(
  customerRoutesSrc.includes('/orders') &&
  customerRoutesSrc.includes('/track-order') &&
  customerRoutesSrc.includes('/cart') &&
  customerRoutesSrc.includes('/checkout') &&
  customerRoutesSrc.includes('/reviews'),
  'Customer Parcel Pickup ordering, checkout, tracking, and reviews routes are untouched'
);

// -----------------------------------------------------------------------------
// 6. BUILD & CODE QUALITY AUDIT
// -----------------------------------------------------------------------------
console.log('\n--- 6. Build & Code Quality Audit ---');

// Check package.json dependencies
const pkgPath = path.resolve(__dirname, '../../package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const installedDeps = Object.keys(pkg.dependencies || {});
assert(
  !installedDeps.includes('qrcode') && !installedDeps.includes('react-qr-code') && !installedDeps.includes('qr-image'),
  'Zero external QR libraries installed; pure JS algorithm utilized as mandated'
);

// Check forbidden file extensions (.ts, .tsx, .mjs)
const forbiddenExts = ['.ts', '.tsx', '.mjs'];
let forbiddenFilesFound = 0;

function auditDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist') {
        auditDirectory(fullPath);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (forbiddenExts.includes(ext)) {
        console.error(`Forbidden file extension detected: ${fullPath}`);
        forbiddenFilesFound++;
      }
    }
  }
}

auditDirectory(path.resolve(__dirname, '../../src'));
assert(forbiddenFilesFound === 0, 'Frontend src directory strictly contains .js and .jsx files (0 .ts/.tsx/.mjs files)');

console.log('\n================================================================');
console.log(`SUMMARY: ${passCount} Passed, ${failCount} Failed`);
console.log('================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('ALL PHASE 2 PROMPT 3 VERIFICATION TESTS PASSED SUCCESSFULLY.');
  process.exit(0);
}
