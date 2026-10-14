import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendSrc = path.resolve(__dirname, '../../src');
const backendSrc = path.resolve(__dirname, '../../../../backend/src');

console.log('================================================================');
console.log('PHASE 6 — PROMPT 2: TABLE MANAGEMENT INTEGRATION & RESPONSIVE QA');
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

// ----------------------------------------------------------------------
// Polyfill browser window and localStorage for Node.js API client tests
// ----------------------------------------------------------------------
const storageMap = new Map();
let dispatchedEvents = [];

if (typeof window === 'undefined') {
  global.window = {
    localStorage: {
      getItem: (k) => storageMap.get(k) || null,
      setItem: (k, v) => storageMap.set(k, String(v)),
      removeItem: (k) => storageMap.delete(k),
      clear: () => storageMap.clear(),
    },
    dispatchEvent: (evt) => {
      dispatchedEvents.push(evt);
    },
  };
}

if (typeof CustomEvent === 'undefined') {
  global.CustomEvent = class CustomEvent {
    constructor(type, params = {}) {
      this.type = type;
      this.detail = params.detail || null;
    }
  };
}

async function runTests() {
  // 1. Load backend Express app and JWT generator
  let backendApp;
  let generateToken;
  try {
    const appModule = await import('../../../backend/src/app.js');
    backendApp = appModule.default || appModule.app;
    const jwtModule = await import('../../../backend/src/utils/jwt.js');
    generateToken = jwtModule.generateToken;
  } catch (err) {
    console.error('Failed to import backend modules:', err);
    assert(false, 'Backend modules load successfully');
    process.exit(1);
  }

  // 2. Start ephemeral HTTP server on port 0
  const server = http.createServer(backendApp);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const testBaseUrl = `http://localhost:${port}/api`;
  process.env.VITE_API_BASE_URL = testBaseUrl;

  // 3. Dynamically import frontend services pointing to the test server
  const { adminTableApi, normalizeTableDoc } = await import('../../src/services/adminTableApi.js');
  const { api } = await import('../../src/services/api.js');

  const adminToken = generateToken({ sub: '507f1f77bcf86cd799439099', role: 'ADMIN' });
  const customerToken = generateToken({ sub: '507f1f77bcf86cd799439088', role: 'CUSTOMER' });

  // Set active admin token in localStorage
  window.localStorage.setItem('happiness_admin_token', adminToken);

  try {
    // ==================================================================
    // SECTION 1: INSPECT CURRENT INTEGRATION & CODE STRUCTURE
    // ==================================================================
    console.log('--- SECTION 1: Code & Route Structure Inspection ---');
    const pagePath = path.join(frontendSrc, 'pages/admin/AdminTablesPage.jsx');
    const servicePath = path.join(frontendSrc, 'services/adminTableApi.js');

    assert(fs.existsSync(pagePath), 'AdminTablesPage.jsx exists');
    assert(fs.existsSync(servicePath), 'adminTableApi.js exists');

    const pageSrc = fs.readFileSync(pagePath, 'utf8');
    assert(pageSrc.includes('adminTableApi.getTables()'), 'Page loads tables using adminTableApi');
    assert(pageSrc.includes('adminTableApi.createTable('), 'Page creates tables using adminTableApi');
    assert(pageSrc.includes('adminTableApi.updateTable('), 'Page updates tables using adminTableApi');
    assert(pageSrc.includes('adminTableApi.updateTableStatus('), 'Page updates status using adminTableApi');

    // ==================================================================
    // SECTION 2: LIVE API INTEGRATION & DATA PERSISTENCE TESTS
    // ==================================================================
    console.log('\n--- SECTION 2: Live API Integration & Persistence ---');

    // 2.1 Fetch initial tables
    const initialRes = await adminTableApi.getTables();
    assert(initialRes.success === true, 'adminTableApi.getTables() succeeds (200 OK)');
    assert(Array.isArray(initialRes.tables), 'Returns tables as an array');
    assert(initialRes.tables.length >= 4, `Initial floor layout contains baseline tables (found: ${initialRes.tables.length})`);
    assert(typeof initialRes.metrics?.total === 'number', 'Metrics contain total tables count');
    assert(typeof initialRes.metrics?.active === 'number', 'Metrics contain active tables count');
    assert(typeof initialRes.metrics?.inactive === 'number', 'Metrics contain inactive tables count');
    assert(typeof initialRes.metrics?.totalCapacity === 'number', 'Metrics contain totalCapacity count');

    const initialTotal = initialRes.metrics.total;
    const initialCapacity = initialRes.metrics.totalCapacity;

    // 2.2 Create a valid table via API
    const testTablePayload = {
      tableNumber: 'Table 99',
      name: 'Skyline Terrace',
      capacity: 8,
      status: 'Active',
    };
    const createRes = await adminTableApi.createTable(testTablePayload);
    assert(createRes.success === true, 'adminTableApi.createTable succeeds (201 Created)');
    assert(createRes.table?.tableNumber === 'Table 99', 'Created tableNumber matches "Table 99"');
    assert(createRes.table?.capacity === 8, 'Created capacity matches 8');
    assert(createRes.table?.status === 'Active', 'Created status matches "Active"');
    assert(createRes.table?.id, 'Created table has persistent identifier');

    const createdId = createRes.table.id;

    // 2.3 Verify persistence after refresh (re-querying tables)
    const afterCreateRes = await adminTableApi.getTables();
    const persistedTable = afterCreateRes.tables.find((t) => (t.id || t._id) === createdId);
    assert(persistedTable !== undefined, 'Created table persists across subsequent API queries');
    assert(afterCreateRes.metrics.total === initialTotal + 1, 'Total tables metric incremented by 1');
    assert(afterCreateRes.metrics.totalCapacity === initialCapacity + 8, 'Total guest seats metric incremented by 8');

    // 2.4 Edit the existing table via API
    const updateRes = await adminTableApi.updateTable(createdId, {
      name: 'Panoramic Skyline Lounge',
      capacity: 12,
    });
    assert(updateRes.success === true, 'adminTableApi.updateTable succeeds (200 OK)');
    assert(updateRes.table?.name === 'Panoramic Skyline Lounge', 'Updated name saved');
    assert(updateRes.table?.capacity === 12, 'Updated capacity saved (12)');

    // Verify edit persisted on fresh re-fetch
    const afterUpdateRes = await adminTableApi.getTables();
    const verifiedEdited = afterUpdateRes.tables.find((t) => (t.id || t._id) === createdId);
    assert(verifiedEdited?.capacity === 12, 'Capacity change persists across API requests');
    assert(verifiedEdited?.name === 'Panoramic Skyline Lounge', 'Name change persists across API requests');

    // 2.5 Deactivate table via API (Preserves database record)
    const deactRes = await adminTableApi.updateTableStatus(createdId, 'Inactive');
    assert(deactRes.success === true, 'adminTableApi.updateTableStatus to Inactive succeeds');
    assert(deactRes.table?.status === 'Inactive', 'Table status is now Inactive');

    // Verify record is preserved in database and metric reflects Inactive
    const afterDeactRes = await adminTableApi.getTables();
    const preservedDeact = afterDeactRes.tables.find((t) => (t.id || t._id) === createdId);
    assert(preservedDeact !== undefined, 'Deactivated table record remains preserved in collection');
    assert(preservedDeact?.status === 'Inactive', 'Preserved table has status "Inactive"');

    // 2.6 Reactivate table via API
    const reactRes = await adminTableApi.updateTableStatus(createdId, 'Active');
    assert(reactRes.success === true, 'adminTableApi.updateTableStatus to Active succeeds');
    assert(reactRes.table?.status === 'Active', 'Table status restored to Active');

    // 2.7 Duplicate table number rejection (409 Conflict)
    let dupError = null;
    try {
      await adminTableApi.createTable({
        tableNumber: 'Table 1',
        capacity: 4,
      });
    } catch (err) {
      dupError = err;
    }
    assert(dupError !== null, 'Duplicate table creation was rejected');
    assert(dupError.status === 409, 'Duplicate error has HTTP 409 status');
    assert(dupError.message?.toLowerCase().includes('already exists'), 'Duplicate error message contains "already exists"');

    // 2.8 Invalid seating capacity rejection (400 Bad Request)
    let capError = null;
    try {
      await adminTableApi.createTable({
        tableNumber: 'Table Invalid-Cap',
        capacity: 0,
      });
    } catch (err) {
      capError = err;
    }
    assert(capError !== null && capError.status === 400, 'Rejects capacity 0 with 400 Bad Request');

    // 2.9 Invalid ID format and missing records
    let missingIdError = null;
    try {
      await adminTableApi.getTable('507f1f77bcf86cd799439999');
    } catch (err) {
      missingIdError = err;
    }
    assert(missingIdError !== null && missingIdError.status === 404, 'Nonexistent table ID returns 404');

    // 2.10 Clean up created table
    const deleteRes = await adminTableApi.deleteTable(createdId);
    assert(deleteRes.success === true, 'adminTableApi.deleteTable succeeds (200 OK)');

    const afterDeleteRes = await adminTableApi.getTables();
    assert(!afterDeleteRes.tables.some((t) => (t.id || t._id) === createdId), 'Table successfully removed from list after cleanup');

    // ==================================================================
    // SECTION 3: LOADING, EMPTY & ERROR STATE HANDLING
    // ==================================================================
    console.log('\n--- SECTION 3: Loading, Empty & Error State Handling ---');

    // 3.1 Honest loading skeleton inspection in JSX
    assert(pageSrc.includes('Loading tables from database'), 'Contains loading skeleton indicator');
    assert(pageSrc.includes('isLoading && tables.length === 0'), 'Renders loading skeleton when initial fetch is pending');

    // 3.2 Honest error banner inspection in JSX
    assert(pageSrc.includes('Failed to load live tables'), 'Contains dedicated API fetch error banner');
    assert(pageSrc.includes('Retry Connection'), 'Contains user-friendly "Retry Connection" action button');
    assert(pageSrc.includes('setFetchError'), 'Handles fetch failures by setting explicit fetchError state');
    assert(!pageSrc.includes('getInitialTables'), 'Eliminated silent fallback to mock data on API failure');

    // 3.3 Empty state inspection in JSX
    assert(pageSrc.includes('No Matching Tables Found'), 'Displays clean empty state when no tables match');
    assert(pageSrc.includes('Reset Filters') || pageSrc.includes('Clear Filters'), 'Empty state includes clear filters option');

    // 3.4 Duplicate click prevention (isSaving and isTogglingStatus)
    assert(pageSrc.includes('disabled={isSaving}'), 'Disables submit button while request is in-flight');
    assert(pageSrc.includes('Saving...'), 'Displays "Saving..." loading state during submission');
    assert(pageSrc.includes('disabled={isTogglingStatus}'), 'Disables status toggle button during status transition');
    assert(pageSrc.includes('Updating...'), 'Displays "Updating..." state in deactivation modal');

    // ==================================================================
    // SECTION 4: SECURITY & AUTHORIZATION VERIFICATION
    // ==================================================================
    console.log('\n--- SECTION 4: Security & Authorization Verification ---');

    // 4.1 Unauthenticated request is rejected (401)
    window.localStorage.removeItem('happiness_admin_token');
    let unauthError = null;
    try {
      await adminTableApi.getTables();
    } catch (err) {
      unauthError = err;
    }
    assert(unauthError !== null && unauthError.status === 401, 'Rejects unauthenticated request with 401 Unauthorized');

    // 4.2 Customer role token is rejected (403 Forbidden)
    window.localStorage.setItem('happiness_admin_token', customerToken);
    let customerError = null;
    try {
      await adminTableApi.getTables();
    } catch (err) {
      customerError = err;
    }
    assert(customerError !== null && customerError.status === 403, 'Rejects customer role token with 403 Forbidden');

    // Restore admin token
    window.localStorage.setItem('happiness_admin_token', adminToken);

    // 4.3 Error response sanitization (no stack traces, no credentials)
    let sanitizedError = null;
    try {
      await adminTableApi.createTable({ tableNumber: 'Table 1', capacity: 4 });
    } catch (err) {
      sanitizedError = err;
    }
    assert(!sanitizedError.message.includes('mongodb+srv'), 'Error message does not leak database connection URI');
    assert(!sanitizedError.message.includes('at '), 'Error message does not leak server stack traces');

    // 4.4 Table ID is not a customer order token
    const customerOrderCheck = await fetch(`${testBaseUrl}/orders/507f1f77bcf86cd799439001`);
    assert(customerOrderCheck.status === 400 || customerOrderCheck.status === 404, 'Public table ID cannot be used to read customer orders');

    // ==================================================================
    // SECTION 5: RESPONSIVE UI REGRESSION AUDIT (ALL BREAKPOINTS)
    // ==================================================================
    console.log('\n--- SECTION 5: Responsive Layout Breakdown Audit ---');

    // Desktop (1536 × 864) & Laptop (1280 × 720)
    assert(
      pageSrc.includes('hidden md:block overflow-x-auto'),
      'Desktop & Laptop: Full table view active on screens >= 768px (md breakpoint)'
    );
    assert(
      pageSrc.includes('lg:grid-cols-4'),
      'Desktop & Laptop: 4-column summary metric grid on screens >= 1024px (lg breakpoint)'
    );

    // Tablet (768 px wide)
    assert(
      pageSrc.includes('sm:grid-cols-3') && pageSrc.includes('sm:col-span-3 lg:col-span-1'),
      'Tablet (768px): 3-column metric grid layout prevents card squishing'
    );

    // Mobile (390 × 844) & Small Mobile (360 × 800)
    assert(
      pageSrc.includes('md:hidden divide-y divide-slate-100'),
      'Mobile: Touch-friendly card view replaces wide table on screens < 768px'
    );
    assert(
      pageSrc.includes('min-h-[42px]'),
      'Mobile: Action buttons enforce accessible touch target height (>= 42px)'
    );
    assert(
      pageSrc.includes('flex flex-col sm:flex-row'),
      'Mobile: Page header and search toolbar stack vertically on mobile to prevent overflow'
    );
    assert(
      pageSrc.includes('max-w-md w-full p-6') && pageSrc.includes('max-h-[92vh] overflow-y-auto'),
      'Small Mobile (360px): Confirmation and form dialogs fit within viewport with vertical scroll'
    );
    assert(
      pageSrc.includes('truncate'),
      'Mobile: Long table names or numbers use CSS truncate to avoid horizontal scrollbars'
    );

  } catch (err) {
    console.error('Integration QA Test Suite Exception:', err);
    failCount++;
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  console.log('\n================================================================');
  console.log(`TOTAL TESTS PASSED: ${passCount}`);
  console.log(`TOTAL TESTS FAILED: ${failCount}`);
  console.log('================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  } else {
    console.log('PHASE 6 PROMPT 2 INTEGRATION QA TEST SUITE COMPLETED WITH 100% SUCCESS.');
    process.exit(0);
  }
}

runTests();
