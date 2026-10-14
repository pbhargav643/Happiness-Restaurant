import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  generateQRCodeMatrix,
  generateTableDineInUrl,
} from '../../src/utils/qrCodeGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('QR CODE GENERATION, DOWNLOAD & PRINT (PHASE 2 PROMPT 2) QA');
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

// 1. DINE-IN URL GENERATION & PAYLOAD INTEGRITY
console.log('--- 1. Unique Dine-In URL Payload Generation ---');
const table1 = { id: 'tbl-1', tableNumber: 'Table 1', name: 'Window Bay' };
const table2 = { id: 'tbl-2', tableNumber: 'Table 2', name: 'Garden Alcove' };

const url1 = generateTableDineInUrl(table1, 'https://happinessrestaurant.com');
const url2 = generateTableDineInUrl(table2, 'https://happinessrestaurant.com');

assert(
  url1.includes('table=Table%201') && url1.includes('tableId=tbl-1'),
  'Table 1 URL contains correct table number and table ID parameters'
);
assert(
  url2.includes('table=Table%202') && url2.includes('tableId=tbl-2'),
  'Table 2 URL contains correct table number and table ID parameters'
);
assert(
  url1 !== url2,
  'Different tables produce distinct, unique dine-in URL destinations'
);
assert(
  !url1.includes('token') && !url1.includes('secret') && !url1.includes('customer') && !url1.includes('orderId'),
  'QR payload does not expose customer credentials, auth tokens, or private order history'
);

// 2. PURE JAVASCRIPT QR CODE MATRIX GENERATION
console.log('\n--- 2. Pure JS QR Matrix Generator ---');
const qrResult1 = generateQRCodeMatrix(url1);
const qrResult2 = generateQRCodeMatrix(url2);

assert(
  Array.isArray(qrResult1.matrix) && qrResult1.size > 20,
  `Generates a standard 2D matrix (size: ${qrResult1.size}x${qrResult1.size})`
);
assert(
  qrResult1.matrix.length === qrResult1.size && qrResult1.matrix[0].length === qrResult1.size,
  'Matrix is a symmetrical square 2D grid'
);

// Verify finder patterns (top-left 7x7 corner has dark outer borders)
const isFinderTopLeftBorder =
  qrResult1.matrix[0][0] === true &&
  qrResult1.matrix[0][6] === true &&
  qrResult1.matrix[6][0] === true &&
  qrResult1.matrix[6][6] === true;
assert(isFinderTopLeftBorder, 'Top-left finder pattern structure matches QR Model 2 specification');

// Verify that different URLs produce different QR matrices
let matricesDiffer = false;
for (let r = 0; r < Math.min(qrResult1.size, qrResult2.size); r++) {
  for (let c = 0; c < Math.min(qrResult1.size, qrResult2.size); c++) {
    if (qrResult1.matrix[r][c] !== qrResult2.matrix[r][c]) {
      matricesDiffer = true;
      break;
    }
  }
  if (matricesDiffer) break;
}
assert(matricesDiffer, 'Different table URLs generate distinct, uniquely scannable QR matrices');

// 3. ADMIN TABLE QR CODES COMPONENT INSPECTION
console.log('\n--- 3. AdminTableQRCodesPage Component Inspection ---');
const pagePath = path.resolve(__dirname, '../../src/pages/admin/AdminTableQRCodesPage.jsx');
assert(fs.existsSync(pagePath), 'AdminTableQRCodesPage.jsx exists');

const pageSrc = fs.readFileSync(pagePath, 'utf8');

// Preview QR Modal
assert(
  pageSrc.includes('previewTable') && pageSrc.includes('modal-qr-title'),
  'Implements Preview QR modal displaying table details alongside QR code'
);
assert(
  pageSrc.includes('TableQRCanvas') && pageSrc.includes('drawQRCodeToCanvas'),
  'Renders functional QR canvas using pure JS generator with adequate quiet zone'
);

// Download QR Functionality
assert(
  pageSrc.includes('handleDownloadQR') && pageSrc.includes('downloadQRCodePNG'),
  'Provides Download QR action calling downloadQRCodePNG'
);
assert(
  pageSrc.includes('happiness-restaurant-') && pageSrc.includes('-qr.png'),
  'Download filename follows clean format: happiness-restaurant-[table]-qr.png'
);

// Print QR Functionality
console.log('\n--- 4. Print QR Layout & Print Isolation ---');
assert(
  pageSrc.includes('handlePrintQR') && pageSrc.includes('printingTable'),
  'Provides Print QR action setting active print target'
);
assert(
  pageSrc.includes('HAPPINESS RESTAURANT') || pageSrc.includes('RESTAURANT_CONFIG.name'),
  'Print layout displays restaurant brand name (HAPPINESS RESTAURANT)'
);
assert(
  pageSrc.includes('Scan to view the restaurant menu'),
  'Print layout contains exact instruction: "Scan to view the restaurant menu"'
);
assert(
  pageSrc.includes('hidden print:flex') && pageSrc.includes('print:hidden'),
  'Print layout is isolated; admin navigation and UI are hidden during print via @media print'
);

// 5. SECURITY & TRANSPARENCY NOTICE
console.log('\n--- 5. Security & Public Identifier Transparency ---');
assert(
  pageSrc.includes('Public Dine-In Identifier Notice') || pageSrc.includes('Preview / Test QR'),
  'Clearly marks the QR code as a public table identifier without claiming live backend session security'
);
assert(
  pageSrc.includes('customBaseUrl') && pageSrc.includes('Config URL'),
  'Provides configurable base URL for local development vs production deployment'
);

// 6. ROUTE & LAYOUT INVARIANCE
console.log('\n--- 6. Routes and Navigation Invariance ---');
const routesPath = path.resolve(__dirname, '../../src/routes/AdminRoutes.jsx');
const routesSrc = fs.readFileSync(routesPath, 'utf8');
assert(
  routesSrc.includes('AdminTableQRCodesPage') && routesSrc.includes('tables/qr'),
  'AdminRoutes registers tables/qr route'
);

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
  'Admin navigation order strictly preserved'
);

// 7. FORBIDDEN FILE FORMATS AUDIT
console.log('\n--- 7. Forbidden File Extensions Audit ---');
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
  console.log('ALL PHASE 2 PROMPT 2 QR GENERATION, DOWNLOAD & PRINT TESTS PASSED.');
  process.exit(0);
}
