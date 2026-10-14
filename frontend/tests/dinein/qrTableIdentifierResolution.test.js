import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  generateTableDineInUrl,
  generateQRCodeMatrix,
  getDefaultQRBaseUrl,
} from '../../src/utils/qrCodeGenerator.js';
import { findMockTable, DEFAULT_MOCK_TABLES } from '../../src/utils/tableUtils.js';
import { normalizeTableDoc } from '../../src/services/adminTableApi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('================================================================');
console.log('HAPPINESS RESTAURANT — QR TABLE IDENTIFIER RESOLUTION QA SUITE');
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

async function runAllTests() {
  // -----------------------------------------------------------------------------
  // 1. TABLE 5 RECORD & DATABASE IDENTIFIER INTEGRITY
  // -----------------------------------------------------------------------------
  console.log('--- 1. Table 5 Record & Identifier Integrity ---');

  const table5Record = normalizeTableDoc({
    _id: '507f1f77bcf86cd799439005',
    tableNumber: 'Table 5',
    normalizedNumber: '5',
    name: 'Corner Booth',
    capacity: 4,
    status: 'Active',
  });

  assert(table5Record !== null, 'Table 5 record normalized successfully');
  assert(table5Record._id === '507f1f77bcf86cd799439005', 'Table 5 has stable MongoDB _id "507f1f77bcf86cd799439005"');
  assert(table5Record.tableNumber === 'Table 5', 'Table 5 tableNumber is "Table 5"');
  assert(table5Record.status === 'Active', 'Table 5 status is "Active"');

  // Verify Table 5 resolution in mock registry
  const resolvedById = findMockTable('507f1f77bcf86cd799439005');
  assert(resolvedById !== null && resolvedById.tableNumber === 'Table 5', 'findMockTable resolves Table 5 by stable ID');

  const resolvedByNumber = findMockTable('Table 5');
  assert(resolvedByNumber !== null && resolvedByNumber.id === '507f1f77bcf86cd799439005', 'findMockTable resolves Table 5 by "Table 5"');

  const resolvedByCleanNum = findMockTable('5');
  assert(resolvedByCleanNum !== null && resolvedByCleanNum.tableNumber === 'Table 5', 'findMockTable resolves Table 5 by "5"');

  // -----------------------------------------------------------------------------
  // 2. TABLE 5 QR GENERATION & ENCODING
  // -----------------------------------------------------------------------------
  console.log('\n--- 2. Table 5 QR URL Generation & Optical Matrix ---');

  process.env.NODE_ENV = 'development';
  process.env.VITE_QR_MODE = 'development';
  process.env.VITE_QR_BASE_URL = 'http://192.168.31.94:3000';
  const table5QRUrl = generateTableDineInUrl(table5Record);

  assert(
    table5QRUrl.startsWith('http://192.168.31.94:3000/menu?'),
    `Table 5 QR points to development network URL: "${table5QRUrl}"`
  );
  assert(table5QRUrl.includes('table=Table%205'), 'Table 5 QR URL encodes "table=Table%205"');
  assert(
    table5QRUrl.includes('tableId=507f1f77bcf86cd799439005'),
    'Table 5 QR URL encodes stable database identifier "tableId=507f1f77bcf86cd799439005"'
  );
  assert(table5QRUrl.includes('mode=dine_in'), 'Table 5 QR URL specifies "mode=dine_in"');
  assert(!table5QRUrl.includes('localhost'), 'Table 5 QR URL does NOT contain "localhost"');

  // Verify optical 2D matrix compliance and Dark Module preservation
  const matrixObj = generateQRCodeMatrix(table5QRUrl);
  assert(matrixObj && matrixObj.size > 0, 'Generates valid 2D QR matrix for Table 5');
  const size = matrixObj.size;
  // Module at (size - 8, 8) must be the Dark Module (permanent black / true)
  assert(
    matrixObj.matrix[size - 8][8] === true,
    `Permanent black Dark Module at (${size - 8}, 8) is TRUE (not overwritten to white)`
  );

  // -----------------------------------------------------------------------------
  // 3. QR URL DECODING & PARAMETER RESOLUTION
  // -----------------------------------------------------------------------------
  console.log('\n--- 3. QR URL Destination Decoding & Table Resolution ---');

  const parsedUrl = new URL(table5QRUrl);
  assert(parsedUrl.pathname === '/menu', 'Destination pathname is "/menu"');
  assert(parsedUrl.hostname === '192.168.31.94', 'Destination hostname is "192.168.31.94"');

  const qTable = parsedUrl.searchParams.get('table');
  const qTableId = parsedUrl.searchParams.get('tableId');
  const qMode = parsedUrl.searchParams.get('mode');

  assert(qTable === 'Table 5', 'Decoded "table" parameter is "Table 5"');
  assert(qTableId === '507f1f77bcf86cd799439005', 'Decoded "tableId" parameter matches stable database _id');
  assert(qMode === 'dine_in', 'Decoded "mode" parameter is "dine_in"');

  // Verify resolution
  const matchedTable5 = findMockTable(qTableId) || findMockTable(qTable);
  assert(matchedTable5 !== null, 'Table 5 resolves from decoded QR query parameters');
  assert(matchedTable5.status === 'Active', 'Resolved Table 5 is marked Active');
  assert(matchedTable5.capacity === 4, 'Resolved Table 5 has capacity 4');

  // -----------------------------------------------------------------------------
  // 4. ACTIVE, INACTIVE, AND MISSING TABLE IDENTIFIERS
  // -----------------------------------------------------------------------------
  console.log('\n--- 4. Active, Inactive, and Missing Table Verification ---');

  // 4.1 Other active tables (Table 1, Table 2, Table 3)
  const t1 = findMockTable('Table 1');
  assert(t1 && t1.status === 'Active', 'Table 1 resolves and is Active');

  const t2 = findMockTable('Table 2');
  assert(t2 && t2.status === 'Active', 'Table 2 resolves and is Active');

  const t3 = findMockTable('Table 3');
  assert(t3 && t3.status === 'Active', 'Table 3 resolves and is Active');

  // 4.2 Inactive table (Table 4) remains blocked
  const t4 = findMockTable('Table 4');
  assert(t4 && t4.status === 'Inactive', 'Table 4 resolves and is Inactive');

  // 4.3 Missing identifier returns null
  assert(findMockTable(null) === null, 'Null table identifier returns null');
  assert(findMockTable('') === null, 'Empty table identifier returns null');
  assert(findMockTable('   ') === null, 'Whitespace table identifier returns null');

  // 4.4 Nonexistent / invalid identifier returns null
  assert(findMockTable('999') === null, 'Nonexistent table number "999" returns null');
  assert(findMockTable('table-nonexistent') === null, 'Unregistered table returns null');
  assert(findMockTable('invalid-mongo-id-123') === null, 'Invalid identifier returns null');

  // -----------------------------------------------------------------------------
  // 5. COMPONENT INSPECTION: DineInEntryPage, MenuPage, and Routes
  // -----------------------------------------------------------------------------
  console.log('\n--- 5. Frontend & Backend Codebase Inspection ---');

  // Check MenuPage.jsx
  const menuPagePath = path.resolve(__dirname, '../../src/pages/customer/MenuPage.jsx');
  const menuPageSrc = fs.readFileSync(menuPagePath, 'utf8');
  assert(
    menuPageSrc.includes("urlMode === 'dine_in'") &&
    menuPageSrc.includes("searchParams.get('table')") &&
    menuPageSrc.includes("searchParams.get('tableId')"),
    'MenuPage correctly extracts table and tableId parameters and transfers to Dine-in flow'
  );

  // Check DineInEntryPage.jsx
  const entryPagePath = path.resolve(__dirname, '../../src/pages/customer/DineInEntryPage.jsx');
  const entryPageSrc = fs.readFileSync(entryPagePath, 'utf8');
  assert(
    entryPageSrc.includes('tableApi'),
    'DineInEntryPage imports tableApi for live backend table resolution'
  );
  assert(
    entryPageSrc.includes('Table Not Recognized') && entryPageSrc.includes('Invalid Table Identifier'),
    'DineInEntryPage preserves explicit error state for missing/invalid table identifiers'
  );
  assert(
    entryPageSrc.includes("'(None provided)'"),
    'DineInEntryPage preserves "(None provided)" fallback when no identifier is supplied'
  );
  assert(
    entryPageSrc.includes('Table Currently Inactive'),
    'DineInEntryPage preserves Inactive table guard'
  );
  assert(
    entryPageSrc.includes('dineInTable'),
    'DineInEntryPage preserves active table across page refreshes via context'
  );

  // Check backend table routes
  const backendTableRoutesPath = path.resolve(__dirname, '../../../backend/src/routes/table.routes.js');
  assert(fs.existsSync(backendTableRoutesPath), 'backend/src/routes/table.routes.js exists');

  const backendAppPath = path.resolve(__dirname, '../../../backend/src/app.js');
  const backendAppSrc = fs.readFileSync(backendAppPath, 'utf8');
  assert(
    backendAppSrc.includes("app.use('/api/tables', tableRoutes)"),
    'backend/src/app.js mounts public /api/tables route'
  );

  // Check backend table service baseline
  const tableServicePath = path.resolve(__dirname, '../../../backend/src/services/table.service.js');
  const tableServiceSrc = fs.readFileSync(tableServicePath, 'utf8');
  assert(
    tableServiceSrc.includes("'507f1f77bcf86cd799439005'") && tableServiceSrc.includes("'Table 5'"),
    'backend table.service.js includes Table 5 in INITIAL_BASELINE_TABLES'
  );

  // -----------------------------------------------------------------------------
  // 6. SUMMARY
  // -----------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`QA VERIFICATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('================================================================');

  if (failCount > 0) {
    process.exit(1);
  } else {
    console.log('ALL QR TABLE IDENTIFIER RESOLUTION TESTS PASSED.');
  }
}

runAllTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
