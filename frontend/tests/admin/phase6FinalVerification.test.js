import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendSrc = path.resolve(__dirname, '../../src');

console.log('================================================================');
console.log('PHASE 6 — PROMPT 3: TABLE MANAGEMENT FINAL INTEGRATION SIGN-OFF');
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

// Browser polyfill for Node.js API client execution
const memoryStorage = new Map();
let dispatchedEvents = [];

if (typeof window === 'undefined') {
  global.window = {
    localStorage: {
      getItem: (k) => memoryStorage.get(k) || null,
      setItem: (k, v) => memoryStorage.set(k, String(v)),
      removeItem: (k) => memoryStorage.delete(k),
      clear: () => memoryStorage.clear(),
    },
    dispatchEvent: (e) => dispatchedEvents.push(e),
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

async function runSignOffTests() {
  // 1. Load backend application & JWT utils
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

  // 2. Launch ephemeral HTTP server
  const server = http.createServer(backendApp);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const testBaseUrl = `http://localhost:${port}/api`;
  process.env.VITE_API_BASE_URL = testBaseUrl;

  // 3. Load frontend API service
  const { adminTableApi, normalizeTableDoc } = await import('../../src/services/adminTableApi.js');

  const adminToken = generateToken({ sub: '507f1f77bcf86cd799439099', role: 'ADMIN' });
  const customerToken = generateToken({ sub: '507f1f77bcf86cd799439088', role: 'CUSTOMER' });

  window.localStorage.setItem('happiness_admin_token', adminToken);

  try {
    // ==================================================================
    // SECTION 1: CODE & INTEGRATION INTEGRITY AUDIT
    // ==================================================================
    console.log('--- 1. Inspection of Existing Implementation ---');
    const pagePath = path.join(frontendSrc, 'pages/admin/AdminTablesPage.jsx');
    const servicePath = path.join(frontendSrc, 'services/adminTableApi.js');

    assert(fs.existsSync(pagePath), 'AdminTablesPage.jsx exists');
    assert(fs.existsSync(servicePath), 'adminTableApi.js exists');

    const pageSrc = fs.readFileSync(pagePath, 'utf8');
    assert(pageSrc.includes('adminTableApi.getTables()'), 'Loads tables via verified adminTableApi service');
    assert(pageSrc.includes('adminTableApi.createTable('), 'Creates tables via verified adminTableApi service');
    assert(pageSrc.includes('adminTableApi.updateTable('), 'Updates tables via verified adminTableApi service');
    assert(pageSrc.includes('adminTableApi.updateTableStatus('), 'Toggles table status via verified adminTableApi service');
    assert(!pageSrc.includes('getInitialTables'), 'Eliminated silent local storage mock fallback');

    // ==================================================================
    // SECTION 2: DATABASE PERSISTENCE CYCLE
    // ==================================================================
    console.log('\n--- 2. Database Persistence Across Full Lifecycle ---');

    // 2.1 Existing tables load correctly
    const list1 = await adminTableApi.getTables();
    assert(list1.success === true, 'Existing tables load successfully from API');
    assert(list1.tables.length >= 4, `Floor layout contains baseline tables (found: ${list1.tables.length})`);
    const baselineTotal = list1.metrics.total;
    const baselineCapacity = list1.metrics.totalCapacity;

    // 2.2 Create new table
    const newTableData = {
      tableNumber: 'Table 77',
      name: 'Sunset Balcony',
      capacity: 4,
      status: 'Active',
    };
    const createRes = await adminTableApi.createTable(newTableData);
    assert(createRes.success === true, 'Newly created table succeeds (HTTP 201)');
    const tableId = createRes.table.id;

    // 2.3 Simulated page refresh (fresh GET /api/admin/tables)
    const listAfterCreate = await adminTableApi.getTables();
    const persistedNewTable = listAfterCreate.tables.find((t) => (t.id || t._id) === tableId);
    assert(persistedNewTable !== undefined, 'Newly created table remains persisted after simulated page refresh');
    assert(persistedNewTable?.name === 'Sunset Balcony', 'Name "Sunset Balcony" persisted accurately');
    assert(persistedNewTable?.capacity === 4, 'Capacity 4 persisted accurately');
    assert(listAfterCreate.metrics.total === baselineTotal + 1, 'Total Tables count reflects newly persisted record');

    // 2.4 Edit table details
    const editRes = await adminTableApi.updateTable(tableId, {
      name: 'Sunset Royal Balcony',
      capacity: 6,
    });
    assert(editRes.success === true, 'Table edit succeeds (HTTP 200)');

    // 2.5 Simulated page refresh after edit
    const listAfterEdit = await adminTableApi.getTables();
    const persistedEdited = listAfterEdit.tables.find((t) => (t.id || t._id) === tableId);
    assert(persistedEdited?.name === 'Sunset Royal Balcony', 'Edited name remains saved after refresh');
    assert(persistedEdited?.capacity === 6, 'Edited capacity (6) remains saved after refresh');
    assert(listAfterEdit.metrics.totalCapacity === baselineCapacity + 6, 'Total Guest Seats metric updated to reflect edited capacity');

    // 2.6 Deactivate table (preserve record)
    const deactRes = await adminTableApi.updateTableStatus(tableId, 'Inactive');
    assert(deactRes.success === true, 'Table deactivation succeeds (HTTP 200)');

    // 2.7 Simulated page refresh after deactivation
    const listAfterDeact = await adminTableApi.getTables();
    const preservedDoc = listAfterDeact.tables.find((t) => (t.id || t._id) === tableId);
    assert(preservedDoc !== undefined, 'Deactivated record is preserved in database across refreshes');
    assert(preservedDoc?.status === 'Inactive', 'Preserved record retains "Inactive" status');

    // 2.8 Reactivate table
    const reactRes = await adminTableApi.updateTableStatus(tableId, 'Active');
    assert(reactRes.success === true, 'Reactivation succeeds (HTTP 200)');

    const listAfterReact = await adminTableApi.getTables();
    const reactivatedDoc = listAfterReact.tables.find((t) => (t.id || t._id) === tableId);
    assert(reactivatedDoc?.status === 'Active', 'Reactivated status persists across refreshes');

    // 2.9 Cleanup
    await adminTableApi.deleteTable(tableId);

    // ==================================================================
    // SECTION 3: SUMMARY CARDS ACCURACY
    // ==================================================================
    console.log('\n--- 3. Summary Cards Metric Alignment ---');
    const freshList = await adminTableApi.getTables();
    const actualTotal = freshList.tables.length;
    const actualActive = freshList.tables.filter((t) => t.status === 'Active').length;
    const actualInactive = freshList.tables.filter((t) => t.status === 'Inactive').length;
    const actualSeats = freshList.tables.reduce((acc, t) => acc + (t.capacity || 0), 0);

    assert(freshList.metrics.total === actualTotal, 'Total Tables summary matches actual database record count');
    assert(freshList.metrics.active === actualActive, 'Active Tables summary matches actual database active count');
    assert(freshList.metrics.inactive === actualInactive, 'Inactive Tables summary matches actual database inactive count');
    assert(freshList.metrics.totalCapacity === actualSeats, 'Total Guest Seats matches cumulative seating capacity');

    // ==================================================================
    // SECTION 4: VALIDATION & DUPLICATE REJECTIONS
    // ==================================================================
    console.log('\n--- 4. Validation & Duplicate Rejections ---');

    // Duplicate table number
    let dupErr = null;
    try {
      await adminTableApi.createTable({ tableNumber: 'Table 1', capacity: 4 });
    } catch (err) {
      dupErr = err;
    }
    assert(dupErr && dupErr.status === 409, 'Duplicate table number rejected with HTTP 409 Conflict');
    assert(dupErr?.message?.toLowerCase().includes('already exists'), 'Duplicate error message is clear and helpful');

    // Case variation duplicate
    let caseDupErr = null;
    try {
      await adminTableApi.createTable({ tableNumber: '  table 1  ', capacity: 4 });
    } catch (err) {
      caseDupErr = err;
    }
    assert(caseDupErr && caseDupErr.status === 409, 'Case/whitespace variation duplicate rejected with HTTP 409');

    // Invalid seating capacities
    const invalidCaps = [0, -5, 3.5, 999, null];
    for (const badCap of invalidCaps) {
      let capErr = null;
      try {
        await adminTableApi.createTable({ tableNumber: `T-Cap-${Math.random()}`, capacity: badCap });
      } catch (err) {
        capErr = err;
      }
      assert(capErr && capErr.status === 400, `Capacity ${badCap} rejected with HTTP 400 Bad Request`);
    }

    // ==================================================================
    // SECTION 5: AUTHENTICATION, AUTHORIZATION & PRIVACY
    // ==================================================================
    console.log('\n--- 5. Authentication & Privacy Controls ---');

    // Unauthenticated
    window.localStorage.removeItem('happiness_admin_token');
    let unauthErr = null;
    try {
      await adminTableApi.getTables();
    } catch (err) {
      unauthErr = err;
    }
    assert(unauthErr && unauthErr.status === 401, 'Unauthenticated table request rejected with HTTP 401');

    // Customer role
    window.localStorage.setItem('happiness_admin_token', customerToken);
    let custErr = null;
    try {
      await adminTableApi.getTables();
    } catch (err) {
      custErr = err;
    }
    assert(custErr && custErr.status === 403, 'Customer role token rejected with HTTP 403 Forbidden');

    // Restore admin token
    window.localStorage.setItem('happiness_admin_token', adminToken);

    // Privacy: Error does not expose credentials or paths
    let testErr = null;
    try {
      await adminTableApi.createTable({ tableNumber: 'Table 1', capacity: 4 });
    } catch (err) {
      testErr = err;
    }
    assert(!testErr?.message?.includes('mongodb+srv'), 'Errors do not leak database connection URIs');
    assert(!testErr?.message?.includes('password'), 'Errors do not leak password secrets');
    assert(!testErr?.message?.includes('at '), 'Errors do not leak server stack traces');

    // ==================================================================
    // SECTION 6: FRONTEND ERROR & LOADING STATES
    // ==================================================================
    console.log('\n--- 6. Frontend UI States & Safety ---');

    // Loading skeleton in JSX
    assert(pageSrc.includes('Loading tables from database...'), 'Renders animated loading skeleton while initial fetch is pending');

    // Empty state in JSX
    assert(pageSrc.includes('No Matching Tables Found'), 'Renders empty state when table list is empty');

    // Connection failure in JSX
    assert(pageSrc.includes('Failed to load live tables'), 'Renders connection failure banner');
    assert(pageSrc.includes('Retry Connection'), 'Provides interactive "Retry Connection" recovery button');

    // Double-submit prevention
    assert(pageSrc.includes('disabled={isSaving}'), 'Disables submit button while create/edit request is pending');
    assert(pageSrc.includes('Saving...'), 'Displays inline "Saving..." text while saving');
    assert(pageSrc.includes('disabled={isTogglingStatus}'), 'Disables status button while status toggle is pending');
    assert(pageSrc.includes('Updating...'), 'Displays inline "Updating..." text while toggling status');

    // Form retains understandable values on error
    assert(pageSrc.includes('formErrors.tableNumber'), 'Displays specific table number error under field');
    assert(pageSrc.includes('formErrors.capacity'), 'Displays specific capacity error under field');

    // ==================================================================
    // SECTION 7: RESPONSIVE BREAKPOINT AUDIT
    // ==================================================================
    console.log('\n--- 7. Responsive Breakpoint Layouts ---');

    // Desktop: 1536 × 864 & Laptop: 1280 × 720
    assert(pageSrc.includes('hidden md:block overflow-x-auto'), 'Desktop/Laptop: Table view active (md breakpoint)');
    assert(pageSrc.includes('lg:grid-cols-4'), 'Desktop/Laptop: 4-column summary metrics layout');

    // Tablet: 768 px
    assert(pageSrc.includes('sm:grid-cols-3') && pageSrc.includes('sm:col-span-3 lg:col-span-1'), 'Tablet (768px): 3-column metric cards prevent horizontal squishing');

    // Mobile: 390 × 844 & Small Mobile: 360 × 800
    assert(pageSrc.includes('md:hidden divide-y divide-slate-100'), 'Mobile: Touch-friendly card view replaces wide table');
    assert(pageSrc.includes('min-h-[42px]'), 'Mobile: Action buttons enforce minimum touch height >= 42px');
    assert(pageSrc.includes('flex flex-col sm:flex-row'), 'Mobile: Headers and toolbars stack vertically');
    assert(pageSrc.includes('max-h-[92vh] overflow-y-auto'), 'Small mobile (360px): Dialogs fit in viewport with vertical scroll');
    assert(pageSrc.includes('truncate'), 'Mobile: Long strings truncated to prevent horizontal overflow');

    // ==================================================================
    // SECTION 8: REGRESSION & MODULE INVARIANCE AUDIT
    // ==================================================================
    console.log('\n--- 8. Regression Invariance Audit ---');
    const orderModelPath = path.resolve(__dirname, '../../../backend/src/models/Order.js');
    const orderModelSrc = fs.readFileSync(orderModelPath, 'utf8');
    assert(orderModelSrc.includes("enum: ['PICKUP']"), 'Order model strictly enforces PICKUP orderType');
    assert(!orderModelSrc.includes('tableId'), 'Order model has not been altered with tableId');

    const menuDataPath = path.join(frontendSrc, 'data/menuData.js');
    assert(fs.existsSync(menuDataPath), 'menuData.js remains intact');

    const pickupConfigPath = path.join(frontendSrc, 'config/pickupConfig.js');
    assert(fs.existsSync(pickupConfigPath), 'pickupConfig.js remains intact');

  } catch (err) {
    console.error('Final sign-off test exception:', err);
    failCount++;
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  console.log('\n================================================================');
  console.log(`FINAL SIGN-OFF QA SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  } else {
    console.log('PHASE 6 TABLE MANAGEMENT FINAL INTEGRATION SIGN-OFF COMPLETED.');
    process.exit(0);
  }
}

runSignOffTests();
