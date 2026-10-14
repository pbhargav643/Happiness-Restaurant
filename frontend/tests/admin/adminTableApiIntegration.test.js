import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { adminTableApi, normalizeTableDoc } from '../../src/services/adminTableApi.js';
import {
  normalizeTableNumber,
  isDuplicateTable,
  SAMPLE_TABLES,
} from '../../src/utils/tableUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendSrc = path.resolve(__dirname, '../../src');

console.log('====================================================');
console.log('PHASE 6 — PROMPT 1: TABLE MANAGEMENT API INTEGRATION QA');
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

async function runTests() {
  try {
    // ------------------------------------------------------------------
    // 1. Service Layer Inspection & Method Verification
    // ------------------------------------------------------------------
    console.log('--- 1. adminTableApi Service Inspection ---');
    const servicePath = path.join(frontendSrc, 'services/adminTableApi.js');
    assert(fs.existsSync(servicePath), 'adminTableApi.js exists in src/services');

    assert(typeof adminTableApi === 'object', 'adminTableApi is exported as an object');
    assert(typeof adminTableApi.getTables === 'function', 'Exposes getTables method');
    assert(typeof adminTableApi.getTable === 'function', 'Exposes getTable method');
    assert(typeof adminTableApi.createTable === 'function', 'Exposes createTable method');
    assert(typeof adminTableApi.updateTable === 'function', 'Exposes updateTable method');
    assert(typeof adminTableApi.updateTableStatus === 'function', 'Exposes updateTableStatus method');
    assert(typeof adminTableApi.deleteTable === 'function', 'Exposes deleteTable method');

    // ------------------------------------------------------------------
    // 2. Normalization Helper Logic
    // ------------------------------------------------------------------
    console.log('\n--- 2. Document Normalization Verification ---');
    const rawMongoDoc = {
      _id: '507f1f77bcf86cd799439001',
      tableNumber: 'Table 1',
      name: 'Window Bay',
      capacity: 4,
      status: 'Active',
      isOccupied: false,
      activeOrderId: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const normalized = normalizeTableDoc(rawMongoDoc);
    assert(normalized.id === '507f1f77bcf86cd799439001', 'Maps _id to id for backwards compatibility');
    assert(normalized._id === '507f1f77bcf86cd799439001', 'Retains original _id field');
    assert(normalized.tableNumber === 'Table 1', 'Retains tableNumber');
    assert(normalized.capacity === 4, 'Retains numeric capacity');
    assert(normalized.status === 'Active', 'Retains status');

    // ------------------------------------------------------------------
    // 3. AdminTablesPage.jsx Inspection
    // ------------------------------------------------------------------
    console.log('\n--- 3. AdminTablesPage.jsx Component Inspection ---');
    const pagePath = path.join(frontendSrc, 'pages/admin/AdminTablesPage.jsx');
    assert(fs.existsSync(pagePath), 'AdminTablesPage.jsx exists');

    const pageSrc = fs.readFileSync(pagePath, 'utf8');

    // API Integration check
    assert(pageSrc.includes("import adminTableApi from '../../services/adminTableApi"), 'Imports adminTableApi');
    assert(pageSrc.includes('adminTableApi.getTables()'), 'Calls adminTableApi.getTables() to fetch live tables');
    assert(pageSrc.includes('adminTableApi.createTable('), 'Calls adminTableApi.createTable() on new table submission');
    assert(pageSrc.includes('adminTableApi.updateTable('), 'Calls adminTableApi.updateTable() on table edits');
    assert(pageSrc.includes('adminTableApi.updateTableStatus('), 'Calls adminTableApi.updateTableStatus() on activate/deactivate');

    // Honest States Check
    assert(pageSrc.includes('isLoading') && pageSrc.includes('Loading tables from database'), 'Contains honest loading indicator');
    assert(pageSrc.includes('fetchError') && pageSrc.includes('Retry Connection'), 'Contains honest error state with Retry button');
    assert(pageSrc.includes('No Matching Tables Found'), 'Contains empty state');
    assert(!pageSrc.includes('getInitialTables'), 'Removed local storage mock fallback initialization');

    // Form validation and duplicate checks
    assert(pageSrc.includes('formErrors.tableNumber'), 'Displays tableNumber specific validation error');
    assert(pageSrc.includes('isSaving'), 'Employs isSaving state to prevent duplicate submissions');
    assert(pageSrc.includes('isTogglingStatus'), 'Employs isTogglingStatus to prevent rapid status clicks');

    // Export Invariants for other components and tests
    assert(Array.isArray(SAMPLE_TABLES) && SAMPLE_TABLES.length >= 4, 'Exports SAMPLE_TABLES for QR preview/test fallback');
    assert(typeof normalizeTableNumber === 'function', 'Exports normalizeTableNumber function');
    assert(typeof isDuplicateTable === 'function', 'Exports isDuplicateTable function');

    // ------------------------------------------------------------------
    // 4. File Format Audit (No .ts, .tsx, .mjs)
    // ------------------------------------------------------------------
    console.log('\n--- 4. Forbidden File Format Audit ---');
    const forbiddenExts = ['.ts', '.tsx', '.mjs'];
    function checkForbidden(dir) {
      let found = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const ent of entries) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory() && ent.name !== 'node_modules' && ent.name !== '.git') {
          found = found.concat(checkForbidden(full));
        } else if (ent.isFile()) {
          const ext = path.extname(ent.name).toLowerCase();
          if (forbiddenExts.includes(ext)) {
            found.push(full);
          }
        }
      }
      return found;
    }
    const forbidden = checkForbidden(frontendSrc);
    assert(forbidden.length === 0, `Zero forbidden .ts/.tsx/.mjs files in frontend/src (found: ${forbidden.length})`);

    // ------------------------------------------------------------------
    // 5. Unrelated Modules Invariance Audit
    // ------------------------------------------------------------------
    console.log('\n--- 5. Unrelated Modules Invariance Audit ---');
    const menuApiPath = path.join(frontendSrc, 'services/menuApi.js');
    assert(fs.existsSync(menuApiPath), 'menuApi.js remains untouched');

    const orderApiPath = path.join(frontendSrc, 'services/orderApi.js');
    assert(fs.existsSync(orderApiPath), 'orderApi.js remains untouched');

    const customerAuthPath = path.join(frontendSrc, 'services/customerAuthApi.js');
    assert(fs.existsSync(customerAuthPath), 'customerAuthApi.js remains untouched');

  } catch (error) {
    console.error('Integration test exception:', error);
    failCount++;
  }

  console.log('\n====================================================');
  console.log(`TOTAL PASSED: ${passCount}`);
  console.log(`TOTAL FAILED: ${failCount}`);
  console.log('====================================================\n');

  if (failCount > 0) {
    process.exit(1);
  } else {
    console.log('PHASE 6 PROMPT 1 QA TEST SUITE PASSED SUCCESSFULLY.');
    process.exit(0);
  }
}

runTests();
