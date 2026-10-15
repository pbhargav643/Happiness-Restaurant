import { createRequire } from 'module';
import {
  generateQRCodeMatrix,
  generateTableDineInUrl,
  getDefaultQRBaseUrl,
  PRODUCTION_QR_BASE_URL,
} from '../../src/utils/qrCodeGenerator.js';
import { findMockTable } from '../../src/utils/tableUtils.js';

const require = createRequire(import.meta.url);
const jsQR = require('../utils/jsQR.cjs');

console.log('================================================================');
console.log('HAPPINESS RESTAURANT — QR SCANNER OPTICAL DECODER VERIFICATION');
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

/**
 * Converts a QR boolean matrix into RGBA image data buffer
 * equivalent to CanvasRenderingContext2D.getImageData().
 */
function matrixToRgba(matrix, size, margin = 4, pixelSize = 8) {
  const totalModules = size + margin * 2;
  const imgWidth = totalModules * pixelSize;
  const imgHeight = totalModules * pixelSize;
  const data = new Uint8ClampedArray(imgWidth * imgHeight * 4);

  // Default entire canvas to pure white [255, 255, 255, 255] (quiet zone)
  data.fill(255);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) {
        // Dark module -> pure black [0, 0, 0, 255]
        const startX = (c + margin) * pixelSize;
        const startY = (r + margin) * pixelSize;

        for (let py = 0; py < pixelSize; py++) {
          for (let px = 0; px < pixelSize; px++) {
            const idx = ((startY + py) * imgWidth + (startX + px)) * 4;
            data[idx + 0] = 0;   // R
            data[idx + 1] = 0;   // G
            data[idx + 2] = 0;   // B
            data[idx + 3] = 255; // A
          }
        }
      }
    }
  }

  return { data, width: imgWidth, height: imgHeight };
}

async function runTests() {
  // ---------------------------------------------------------------------------
  // 1. TABLE 5 PRODUCTION QR SCANNING & DECODING VERIFICATION
  // ---------------------------------------------------------------------------
  console.log('--- 1. Table 5 Production QR Optical Scanning Test ---');

  const table5 = {
    tableNumber: 'Table 5',
    id: '6acf2bc30640d48b99cf0d3',
    name: 'Corner Booth',
    status: 'Active',
  };

  const expectedTable5Url =
    'https://happiness-restaurant-three.vercel.app/menu?table=Table%205&tableId=6acf2bc30640d48b99cf0d3&mode=dine_in';

  const generatedUrl = generateTableDineInUrl(table5);
  assert(
    generatedUrl === expectedTable5Url,
    `generateTableDineInUrl(table5) matches expected production pattern: "${generatedUrl}"`
  );

  // Generate QR Matrix
  const { matrix, size } = generateQRCodeMatrix(generatedUrl);
  assert(
    matrix && size === 45,
    `QR Code for 114-char URL generated Version 7 grid (${size}x${size} modules)`
  );

  // Render to RGBA pixel bitmap (simulating canvas capture)
  const { data, width, height } = matrixToRgba(matrix, size, 4, 8);
  assert(
    width === (45 + 8) * 8 && height === (45 + 8) * 8,
    `Simulated canvas bitmap size is ${width}x${height}px with 4-module quiet zone`
  );

  // Decode with standard jsQR engine
  const decoded = jsQR(data, width, height);
  assert(decoded !== null, 'jsQR barcode scanner successfully detected and parsed QR code');
  assert(
    decoded && decoded.data === expectedTable5Url,
    `Decoded URL strictly matches original URL:\n  Decoded: "${decoded?.data}"\n  Expected: "${expectedTable5Url}"`
  );
  assert(
    decoded && decoded.version === 7,
    `Decoded QR version is ISO/IEC Version 7 (${decoded?.version})`
  );

  // ---------------------------------------------------------------------------
  // 2. ROUTE & ACTIVE TABLE RESOLUTION VERIFICATION
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Route & Table Resolution Verification ---');

  const parsed = new URL(decoded.data);
  assert(parsed.pathname === '/menu', 'Decoded destination route is "/menu"');

  const decodedTable = parsed.searchParams.get('table');
  const decodedTableId = parsed.searchParams.get('tableId');
  const decodedMode = parsed.searchParams.get('mode');

  assert(decodedTable === 'Table 5', 'Extracted "table" parameter is "Table 5"');
  assert(decodedTableId === '6acf2bc30640d48b99cf0d3', 'Extracted "tableId" is "6acf2bc30640d48b99cf0d3"');
  assert(decodedMode === 'dine_in', 'Extracted "mode" is "dine_in"');

  const resolvedTable5 = findMockTable(decodedTable) || findMockTable(decodedTableId);
  assert(
    resolvedTable5 !== null && resolvedTable5.tableNumber === 'Table 5',
    `Table 5 successfully resolves in table registry (${resolvedTable5?.name}, status: ${resolvedTable5?.status})`
  );
  assert(
    resolvedTable5?.status === 'Active',
    'Table 5 is confirmed ACTIVE in dining room'
  );

  // ---------------------------------------------------------------------------
  // 3. INACTIVE & INVALID TABLE GUARDS
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Inactive and Invalid Table Guard Verification ---');

  const resolvedTable4 = findMockTable('Table 4');
  assert(
    resolvedTable4 !== null && resolvedTable4.status === 'Inactive',
    'Table 4 is recognized as INACTIVE — Dine-in ordering remains blocked'
  );

  const resolvedInvalid = findMockTable('Table 999');
  assert(
    resolvedInvalid === null,
    'Invalid table "Table 999" correctly resolves to NULL — Triggers Invalid Table Identifier'
  );

  // ---------------------------------------------------------------------------
  // 4. BATCH OPTICAL VERIFICATION ACROSS ALL TABLES (1 to 5)
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Batch Optical Verification Across All Tables (1 to 5) ---');

  const allTables = [
    { tableNumber: 'Table 1', id: 'tbl-1' },
    { tableNumber: 'Table 2', id: 'tbl-2' },
    { tableNumber: 'Table 3', id: 'tbl-3' },
    { tableNumber: 'Table 4', id: 'tbl-4' },
    { tableNumber: 'Table 5', id: '507f1f77bcf86cd799439005' },
  ];

  for (const t of allTables) {
    const url = generateTableDineInUrl(t);
    const m = generateQRCodeMatrix(url);
    const rgba = matrixToRgba(m.matrix, m.size, 4, 8);
    const result = jsQR(rgba.data, rgba.width, rgba.height);

    assert(
      result !== null && result.data === url,
      `${t.tableNumber} QR successfully scanned and decoded to "${url}"`
    );
  }

  console.log('\n================================================================');
  console.log(`TOTAL RESULTS: ${passCount} Passed, ${failCount} Failed`);
  console.log('================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
