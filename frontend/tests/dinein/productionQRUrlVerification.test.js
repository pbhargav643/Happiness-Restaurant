import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  generateQRCodeMatrix,
  generateTableDineInUrl,
  getDefaultQRBaseUrl,
  PRODUCTION_QR_BASE_URL,
  isLocalOrPrivateHost,
} from '../../src/utils/qrCodeGenerator.js';
import { findMockTable, DEFAULT_MOCK_TABLES } from '../../src/utils/tableUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('================================================================');
console.log('QA SUITE: PRODUCTION TABLE QR URL VERIFICATION');
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
  // ---------------------------------------------------------------------------
  // 1. PRODUCTION DOMAIN CONSTANT & PRIVATE HOST DETECTION
  // ---------------------------------------------------------------------------
  console.log('--- 1. Production Domain Constant & Guard Rules ---');

  assert(
    PRODUCTION_QR_BASE_URL === 'https://happiness-restaurant-three.vercel.app',
    `PRODUCTION_QR_BASE_URL is strictly "https://happiness-restaurant-three.vercel.app"`
  );

  assert(isLocalOrPrivateHost('localhost') === true, 'isLocalOrPrivateHost identifies "localhost"');
  assert(isLocalOrPrivateHost('http://localhost:3000') === true, 'isLocalOrPrivateHost identifies "http://localhost:3000"');
  assert(isLocalOrPrivateHost('http://127.0.0.1:3000') === true, 'isLocalOrPrivateHost identifies "http://127.0.0.1:3000"');
  assert(isLocalOrPrivateHost('http://192.168.31.94:3000') === true, 'isLocalOrPrivateHost identifies local Wi-Fi IP "192.168.31.94:3000"');
  assert(isLocalOrPrivateHost('https://happiness-restaurant-three.vercel.app') === false, 'isLocalOrPrivateHost allows public domain "https://happiness-restaurant-three.vercel.app"');

  // ---------------------------------------------------------------------------
  // 2. PRODUCTION VS DEVELOPMENT BASE URL RESOLUTION
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Base URL Resolution Tests ---');

  // Scenario 2.1: In production mode, local IP in VITE_QR_BASE_URL is rejected
  process.env.NODE_ENV = 'production';
  process.env.VITE_QR_BASE_URL = 'http://192.168.31.94:3000';
  const prodBaseFromLocalIp = getDefaultQRBaseUrl();
  assert(
    prodBaseFromLocalIp === 'https://happiness-restaurant-three.vercel.app',
    `In production, local IP is rejected and strictly defaults to: "${prodBaseFromLocalIp}"`
  );

  // Scenario 2.2: In production mode with no env var set
  delete process.env.VITE_QR_BASE_URL;
  const prodBaseDefault = getDefaultQRBaseUrl();
  assert(
    prodBaseDefault === 'https://happiness-restaurant-three.vercel.app',
    `In production with no env var, defaults to: "${prodBaseDefault}"`
  );

  // Scenario 2.3: In development mode without explicit local mode, safely defaults to production domain
  process.env.NODE_ENV = 'development';
  delete process.env.VITE_QR_MODE;
  assert(
    getDefaultQRBaseUrl() === 'https://happiness-restaurant-three.vercel.app',
    'In development mode without local flag, safely defaults to production domain'
  );

  // Scenario 2.4: Dedicated local Wi-Fi URL strategy via getDevQRBaseUrl()
  process.env.VITE_DEV_QR_BASE_URL = 'http://192.168.31.94:3000';
  const devBaseUrl = getDevQRBaseUrl();
  assert(
    devBaseUrl === 'http://192.168.31.94:3000',
    `getDevQRBaseUrl() retains working local network URL for testing: "${devBaseUrl}"`
  );

  // Scenario 2.5: In development with explicit VITE_QR_MODE=development, respects local IP
  process.env.VITE_QR_MODE = 'development';
  process.env.VITE_QR_BASE_URL = 'http://192.168.31.94:3000';
  assert(
    getDefaultQRBaseUrl() === 'http://192.168.31.94:3000',
    'With VITE_QR_MODE=development, explicitly allows local IP for Wi-Fi testing'
  );

  // ---------------------------------------------------------------------------
  // 3. TABLE QR GENERATION FOR ALL INDIVIDUAL TABLES (PRODUCTION DOMAIN)
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Production QR Generation per Table ---');

  // Set to production mode
  process.env.NODE_ENV = 'production';
  delete process.env.VITE_QR_BASE_URL;

  const testTables = [
    { tableNumber: 'Table 1', id: '6acf10d3dccf0ac3ae1ebecc', name: 'Window Bay' },
    { tableNumber: 'Table 2', id: '6acf10d3dccf0ac3ae1ebecd', name: 'Garden Alcove' },
    { tableNumber: 'Table 3', id: '6acf10d3dccf0ac3ae1ebece', name: 'Family Central' },
    { tableNumber: 'Table 4', id: '6acf10d3dccf0ac3ae1ebecf', name: 'Terrace Corner' },
    { tableNumber: 'Table 5', id: '507f1f77bcf86cd799439005', name: 'Corner Booth' },
  ];

  const generatedUrls = new Map();

  for (const tbl of testTables) {
    const url = generateTableDineInUrl(tbl);
    assert(
      url !== null,
      `Generated QR URL for ${tbl.tableNumber}`
    );
    assert(
      url.startsWith('https://happiness-restaurant-three.vercel.app/menu?'),
      `${tbl.tableNumber} QR uses production domain: "${url}"`
    );
    assert(
      url.includes(`table=${encodeURIComponent(tbl.tableNumber)}`),
      `${tbl.tableNumber} QR encodes actual tableNumber parameter: "table=${encodeURIComponent(tbl.tableNumber)}"`
    );
    assert(
      url.includes(`tableId=${tbl.id}`),
      `${tbl.tableNumber} QR encodes actual stable tableId parameter: "tableId=${tbl.id}"`
    );
    assert(
      url.includes('mode=dine_in'),
      `${tbl.tableNumber} QR specifies mode=dine_in`
    );
    assert(
      !url.includes('localhost') && !url.includes('192.168.'),
      `${tbl.tableNumber} QR does NOT contain localhost or local IP`
    );

    generatedUrls.set(tbl.tableNumber, url);
  }

  // Verify all URLs are unique and distinct
  const uniqueUrls = new Set(generatedUrls.values());
  assert(
    uniqueUrls.size === testTables.length,
    `Every table produces a unique, distinct production QR URL (${uniqueUrls.size}/${testTables.length})`
  );

  // ---------------------------------------------------------------------------
  // 4. MENU & DINE-IN DESTINATION DECODING & ACTIVE TABLE IDENTIFICATION
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Customer URL Decoding & Table Identification ---');

  for (const tbl of testTables) {
    const qrUrl = generatedUrls.get(tbl.tableNumber);
    const parsedUrl = new URL(qrUrl);

    assert(
      parsedUrl.origin === 'https://happiness-restaurant-three.vercel.app',
      `Parsed origin is strictly https://happiness-restaurant-three.vercel.app`
    );
    assert(
      parsedUrl.pathname === '/menu',
      `Destination path is "/menu"`
    );

    const decodedTableNumber = parsedUrl.searchParams.get('table');
    const decodedTableId = parsedUrl.searchParams.get('tableId');
    const decodedMode = parsedUrl.searchParams.get('mode');

    assert(
      decodedTableNumber === tbl.tableNumber,
      `searchParams.get('table') correctly extracts "${tbl.tableNumber}"`
    );
    assert(
      decodedTableId === tbl.id,
      `searchParams.get('tableId') correctly extracts "${tbl.id}"`
    );
    assert(
      decodedMode === 'dine_in',
      `searchParams.get('mode') is "dine_in"`
    );

    // Verify table resolution logic in DineInEntryPage
    const resolvedTable = findMockTable(decodedTableId) || findMockTable(decodedTableNumber);
    assert(
      resolvedTable !== null && resolvedTable.tableNumber === tbl.tableNumber,
      `Table resolver accurately recognizes active table: ${resolvedTable?.tableNumber}`
    );
  }

  // ---------------------------------------------------------------------------
  // 5. 2D OPTICAL MATRIX VERIFICATION
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Optical 2D QR Matrix Verification ---');

  const table1Url = generatedUrls.get('Table 1');
  const matrixObj = generateQRCodeMatrix(table1Url);
  assert(
    matrixObj && matrixObj.size > 0 && Array.isArray(matrixObj.matrix),
    'Successfully generated valid 2D matrix for production QR URL'
  );

  const size = matrixObj.size;
  assert(
    matrixObj.matrix[size - 8][8] === true,
    `Permanent black Dark Module at (${size - 8}, 8) is TRUE (black)`
  );

  // ---------------------------------------------------------------------------
  // 6. DATABASE REGENERATION & STORAGE AUDIT
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. Database Storage Audit ---');

  const tableModelPath = path.resolve(__dirname, '../../../backend/src/models/Table.js');
  assert(fs.existsSync(tableModelPath), 'Table.js model exists');
  const tableModelSrc = fs.readFileSync(tableModelPath, 'utf8');

  assert(
    !tableModelSrc.includes('qrCode') &&
    !tableModelSrc.includes('qrUrl') &&
    !tableModelSrc.includes('qrMatrix'),
    'Database Table model stores zero QR images or URLs (QR codes are 100% dynamic, zero DB modification needed)'
  );

  console.log('\n================================================================');
  console.log(`TOTAL RESULTS: ${passCount} Passed, ${failCount} Failed`);
  console.log('================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();
