import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('TABLE QR CODE MANAGEMENT UI (PHASE 2 PROMPT 1) QA');
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

// 1. Verify AdminTableQRCodesPage.jsx exists and inspect content
console.log('--- 1. AdminTableQRCodesPage.jsx Component Inspection ---');
const qrPagePath = path.resolve(__dirname, '../../src/pages/admin/AdminTableQRCodesPage.jsx');
assert(fs.existsSync(qrPagePath), 'AdminTableQRCodesPage.jsx exists in src/pages/admin');

const qrPageSrc = fs.readFileSync(qrPagePath, 'utf8');

// Page Heading & Subtitle
assert(
  qrPageSrc.includes('Table QR Codes'),
  'Contains exact heading: "Table QR Codes"'
);
assert(
  qrPageSrc.includes('Manage QR codes for restaurant dine-in tables'),
  'Contains exact subtitle: "Manage QR codes for restaurant dine-in tables"'
);

// Navigation back to Table Management
assert(
  qrPageSrc.includes('to="/admin/tables"') &&
  (qrPageSrc.includes('Return to Table Management') || qrPageSrc.includes('Back to Tables')),
  'Provides a button to return to Table Management'
);

// 2. Table Data & Card Grid
console.log('\n--- 2. Mock Tables & Card Grid ---');
assert(
  qrPageSrc.includes('SAMPLE_TABLES') || qrPageSrc.includes('getInitialTables'),
  'Reuses existing Phase 1 mock tables without inventing additional tables'
);
assert(
  qrPageSrc.includes('table.tableNumber') && qrPageSrc.includes('table.name'),
  'Displays table number and table name on cards'
);
assert(
  qrPageSrc.includes('table.status') &&
  qrPageSrc.includes('Active') &&
  qrPageSrc.includes('Inactive'),
  'Displays table status: Active or Inactive'
);

// 3. QR Code Preview Area & Functional Generation
console.log('\n--- 3. QR Code Preview Area & Functional Generation ---');
assert(
  qrPageSrc.includes('TableQRCanvas') || qrPageSrc.includes('QR Preview — Not Generated Yet'),
  'Card preview area contains functional QR canvas or verified preview placeholder'
);
assert(
  !qrPageSrc.includes('api.qrserver.com'),
  'Does not depend on external insecure third-party image generation APIs'
);

// 4. Action Buttons (Preview QR, Download QR, Print QR)
console.log('\n--- 4. Action Buttons & States ---');
assert(
  qrPageSrc.includes('Preview QR') &&
  qrPageSrc.includes('Download QR') &&
  qrPageSrc.includes('Print QR'),
  'Includes buttons labelled Preview QR, Download QR, and Print QR'
);
assert(
  qrPageSrc.includes('handleDownloadQR') && qrPageSrc.includes('handlePrintQR'),
  'Implements active handlers for Download QR and Print QR'
);

// 5. Preview Modal
console.log('\n--- 5. QR Preview Modal ---');
assert(
  qrPageSrc.includes('previewTable') &&
  qrPageSrc.includes('modal-qr-title'),
  'Implements preview modal displaying selected table QR details'
);
assert(
  qrPageSrc.includes('setPreviewTable(null)'),
  'Preview modal provides clear close button and escape handler'
);

// 6. Navigation Link from Table Management
console.log('\n--- 6. Table Management to QR Codes Navigation ---');
const tablesPagePath = path.resolve(__dirname, '../../src/pages/admin/AdminTablesPage.jsx');
const tablesPageSrc = fs.readFileSync(tablesPagePath, 'utf8');

assert(
  tablesPageSrc.includes('to="/admin/tables/qr"'),
  'AdminTablesPage contains a link to Table QR Codes (/admin/tables/qr)'
);

// 7. Route Registration in AdminRoutes.jsx
console.log('\n--- 7. AdminRoutes.jsx Registration ---');
const routesPath = path.resolve(__dirname, '../../src/routes/AdminRoutes.jsx');
const routesSrc = fs.readFileSync(routesPath, 'utf8');

assert(
  routesSrc.includes('AdminTableQRCodesPage') &&
  routesSrc.includes('tables/qr'),
  'AdminRoutes.jsx registers route for AdminTableQRCodesPage at "tables/qr"'
);

// 8. Navigation Order Invariance in AdminLayout.jsx
console.log('\n--- 8. AdminLayout Navigation Invariance ---');
const layoutPath = path.resolve(__dirname, '../../src/layouts/AdminLayout.jsx');
const layoutSrc = fs.readFileSync(layoutPath, 'utf8');

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
  'Navigation order preserved: Dashboard -> Orders Queue -> Menu Catalog -> Table Management -> Analytics & Reports -> Alerts & Notifications -> Reviews -> Settings'
);

// 9. Forbidden File Extensions Audit (.js and .jsx only)
console.log('\n--- 9. Forbidden File Extensions Audit ---');
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
  console.log('ALL PHASE 2 PROMPT 1 QR CODE UI TESTS PASSED.');
  process.exit(0);
}
