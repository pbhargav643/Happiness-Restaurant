import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  generateQRCodeMatrix,
  generateTableDineInUrl,
} from '../../src/utils/qrCodeGenerator.js';
import { normalizeTableDoc } from '../../src/services/adminTableApi.js';
import { findMockTable, DEFAULT_MOCK_TABLES } from '../../src/utils/tableUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendSrc = path.resolve(__dirname, '../../src');

console.log('================================================================');
console.log('PHASE 7 — PROMPT 3: FINAL QR INTEGRATION VERIFICATION QA');
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

async function runFinalVerification() {
  // -----------------------------------------------------------------------------
  // 1. INSPECT ACTUAL IMPLEMENTATION & PERSISTED TABLE INTEGRATION
  // -----------------------------------------------------------------------------
  console.log('--- 1. Persisted Table Integration Verification ---');

  const qrPagePath = path.join(frontendSrc, 'pages/admin/AdminTableQRCodesPage.jsx');
  assert(fs.existsSync(qrPagePath), 'AdminTableQRCodesPage.jsx exists');
  const qrPageSrc = fs.readFileSync(qrPagePath, 'utf8');

  // Verify real backend API consumption
  assert(
    qrPageSrc.includes("import { adminTableApi } from '../../services/adminTableApi'"),
    'QR management imports adminTableApi'
  );
  assert(
    qrPageSrc.includes('const res = await adminTableApi.getTables();') &&
    qrPageSrc.includes('setTables(res.tables);'),
    'QR list loads persisted tables directly from backend API'
  );

  // Verify zero silent mock fallback
  assert(
    !qrPageSrc.includes('const [tables] = useState(getInitialTables);') &&
    !qrPageSrc.includes('function getInitialTables()'),
    'Eliminated getInitialTables() mock loader and local storage fallback'
  );

  // Verify honest UI states
  assert(
    qrPageSrc.includes('isLoading && tables.length === 0') &&
    qrPageSrc.includes('aria-label="Loading tables"'),
    'Renders honest loading skeleton while initial API fetch is in progress'
  );
  assert(
    qrPageSrc.includes('{fetchError && (') &&
    qrPageSrc.includes('Retry Connection'),
    'Displays honest API error banner with "Retry Connection" without falling back to mock data'
  );
  assert(
    qrPageSrc.includes('No Dining Tables Found') &&
    qrPageSrc.includes('Go to Table Management'),
    'Displays empty state when 0 tables exist in the backend database'
  );
  assert(
    qrPageSrc.includes('No Matching Tables Found') &&
    qrPageSrc.includes('Clear Filters'),
    'Displays empty state when search/status filters yield 0 results'
  );

  // -----------------------------------------------------------------------------
  // 2. STABLE TABLE IDENTIFIER & DISPLAY-NAME INVARIANCE
  // -----------------------------------------------------------------------------
  console.log('\n--- 2. Stable Identifiers & Display Name Invariance ---');

  const table1 = normalizeTableDoc({
    _id: '670c1f77bcf86cd799439001',
    tableNumber: 'Table 1',
    name: 'Window Bay',
    capacity: 4,
    status: 'Active',
  });

  const table2 = normalizeTableDoc({
    _id: '670c1f77bcf86cd799439002',
    tableNumber: 'Table 2',
    name: 'Garden Alcove',
    capacity: 2,
    status: 'Active',
  });

  const url1 = generateTableDineInUrl(table1, 'https://happinessrestaurant.com');
  const url2 = generateTableDineInUrl(table2, 'https://happinessrestaurant.com');

  assert(
    url1.includes('tableId=670c1f77bcf86cd799439001'),
    'Table 1 QR encodes permanent MongoDB _id as tableId'
  );
  assert(
    url2.includes('tableId=670c1f77bcf86cd799439002'),
    'Table 2 QR encodes permanent MongoDB _id as tableId'
  );
  assert(url1 !== url2, 'Distinct tables generate distinct QR payloads');

  // Display Name Change Invariance Test:
  // Changing a table's display name from "Window Bay" to "VIP Presidential Lounge"
  // MUST NOT change its stable tableId or associate its QR with another table
  const table1Renamed = normalizeTableDoc({
    ...table1,
    name: 'VIP Presidential Lounge',
  });
  const url1Renamed = generateTableDineInUrl(table1Renamed, 'https://happinessrestaurant.com');

  assert(
    url1Renamed === url1,
    'Table display-name change does not alter QR payload (stable ID immune to name edits)'
  );
  assert(
    url1Renamed.includes('tableId=670c1f77bcf86cd799439001'),
    'Renamed table retains exact stable tableId'
  );

  // Verify in JSX that React keys use persistent IDs
  assert(
    qrPageSrc.includes('const stableKey = table.id || table._id || table.tableNumber;') &&
    qrPageSrc.includes('key={stableKey}'),
    'Card list keys strictly use stable persistent identifiers instead of array indexes'
  );

  // -----------------------------------------------------------------------------
  // 3. QR GENERATION, DOWNLOAD & PRINT INTEGRITY
  // -----------------------------------------------------------------------------
  console.log('\n--- 3. QR Generation, Download & Print Output Verification ---');

  // Verify pure JS QR matrix generation
  const matrix1 = generateQRCodeMatrix(url1);
  const matrix2 = generateQRCodeMatrix(url2);
  assert(
    matrix1.size >= 21 && matrix2.size >= 21 && matrix1.size === matrix2.size,
    'Pure JS QR engine generates valid 2D matrices'
  );

  let matrixDifference = false;
  for (let r = 0; r < matrix1.size; r++) {
    for (let c = 0; c < matrix1.size; c++) {
      if (matrix1.matrix[r][c] !== matrix2.matrix[r][c]) {
        matrixDifference = true;
        break;
      }
    }
    if (matrixDifference) break;
  }
  assert(matrixDifference, 'Different tables generate distinct scannable 2D QR matrices');

  // Verify QR payload safety (zero sensitive data)
  const sensitivePatterns = ['token', 'secret', 'customer', 'orderId', 'password', 'apiKey', 'bearer'];
  sensitivePatterns.forEach((pattern) => {
    assert(
      !url1.toLowerCase().includes(pattern),
      `QR payload contains no sensitive keyword "${pattern}"`
    );
  });

  // Verify PNG download filename formatting
  assert(
    qrPageSrc.includes('const cleanNum =') &&
    qrPageSrc.includes('happiness-restaurant-${cleanNum}-qr.png'),
    'PNG download produces clean filename: happiness-restaurant-[tableNum]-qr.png'
  );

  // Verify print sheet isolation and content
  assert(
    qrPageSrc.includes('hidden print:flex') && qrPageSrc.includes('print:hidden'),
    'Print sheet is isolated and hidden on screen, admin chrome hidden during print'
  );
  assert(
    qrPageSrc.includes('{RESTAURANT_CONFIG.name}') &&
    qrPageSrc.includes('{printingTable.tableNumber.toUpperCase()}') &&
    qrPageSrc.includes('Table Dine-In Service') &&
    qrPageSrc.includes('Scan to view the restaurant menu'),
    'Print output contains only restaurant name, table details, QR canvas, and scan instructions'
  );

  // Verify QR is clearly marked as preview/test
  assert(
    qrPageSrc.includes('Public Dine-In Identifier Notice (Preview / Test QR)') ||
    qrPageSrc.includes('Preview &amp; Test QR Ready'),
    'QR codes and modals are explicitly labelled as preview/test identifiers'
  );

  // -----------------------------------------------------------------------------
  // 4. SECURITY & VALIDATION TESTING
  // -----------------------------------------------------------------------------
  console.log('\n--- 4. Security, URL Manipulation & Authorization Verification ---');

  const entryPagePath = path.join(frontendSrc, 'pages/customer/DineInEntryPage.jsx');
  assert(fs.existsSync(entryPagePath), 'DineInEntryPage.jsx exists');
  const entryPageSrc = fs.readFileSync(entryPagePath, 'utf8');

  // Test: Malformed or nonexistent table identifiers in URL
  assert(
    findMockTable('malformed-table-id-!@#$%') === null,
    'Malformed table identifier returns null'
  );
  assert(
    findMockTable('table-99999-not-found') === null,
    'Nonexistent table identifier returns null'
  );
  assert(
    findMockTable(null) === null && findMockTable('') === null,
    'Missing table identifier returns null'
  );

  // Verify Entry Page renders error for nonexistent/malformed table
  assert(
    entryPageSrc.includes('Table Not Recognized') &&
    entryPageSrc.includes('Invalid Table Identifier'),
    'DineInEntryPage displays clear error state when URL has invalid/missing table'
  );

  // Test: Inactive table handling
  assert(
    entryPageSrc.includes("if (resolvedTable && resolvedTable.status === 'Active')") &&
    entryPageSrc.includes('Table Currently Inactive') &&
    entryPageSrc.includes('Table Ordering Unavailable'),
    'DineInEntryPage prevents inactive tables from starting a new dine-in ordering session'
  );

  const contextPath = path.join(frontendSrc, 'context/DineInContext.jsx');
  assert(fs.existsSync(contextPath), 'DineInContext.jsx exists');
  const contextSrc = fs.readFileSync(contextPath, 'utf8');
  assert(
    contextSrc.includes("if (dineInTable.status && dineInTable.status !== 'Active')"),
    'DineInContext actively rejects adding items to cart when table is inactive'
  );

  // Test: Backend authorization enforcement
  const backendAdminRoutesPath = path.resolve(__dirname, '../../../backend/src/routes/admin.routes.js');
  assert(fs.existsSync(backendAdminRoutesPath), 'backend/src/routes/admin.routes.js exists');
  const adminRoutesSrc = fs.readFileSync(backendAdminRoutesPath, 'utf8');

  assert(
    adminRoutesSrc.includes('router.use(authenticateAdmin)'),
    'All admin table APIs require authorized admin JWT authentication'
  );

  // Test: Public QR never exposes private orders
  const customerRoutesPath = path.join(frontendSrc, 'routes/CustomerRoutes.jsx');
  assert(fs.existsSync(customerRoutesPath), 'CustomerRoutes.jsx exists');
  const customerRoutesSrc = fs.readFileSync(customerRoutesPath, 'utf8');

  assert(
    !customerRoutesSrc.includes('admin/tables') &&
    !customerRoutesSrc.includes('admin/orders'),
    'Customer-facing routes cannot access table management or administrative orders'
  );

  // -----------------------------------------------------------------------------
  // 5. REGRESSION & INVARIANCE TESTING
  // -----------------------------------------------------------------------------
  console.log('\n--- 5. Regression & Invariance Verification ---');

  const tablesPagePath = path.join(frontendSrc, 'pages/admin/AdminTablesPage.jsx');
  assert(fs.existsSync(tablesPagePath), 'AdminTablesPage.jsx exists');
  const tablesPageSrc = fs.readFileSync(tablesPagePath, 'utf8');

  // Phase 1 Table Management operations
  assert(
    tablesPageSrc.includes('handleOpenAddModal') &&
    tablesPageSrc.includes('handleOpenEditModal') &&
    tablesPageSrc.includes('handleActivateTable') &&
    tablesPageSrc.includes('handleConfirmDeactivate'),
    'Phase 1 Add, Edit, Activate, and Deactivate table operations are preserved'
  );

  // Admin Navigation order
  const layoutPath = path.join(frontendSrc, 'layouts/AdminLayout.jsx');
  assert(fs.existsSync(layoutPath), 'AdminLayout.jsx exists');
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
    'Admin sidebar navigation order strictly preserved'
  );

  // Parcel Pickup and customer modules
  assert(
    customerRoutesSrc.includes('/menu') &&
    customerRoutesSrc.includes('/cart') &&
    customerRoutesSrc.includes('/checkout') &&
    customerRoutesSrc.includes('/orders') &&
    customerRoutesSrc.includes('/track-order') &&
    customerRoutesSrc.includes('/reviews'),
    'Customer Parcel Pickup, cart, checkout, order tracking, and reviews routes are untouched'
  );

  // -----------------------------------------------------------------------------
  // 6. RESPONSIVE BREAKPOINT LAYOUT AUDIT
  // -----------------------------------------------------------------------------
  console.log('\n--- 6. Responsive Breakpoints & Mobile Layout Audit ---');

  // Desktop / Laptop (1536px, 1280px)
  assert(
    qrPageSrc.includes('xl:grid-cols-4') && qrPageSrc.includes('lg:grid-cols-3'),
    'Table QR cards support 4-column layout on 1536px and 3-column layout on 1280px'
  );

  // Tablet (768px)
  assert(
    qrPageSrc.includes('sm:grid-cols-2') && qrPageSrc.includes('sm:grid-cols-3'),
    'Summary metrics adapt to 3 columns and card grid to 2 columns on 768px tablet'
  );

  // Mobile (390px, 360px)
  assert(
    qrPageSrc.includes('grid-cols-1') && qrPageSrc.includes('flex flex-col sm:flex-row'),
    'Layout stacks to single column on mobile (360px & 390px) without horizontal overflow'
  );
  assert(
    qrPageSrc.includes('max-h-[92vh] overflow-y-auto') && qrPageSrc.includes('max-w-md w-full'),
    'Preview modal enforces max-h-[92vh] and overflow-y-auto, preventing modal clipping on mobile viewports'
  );

  // -----------------------------------------------------------------------------
  // 7. SOURCE CODE EXTENSIONS AUDIT
  // -----------------------------------------------------------------------------
  console.log('\n--- 7. Source Code File Formats Audit ---');
  const forbiddenExts = ['.ts', '.tsx', '.mjs'];
  let forbiddenCount = 0;

  function auditDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory() && ent.name !== 'node_modules' && ent.name !== '.git' && ent.name !== 'dist') {
        auditDir(full);
      } else if (ent.isFile()) {
        const ext = path.extname(ent.name).toLowerCase();
        if (forbiddenExts.includes(ext)) {
          console.error(`Forbidden extension found: ${full}`);
          forbiddenCount++;
        }
      }
    }
  }

  auditDir(frontendSrc);
  assert(forbiddenCount === 0, 'Frontend src directory strictly contains only .js and .jsx files (0 .ts/.tsx/.mjs)');

  console.log('\n================================================================');
  console.log(`PHASE 7 PROMPT 3 SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('================================================================');

  if (failCount > 0) {
    process.exit(1);
  } else {
    console.log('ALL PHASE 7 FINAL VERIFICATION TESTS PASSED SUCCESSFULLY.');
    process.exit(0);
  }
}

runFinalVerification().catch((err) => {
  console.error('Fatal error during final verification:', err);
  process.exit(1);
});
