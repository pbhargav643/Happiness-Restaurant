import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  generateQRCodeMatrix,
  generateTableDineInUrl,
  getDefaultQRBaseUrl,
  getDevQRBaseUrl,
  PRODUCTION_QR_BASE_URL,
} from '../../src/utils/qrCodeGenerator.js';
import { normalizeTableDoc } from '../../src/services/adminTableApi.js';
import { findMockTable } from '../../src/utils/tableUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '../..');

console.log('================================================================');
console.log('HAPPINESS RESTAURANT — QR DESTINATION RESOLUTION QA VERIFICATION');
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
  // 1. CONFIGURATION VERIFICATION (Vite & Environment Files)
  // -----------------------------------------------------------------------------
  console.log('--- 1. Vite & Environment Configuration Verification ---');

  // Verify vite.config.js contains host: true
  const viteConfigPath = path.join(frontendDir, 'vite.config.js');
  assert(fs.existsSync(viteConfigPath), 'vite.config.js exists');
  const viteConfigSrc = fs.readFileSync(viteConfigPath, 'utf8');
  assert(
    viteConfigSrc.includes('host: true') || viteConfigSrc.includes("host: '0.0.0.0'"),
    'vite.config.js configures server.host for local network access'
  );

  // Verify .env contains production base URL
  const envPath = path.join(frontendDir, '.env');
  assert(fs.existsSync(envPath), 'frontend/.env exists');
  const envSrc = fs.readFileSync(envPath, 'utf8');
  assert(
    envSrc.includes('VITE_QR_BASE_URL=https://happiness-restaurant-three.vercel.app'),
    'frontend/.env configures VITE_QR_BASE_URL=https://happiness-restaurant-three.vercel.app'
  );

  // Verify .env.example documents VITE_QR_BASE_URL
  const envExamplePath = path.join(frontendDir, '.env.example');
  assert(fs.existsSync(envExamplePath), 'frontend/.env.example exists');
  const envExampleSrc = fs.readFileSync(envExamplePath, 'utf8');
  assert(
    envExampleSrc.includes('VITE_QR_BASE_URL='),
    'frontend/.env.example documents VITE_QR_BASE_URL'
  );

  // -----------------------------------------------------------------------------
  // 2. BASE URL RESOLUTION TESTS (Development vs Production Separation)
  // -----------------------------------------------------------------------------
  console.log('\n--- 2. Base URL Resolution Tests ---');

  // Test 2.1: In development, defaults safely to production domain unless explicit local mode is set
  process.env.NODE_ENV = 'development';
  process.env.VITE_QR_BASE_URL = 'https://happiness-restaurant-three.vercel.app';
  delete process.env.VITE_QR_MODE;
  const devBaseUrl = getDefaultQRBaseUrl();
  assert(
    devBaseUrl === 'https://happiness-restaurant-three.vercel.app',
    `In development, getDefaultQRBaseUrl() resolves to production domain: "${devBaseUrl}"`
  );

  // Test 2.2: Dedicated local testing helper getDevQRBaseUrl()
  process.env.VITE_DEV_QR_BASE_URL = 'http://192.168.31.94:3000';
  const localDevUrl = getDevQRBaseUrl();
  assert(
    localDevUrl === 'http://192.168.31.94:3000',
    `getDevQRBaseUrl() resolves to local Wi-Fi IP: "${localDevUrl}"`
  );

  // Test 2.3: Production resolution rejects local IP and falls back to production domain
  process.env.NODE_ENV = 'production';
  process.env.VITE_QR_BASE_URL = 'http://192.168.31.94:3000'; // Accidental dev IP in prod
  const prodBaseUrl = getDefaultQRBaseUrl();
  assert(
    prodBaseUrl === 'https://happiness-restaurant-three.vercel.app',
    `In production, local IP is strictly rejected and falls back to: "${prodBaseUrl}"`
  );

  // Test 2.4: Production resolution accepts valid production domain
  process.env.VITE_QR_BASE_URL = 'https://order.happinessrestaurant.com';
  const customProdBaseUrl = getDefaultQRBaseUrl();
  assert(
    customProdBaseUrl === 'https://order.happinessrestaurant.com',
    `In production, valid custom domain is respected: "${customProdBaseUrl}"`
  );

  // Reset back to dev
  process.env.NODE_ENV = 'development';
  delete process.env.VITE_QR_MODE;
  process.env.VITE_QR_BASE_URL = 'https://happiness-restaurant-three.vercel.app';

  // -----------------------------------------------------------------------------
  // 3. TABLE QR GENERATION WITH DEVELOPMENT NETWORK DESTINATION
  // -----------------------------------------------------------------------------
  console.log('\n--- 3. Table QR Generation With Network Destination ---');

  const testTable1 = normalizeTableDoc({
    _id: '507f1f77bcf86cd799439001',
    tableNumber: 'Table 1',
    name: 'Window Bay',
    capacity: 4,
    status: 'Active',
  });

  const testTable2 = normalizeTableDoc({
    _id: '507f1f77bcf86cd799439002',
    tableNumber: 'Table 2',
    name: 'Garden Alcove',
    capacity: 2,
    status: 'Active',
  });

  // Test 3.1: Generate QR URL using default base URL (defaults strictly to production domain)
  const defaultUrl1 = generateTableDineInUrl(testTable1);
  assert(
    defaultUrl1.startsWith('https://happiness-restaurant-three.vercel.app/menu?'),
    `QR URL 1 uses production destination: "${defaultUrl1}"`
  );
  assert(
    defaultUrl1.includes('table=Table%201'),
    'QR URL 1 encodes table number "Table 1"'
  );
  assert(
    defaultUrl1.includes('tableId=507f1f77bcf86cd799439001'),
    'QR URL 1 encodes stable persistent identifier "507f1f77bcf86cd799439001"'
  );
  assert(
    defaultUrl1.includes('mode=dine_in'),
    'QR URL 1 specifies mode=dine_in'
  );
  assert(
    !defaultUrl1.includes('localhost') && !defaultUrl1.includes('192.168.'),
    'QR URL 1 does NOT contain "localhost" or local IP'
  );

  const defaultUrl2 = generateTableDineInUrl(testTable2);
  assert(
    defaultUrl2.startsWith('https://happiness-restaurant-three.vercel.app/menu?'),
    `QR URL 2 uses production destination: "${defaultUrl2}"`
  );
  assert(
    defaultUrl2.includes('table=Table%202') && defaultUrl2.includes('tableId=507f1f77bcf86cd799439002'),
    'QR URL 2 encodes Table 2 with persistent tableId'
  );
  assert(
    defaultUrl1 !== defaultUrl2,
    'Different tables produce distinct production QR URLs'
  );

  // Test 3.2: Explicit customBaseUrl override (local Wi-Fi testing) is respected
  const devOverrideUrl = generateTableDineInUrl(testTable1, getDevQRBaseUrl());
  assert(
    devOverrideUrl.startsWith('http://192.168.31.94:3000/menu?'),
    `Explicit dev network override produces: "${devOverrideUrl}"`
  );

  // Test 3.3: Empty customBaseUrl returns null
  const emptyResult = generateTableDineInUrl(testTable1, '');
  assert(
    emptyResult === null,
    'Empty customBaseUrl returns null'
  );

  // -----------------------------------------------------------------------------
  // 4. DECODING & TABLE RESOLUTION VERIFICATION
  // -----------------------------------------------------------------------------
  console.log('\n--- 4. Decoded URL Table Resolution Verification ---');

  const parsedUrl = new URL(defaultUrl1);
  assert(parsedUrl.pathname === '/menu', 'Decoded destination pathname is "/menu"');
  assert(parsedUrl.hostname === 'happiness-restaurant-three.vercel.app', 'Decoded hostname is "happiness-restaurant-three.vercel.app"');
  assert(parsedUrl.protocol === 'https:', 'Decoded protocol is "https:"');

  const decodedTableNum = parsedUrl.searchParams.get('table');
  const decodedTableId = parsedUrl.searchParams.get('tableId');
  const decodedMode = parsedUrl.searchParams.get('mode');

  assert(decodedTableNum === 'Table 1', 'searchParams.get("table") resolves to "Table 1"');
  assert(decodedTableId === '507f1f77bcf86cd799439001', 'searchParams.get("tableId") resolves to "507f1f77bcf86cd799439001"');
  assert(decodedMode === 'dine_in', 'searchParams.get("mode") resolves to "dine_in"');

  // Verify that table can be identified from the decoded parameter
  const matchedTable = findMockTable(decodedTableNum);
  assert(
    matchedTable && matchedTable.tableNumber === 'Table 1',
    `Customer flow table identification resolves: ${matchedTable?.tableNumber} (${matchedTable?.name})`
  );

  // -----------------------------------------------------------------------------
  // 5. 2D MATRIX RENDERING
  // -----------------------------------------------------------------------------
  console.log('\n--- 5. 2D QR Matrix Generation ---');
  const matrix = generateQRCodeMatrix(defaultUrl1);
  assert(matrix && matrix.size > 0 && Array.isArray(matrix.matrix), 'Successfully generates valid 2D QR matrix for production URL');

  // -----------------------------------------------------------------------------
  // SUMMARY
  // -----------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`QA VERIFICATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('================================================================');

  if (failCount > 0) {
    process.exit(1);
  } else {
    console.log('ALL QR DESTINATION RESOLUTION TESTS PASSED.');
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
