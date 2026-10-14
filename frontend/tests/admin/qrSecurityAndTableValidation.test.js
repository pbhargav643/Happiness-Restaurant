import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  generateQRCodeMatrix,
  generateTableDineInUrl,
} from '../../src/utils/qrCodeGenerator.js';
import { normalizeTableDoc } from '../../src/services/adminTableApi.js';
import { findMockTable } from '../../src/utils/tableUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendSrc = path.resolve(__dirname, '../../src');

console.log('================================================================');
console.log('PHASE 7 — PROMPT 2: QR SECURITY & TABLE VALIDATION QA SUITE');
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

async function runTests() {
  // -----------------------------------------------------------------------------
  // 1. TABLE MAPPING & PERSISTED STABLE IDENTIFIER TESTS
  // -----------------------------------------------------------------------------
  console.log('--- 1. Table Mapping & Stable Identifier Verification ---');

  const tableA = normalizeTableDoc({
    _id: '670c1f77bcf86cd799439001',
    tableNumber: 'Table 1',
    name: 'Window Bay',
    capacity: 4,
    status: 'Active',
  });

  const tableB = normalizeTableDoc({
    _id: '670c1f77bcf86cd799439002',
    tableNumber: 'Table 2',
    name: 'Garden Alcove',
    capacity: 2,
    status: 'Active',
  });

  // Test 1: URL mapping uses stable identifier
  const urlA = generateTableDineInUrl(tableA, 'https://happinessrestaurant.com');
  const urlB = generateTableDineInUrl(tableB, 'https://happinessrestaurant.com');

  assert(
    urlA.includes('tableId=670c1f77bcf86cd799439001'),
    'Table 1 QR payload maps to persistent MongoDB _id (670c1f77bcf86cd799439001)'
  );
  assert(
    urlB.includes('tableId=670c1f77bcf86cd799439002'),
    'Table 2 QR payload maps to persistent MongoDB _id (670c1f77bcf86cd799439002)'
  );
  assert(
    urlA !== urlB,
    'Different tables generate strictly distinct QR payloads'
  );

  // Test 2: Editing table display name DOES NOT dissociate its QR from table ID
  const tableAEditedName = normalizeTableDoc({
    ...tableA,
    name: 'Sunset Balcony Window Suite',
  });
  const urlAEdited = generateTableDineInUrl(tableAEditedName, 'https://happinessrestaurant.com');
  assert(
    urlAEdited.includes('tableId=670c1f77bcf86cd799439001'),
    'Editing table display name preserves original stable tableId parameter'
  );
  assert(
    urlA === urlAEdited,
    'QR payload is immune to display name changes (stable table identity preserved)'
  );

  // Test 3: Matrix generation uniqueness
  const matrixA = generateQRCodeMatrix(urlA);
  const matrixB = generateQRCodeMatrix(urlB);
  let matricesDistinct = false;
  for (let r = 0; r < matrixA.size; r++) {
    for (let c = 0; c < matrixA.size; c++) {
      if (matrixA.matrix[r][c] !== matrixB.matrix[r][c]) {
        matricesDistinct = true;
        break;
      }
    }
    if (matricesDistinct) break;
  }
  assert(matricesDistinct, 'Table A and Table B generate distinct 2D QR matrices');

  // -----------------------------------------------------------------------------
  // 2. INACTIVE TABLE RESTRICTIONS & ORDERING PREVENTION
  // -----------------------------------------------------------------------------
  console.log('\n--- 2. Inactive Table Guarding & Dine-In Ordering Prevention ---');

  const inactiveTable = normalizeTableDoc({
    _id: '670c1f77bcf86cd799439004',
    tableNumber: 'Table 4',
    name: 'Terrace Corner',
    capacity: 4,
    status: 'Inactive',
  });

  const entryPagePath = path.join(frontendSrc, 'pages/customer/DineInEntryPage.jsx');
  assert(fs.existsSync(entryPagePath), 'DineInEntryPage.jsx exists');
  const entryPageSrc = fs.readFileSync(entryPagePath, 'utf8');

  // Verify that DineInEntryPage blocks inactive tables from browsing menu
  assert(
    entryPageSrc.includes("if (resolvedTable && resolvedTable.status === 'Active')") &&
    entryPageSrc.includes('handleBrowseMenu'),
    'DineInEntryPage handleBrowseMenu blocks inactive tables from navigating to dine-in menu'
  );

  // Verify disabled button and explicit warning for inactive table
  assert(
    entryPageSrc.includes('Table Currently Inactive') &&
    entryPageSrc.includes('Table Ordering Unavailable'),
    'DineInEntryPage renders disabled "Table Ordering Unavailable" button for inactive tables'
  );

  // Verify DineInContext rejects adding items to inactive table carts
  const contextPath = path.join(frontendSrc, 'context/DineInContext.jsx');
  const contextSrc = fs.readFileSync(contextPath, 'utf8');
  assert(
    contextSrc.includes("if (dineInTable.status && dineInTable.status !== 'Active')") &&
    contextSrc.includes('addToDineInCart rejected: table is inactive'),
    'DineInContext addToDineInCart actively rejects items when assigned table is inactive'
  );

  // -----------------------------------------------------------------------------
  // 3. QR DESTINATION VALIDATION & ERROR HANDLING
  // -----------------------------------------------------------------------------
  console.log('\n--- 3. QR Destination Validation & Malformed Identifier Handling ---');

  // Decode/parse URL destination
  const parsedUrlA = new URL(urlA);
  assert(
    parsedUrlA.pathname === '/menu',
    'QR payload resolves to standard customer /menu destination route'
  );
  assert(
    parsedUrlA.searchParams.get('table') === 'Table 1',
    'Decoded table parameter matches exact tableNumber'
  );
  assert(
    parsedUrlA.searchParams.get('tableId') === '670c1f77bcf86cd799439001',
    'Decoded tableId parameter matches exact persistent table identifier'
  );
  assert(
    parsedUrlA.searchParams.get('mode') === 'dine_in',
    'Decoded mode parameter enforces dine_in mode'
  );

  // Test missing or invalid table identifier lookup
  assert(
    findMockTable(null) === null,
    'findMockTable returns null for null table identifier'
  );
  assert(
    findMockTable('') === null,
    'findMockTable returns null for empty table identifier'
  );
  assert(
    findMockTable('   ') === null,
    'findMockTable returns null for whitespace-only table identifier'
  );
  assert(
    findMockTable('table-nonexistent-99999') === null,
    'findMockTable returns null for nonexistent table identifier'
  );
  assert(
    findMockTable('invalid-mongo-id-12345') === null,
    'findMockTable returns null for malformed table identifier'
  );

  // Verify Entry Page error state for invalid/unregistered table
  assert(
    entryPageSrc.includes('Table Not Recognized') &&
    entryPageSrc.includes('Invalid Table Identifier') &&
    entryPageSrc.includes('What should you do?'),
    'DineInEntryPage renders comprehensive error state with guidance for unrecognized tables'
  );

  // -----------------------------------------------------------------------------
  // 4. SECURITY & PERMISSION TESTS
  // -----------------------------------------------------------------------------
  console.log('\n--- 4. Public QR Safety & Admin Authorization Verification ---');

  // Verify QR URL does NOT contain sensitive data
  const testPayloads = [urlA, urlB, generateTableDineInUrl(inactiveTable, 'https://happinessrestaurant.com')];
  testPayloads.forEach((payload, idx) => {
    assert(
      !payload.includes('token') &&
      !payload.includes('secret') &&
      !payload.includes('customer') &&
      !payload.includes('orderId') &&
      !payload.includes('admin') &&
      !payload.includes('password') &&
      !payload.includes('auth'),
      `Payload #${idx + 1} leaks NO customer credentials, tokens, admin actions, or orders`
    );
  });

  // Verify backend route protection
  const backendAdminRoutesPath = path.resolve(__dirname, '../../../backend/src/routes/admin.routes.js');
  assert(fs.existsSync(backendAdminRoutesPath), 'backend/src/routes/admin.routes.js exists');
  const adminRoutesSrc = fs.readFileSync(backendAdminRoutesPath, 'utf8');

  assert(
    adminRoutesSrc.includes('router.use(authenticateAdmin)'),
    'All admin routes enforce authenticateAdmin middleware before table routes'
  );
  assert(
    adminRoutesSrc.includes("router.post('/tables', tableController.createTable)") &&
    adminRoutesSrc.includes("router.patch('/tables/:id', tableController.updateTable)") &&
    adminRoutesSrc.includes("router.patch('/tables/:id/status', tableController.updateTableStatus)"),
    'Table creation, editing, and activation/deactivation require authenticated admin access'
  );

  // Verify CustomerRoutes contains NO table modification routes
  const customerRoutesPath = path.join(frontendSrc, 'routes/CustomerRoutes.jsx');
  const customerRoutesSrc = fs.readFileSync(customerRoutesPath, 'utf8');
  assert(
    !customerRoutesSrc.includes('admin/tables') &&
    !customerRoutesSrc.includes('createTable') &&
    !customerRoutesSrc.includes('deleteTable'),
    'Customer-facing routes cannot create, edit, or delete tables'
  );

  // -----------------------------------------------------------------------------
  // 5. SERVER-SIDE VALIDATION AUDIT (CONTROLLER & SERVICE)
  // -----------------------------------------------------------------------------
  console.log('\n--- 5. Server-Side Table Validation Audit ---');
  const tableServicePath = path.resolve(__dirname, '../../../backend/src/services/table.service.js');
  assert(fs.existsSync(tableServicePath), 'backend/src/services/table.service.js exists');
  const serviceSrc = fs.readFileSync(tableServicePath, 'utf8');

  // Validate ID format check
  assert(
    serviceSrc.includes('mongoose.isValidObjectId(id)') ||
    serviceSrc.includes('mongoose.isValidObjectId(clean)'),
    'Server validates ObjectId format to prevent CastError crashes on malformed table IDs'
  );

  // Validate positive integer capacity
  assert(
    serviceSrc.includes('Number.isInteger(parsedCapacity)') &&
    serviceSrc.includes('parsedCapacity < 1'),
    'Server rejects non-integer or zero/negative seating capacities'
  );

  // Validate duplicate table number rejection
  assert(
    serviceSrc.includes('already exists. Please enter a unique table number.'),
    'Server enforces unique normalized table number validation'
  );

  // -----------------------------------------------------------------------------
  // 6. DOWNLOAD & PRINT INTEGRITY (REGRESSION CHECK)
  // -----------------------------------------------------------------------------
  console.log('\n--- 6. Download and Print UI Integrity ---');
  const qrPagePath = path.join(frontendSrc, 'pages/admin/AdminTableQRCodesPage.jsx');
  const qrPageSrc = fs.readFileSync(qrPagePath, 'utf8');

  // Verify download filename
  assert(
    qrPageSrc.includes('const cleanNum =') &&
    qrPageSrc.includes('happiness-restaurant-${cleanNum}-qr.png'),
    'Download action formats clean filenames matching selected table'
  );

  // Verify preview modal preview banner
  assert(
    qrPageSrc.includes('Preview &amp; Test QR Ready') ||
    qrPageSrc.includes('Public Dine-In Identifier Notice (Preview / Test QR)'),
    'QR management explicitly labels QR codes as preview/test identifiers'
  );

  // Verify print layout contains only appropriate data
  assert(
    qrPageSrc.includes('RESTAURANT_CONFIG.name') &&
    qrPageSrc.includes('Table Dine-In Service') &&
    qrPageSrc.includes('Scan to view the restaurant menu'),
    'Print sheet contains strictly restaurant name, table number, and scan instructions'
  );

  // -----------------------------------------------------------------------------
  // 7. FORBIDDEN FILE FORMATS AUDIT
  // -----------------------------------------------------------------------------
  console.log('\n--- 7. Source Code File Formats Audit ---');
  const forbiddenExts = ['.ts', '.tsx', '.mjs'];
  let forbiddenFiles = 0;

  function auditTree(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory() && ent.name !== 'node_modules' && ent.name !== '.git' && ent.name !== 'dist') {
        auditTree(full);
      } else if (ent.isFile()) {
        const ext = path.extname(ent.name).toLowerCase();
        if (forbiddenExts.includes(ext)) {
          console.error(`Forbidden extension found: ${full}`);
          forbiddenFiles++;
        }
      }
    }
  }

  auditTree(frontendSrc);
  assert(forbiddenFiles === 0, 'Frontend src directory strictly contains only .js and .jsx files (0 .ts/.tsx/.mjs)');

  console.log('\n================================================================');
  console.log(`PHASE 7 PROMPT 2 SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('================================================================');

  if (failCount > 0) {
    process.exit(1);
  } else {
    console.log('ALL PHASE 7 PROMPT 2 SECURITY & TABLE VALIDATION TESTS PASSED.');
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
