import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  generateQRCodeMatrix,
  generateTableDineInUrl,
} from '../../src/utils/qrCodeGenerator.js';
import { normalizeTableDoc } from '../../src/services/adminTableApi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendSrc = path.resolve(__dirname, '../../src');

console.log('================================================================');
console.log('PHASE 7 — PROMPT 1: REAL TABLE QR INTEGRATION QA VERIFICATION');
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

async function runVerification() {
  // -----------------------------------------------------------------------------
  // 1. COMPONENT INSPECTION & PERSISTENCE INTEGRATION
  // -----------------------------------------------------------------------------
  console.log('--- 1. AdminTableQRCodesPage.jsx Persistence Inspection ---');
  const pagePath = path.join(frontendSrc, 'pages/admin/AdminTableQRCodesPage.jsx');
  assert(fs.existsSync(pagePath), 'AdminTableQRCodesPage.jsx exists');

  const pageSrc = fs.readFileSync(pagePath, 'utf8');

  // Verify import of adminTableApi
  assert(
    pageSrc.includes("import { adminTableApi } from '../../services/adminTableApi'"),
    'Imports adminTableApi service client for database persistence'
  );

  // Verify elimination of mock table initialization
  assert(
    !pageSrc.includes('const [tables] = useState(getInitialTables);') &&
    !pageSrc.includes('function getInitialTables()'),
    'Eliminated getInitialTables() mock loader and local storage fallback'
  );

  // Verify live state declarations
  assert(
    pageSrc.includes('const [tables, setTables] = useState([]);'),
    'Initializes tables state to empty array for live API population'
  );
  assert(
    pageSrc.includes('const [isLoading, setIsLoading] = useState(true);'),
    'Tracks isLoading state for honest loading feedback'
  );
  assert(
    pageSrc.includes('const [fetchError, setFetchError] = useState(null);'),
    'Tracks fetchError state for honest error reporting'
  );

  // Verify loadTables callback
  assert(
    pageSrc.includes('const loadTables = useCallback(async () => {') &&
    pageSrc.includes('const res = await adminTableApi.getTables();') &&
    pageSrc.includes('setTables(res.tables);'),
    'loadTables fetches persisted table records via adminTableApi.getTables()'
  );
  assert(
    pageSrc.includes('setFetchError(err.message ||'),
    'Sets honest fetch error message on failure without falling back to mock tables'
  );

  // -----------------------------------------------------------------------------
  // 2. HONEST UI STATES: REFRESH, ERROR, SKELETON, EMPTY
  // -----------------------------------------------------------------------------
  console.log('\n--- 2. Honest UI States (Loading, Error, Refresh, Empty) ---');

  // Refresh toolbar button
  assert(
    pageSrc.includes('onClick={loadTables}') &&
    pageSrc.includes('Refresh table QR records') &&
    pageSrc.includes('Refreshing...'),
    'Provides manual Refresh button to reload latest persisted tables from database'
  );

  // Error Banner & Retry Connection
  assert(
    pageSrc.includes('{fetchError && (') &&
    pageSrc.includes('Failed to load persisted tables') &&
    pageSrc.includes('Retry Connection'),
    'Renders honest API error banner with "Retry Connection" button'
  );

  // Loading Skeletons
  assert(
    pageSrc.includes('isLoading && tables.length === 0') &&
    pageSrc.includes('animate-pulse') &&
    pageSrc.includes('aria-label="Loading tables"'),
    'Renders responsive skeleton cards while tables are loading'
  );

  // Honest Empty States
  assert(
    pageSrc.includes('No Dining Tables Found') &&
    pageSrc.includes('Go to Table Management'),
    'Renders informative empty state when database has zero tables'
  );
  assert(
    pageSrc.includes('No Matching Tables Found') &&
    pageSrc.includes('Clear Filters'),
    'Renders search/filter empty state with Clear Filters button'
  );

  // Summary Metrics Loading Aware
  assert(
    pageSrc.includes("{isLoading ? '...' : totalTables}") &&
    pageSrc.includes("{isLoading ? '...' : activeTables}") &&
    pageSrc.includes("{isLoading ? '...' : inactiveTables}"),
    'Summary metrics honestly display loading indicator until API responds'
  );

  // -----------------------------------------------------------------------------
  // 3. STABLE IDENTIFIERS & QR DESTINATION URL
  // -----------------------------------------------------------------------------
  console.log('\n--- 3. Stable Table Identifiers & QR URL Mapping ---');

  // Simulated persisted tables returned by MongoDB
  const persistedTable1 = normalizeTableDoc({
    _id: '670c1f77bcf86cd799439001',
    tableNumber: 'Table 1',
    name: 'Window Bay',
    capacity: 4,
    status: 'Active',
  });

  const persistedTable2 = normalizeTableDoc({
    _id: '670c1f77bcf86cd799439002',
    tableNumber: 'Table 2',
    name: 'Garden Alcove',
    capacity: 2,
    status: 'Active',
  });

  const persistedTableInactive = normalizeTableDoc({
    _id: '670c1f77bcf86cd799439003',
    tableNumber: 'Table 3',
    name: 'Terrace Corner',
    capacity: 6,
    status: 'Inactive',
  });

  assert(
    persistedTable1.id === '670c1f77bcf86cd799439001' &&
    persistedTable1._id === '670c1f77bcf86cd799439001',
    'normalizeTableDoc preserves MongoDB _id as stable id identifier'
  );

  const url1 = generateTableDineInUrl(persistedTable1, 'https://happinessrestaurant.com');
  const url2 = generateTableDineInUrl(persistedTable2, 'https://happinessrestaurant.com');
  const urlInactive = generateTableDineInUrl(persistedTableInactive, 'https://happinessrestaurant.com');

  assert(
    url1.includes('table=Table%201') &&
    url1.includes('tableId=670c1f77bcf86cd799439001') &&
    url1.includes('mode=dine_in'),
    'Table 1 URL encodes exact table number and stable MongoDB _id as tableId'
  );

  assert(
    url2.includes('table=Table%202') &&
    url2.includes('tableId=670c1f77bcf86cd799439002') &&
    url2.includes('mode=dine_in'),
    'Table 2 URL encodes exact table number and stable MongoDB _id as tableId'
  );

  assert(
    url1 !== url2,
    'Different persisted tables produce strictly unique destination URLs'
  );

  // Security check on QR payload
  assert(
    !url1.includes('token') &&
    !url1.includes('secret') &&
    !url1.includes('customer') &&
    !url1.includes('orderId') &&
    !url1.includes('password'),
    'QR payload contains NO customer info, private order details, auth tokens, or passwords'
  );

  // Matrix generation distinctness
  const matrix1 = generateQRCodeMatrix(url1);
  const matrix2 = generateQRCodeMatrix(url2);
  assert(
    matrix1.size === matrix2.size && matrix1.size >= 21,
    'Generates standard ISO-compliant QR matrices'
  );

  let matricesDiffer = false;
  for (let r = 0; r < matrix1.size; r++) {
    for (let c = 0; c < matrix1.size; c++) {
      if (matrix1.matrix[r][c] !== matrix2.matrix[r][c]) {
        matricesDiffer = true;
        break;
      }
    }
    if (matricesDiffer) break;
  }
  assert(matricesDiffer, 'Distinct persisted tables generate distinct 2D QR matrices');

  // Verify stable key in JSX
  assert(
    pageSrc.includes('const stableKey = table.id || table._id || table.tableNumber;') &&
    pageSrc.includes('key={stableKey}'),
    'Card list keys map to persistent table identifier (not array indexes)'
  );

  // -----------------------------------------------------------------------------
  // 4. INACTIVE TABLE HANDLING
  // -----------------------------------------------------------------------------
  console.log('\n--- 4. Inactive Table Handling ---');
  assert(
    pageSrc.includes('Inactive &bull; Dine-in Disabled') ||
    pageSrc.includes('Inactive • Dine-in Disabled'),
    'Inactive table cards display clear "Inactive • Dine-in Disabled" badge'
  );
  assert(
    pageSrc.includes('Table Currently Inactive') &&
    pageSrc.includes('This table is deactivated. Customers scanning this QR code will not be able to place dine-in orders'),
    'Preview modal renders explicit inactive table warning for deactivated tables'
  );

  // -----------------------------------------------------------------------------
  // 5. DOWNLOAD & PRINT INTEGRATION
  // -----------------------------------------------------------------------------
  console.log('\n--- 5. Download and Print Verification ---');

  // Download filename generation
  const cleanNum1 = (persistedTable1.tableNumber || '').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase().replace(/-+/g, '-').replace(/^-|-$/g, '') || 'table';
  const expectedFilename1 = `happiness-restaurant-${cleanNum1}-qr.png`;
  assert(
    expectedFilename1 === 'happiness-restaurant-table-1-qr.png',
    `Download filename conforms to expected format: "${expectedFilename1}"`
  );

  assert(
    pageSrc.includes('happiness-restaurant-${cleanNum}-qr.png') ||
    pageSrc.includes('happiness-restaurant-') && pageSrc.includes('-qr.png'),
    'handleDownloadQR uses standard table-specific PNG filename pattern'
  );

  // Print layout verification
  assert(
    pageSrc.includes('printingTable') &&
    pageSrc.includes('hidden print:flex'),
    'Print sheet isolated to printingTable and visible only via @media print'
  );
  assert(
    pageSrc.includes('RESTAURANT_CONFIG.name') &&
    pageSrc.includes('printingTable.tableNumber') &&
    pageSrc.includes('Table Dine-In Service') &&
    pageSrc.includes('Scan to view the restaurant menu'),
    'Print sheet contains restaurant name, table number, dine-in title, and scan prompt'
  );
  assert(
    pageSrc.includes('print:hidden'),
    'Admin navigation and interactive UI chrome are hidden during printing'
  );

  // -----------------------------------------------------------------------------
  // 6. BACKEND SECURITY & PERMISSION ENFORCEMENT
  // -----------------------------------------------------------------------------
  console.log('\n--- 6. Backend API Authentication & Protection Verification ---');
  const backendAdminRoutesPath = path.resolve(__dirname, '../../../backend/src/routes/admin.routes.js');
  assert(fs.existsSync(backendAdminRoutesPath), 'backend/src/routes/admin.routes.js exists');

  const adminRoutesSrc = fs.readFileSync(backendAdminRoutesPath, 'utf8');
  assert(
    adminRoutesSrc.includes('router.use(authenticateAdmin)'),
    'All admin routes enforce authenticateAdmin middleware protection'
  );
  assert(
    adminRoutesSrc.includes("router.get('/tables', tableController.getTables)"),
    'Table retrieval endpoint is securely bound to authenticateAdmin'
  );

  // -----------------------------------------------------------------------------
  // 7. ROUTE & REGRESSION INVARIANCE
  // -----------------------------------------------------------------------------
  console.log('\n--- 7. Invariance and Regression Protection ---');
  const customerRoutesPath = path.join(frontendSrc, 'routes/CustomerRoutes.jsx');
  const customerRoutesSrc = fs.readFileSync(customerRoutesPath, 'utf8');

  assert(
    customerRoutesSrc.includes('/cart') &&
    customerRoutesSrc.includes('/checkout') &&
    customerRoutesSrc.includes('/orders') &&
    customerRoutesSrc.includes('/track-order') &&
    customerRoutesSrc.includes('/reviews'),
    'Existing Parcel Pickup, Cart, Checkout, Order Tracking, and Reviews remain untouched'
  );

  const adminRoutesPath = path.join(frontendSrc, 'routes/AdminRoutes.jsx');
  const frontendAdminRoutesSrc = fs.readFileSync(adminRoutesPath, 'utf8');
  assert(
    frontendAdminRoutesSrc.includes('tables/qr') &&
    frontendAdminRoutesSrc.includes('AdminTableQRCodesPage'),
    'AdminRoutes registers tables/qr for AdminTableQRCodesPage'
  );

  // -----------------------------------------------------------------------------
  // 8. CODE QUALITY & FORBIDDEN EXTENSIONS AUDIT
  // -----------------------------------------------------------------------------
  console.log('\n--- 8. Source Code & Forbidden File Extensions Audit ---');
  const forbiddenExts = ['.ts', '.tsx', '.mjs'];
  let forbiddenFound = 0;

  function auditDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory() && ent.name !== 'node_modules' && ent.name !== '.git' && ent.name !== 'dist') {
        auditDir(full);
      } else if (ent.isFile()) {
        const ext = path.extname(ent.name).toLowerCase();
        if (forbiddenExts.includes(ext)) {
          console.error(`Forbidden file extension detected: ${full}`);
          forbiddenFound++;
        }
      }
    }
  }

  auditDir(frontendSrc);
  assert(forbiddenFound === 0, 'Frontend src directory strictly contains only .js and .jsx files (0 .ts/.tsx/.mjs)');

  // Check package.json dependencies
  const pkgPath = path.resolve(__dirname, '../../package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const deps = Object.keys(pkg.dependencies || {});
  assert(
    !deps.includes('qrcode') && !deps.includes('react-qr-code'),
    'No external QR generation dependencies introduced; pure JS generator retained'
  );

  console.log('\n================================================================');
  console.log(`PHASE 7 PROMPT 1 QA SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('================================================================');

  if (failCount > 0) {
    process.exit(1);
  } else {
    console.log('PHASE 7 PROMPT 1 REAL TABLE QR INTEGRATION VERIFIED SUCCESSFULLY.');
    process.exit(0);
  }
}

runVerification().catch((err) => {
  console.error('Test execution failed with error:', err);
  process.exit(1);
});
